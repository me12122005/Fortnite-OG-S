import express from "express";
import session from "express-session";
import { Collection, MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import { User } from "./interfaces/types";
import { Request, Response } from "express";
import nodemailer from 'nodemailer';

const app = express();

app.use(express.static("public"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

declare module "express-session" {
  interface SessionData {
    userId?: string;
    name?: string;
    weapon?: string;
    emote?: string;
    characterId?: string;
    characterImage?: string;
    resetEmail?: string;
  }
}

const uri = "mongodb+srv://s154672:FortniteOGSpswd@fortniteogs.nl0tmqx.mongodb.net/";
const client = new MongoClient(uri);
const collection: Collection<User> = client.db("FortniteOGS").collection<User>("Users");

async function connect() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    process.on("SIGINT", exit);
  } catch (error) {
    console.error(error);
  }
}

async function exit() {
  try {
    await client.close();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.render("register", { error: "Vul alle velden in." });
  }
  const existingUser = await collection.findOne({ email });
  if (existingUser) {
    return res.render("register", { error: "Email bestaat al." });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  await collection.insertOne({
    name,
    email,
    password: hashedPassword,
    favorite: [],
    blacklist: [],
    createdAt: new Date()
  });
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render("login", { error: "Vul alle velden in." });
  }
  const user = await collection.findOne({ email });
  if (user && (await bcrypt.compare(password, user.password))) {
    req.session.userId = user._id?.toString();
    req.session.name = user.name;
    res.redirect("/library");
  } else {
    res.render("login", { error: "Ongeldige email of wachtwoord." });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/library", async (req, res) => {
  const response = await fetch(
    "https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit"
  );
  const data = await response.json();
  res.render("library", { data });
});

app.post("/library", async (req, res) => {
  let name: string = req.body.name || "";
  let rarity: string = req.body.rarity || "";

  if (name === "" && rarity !== "") {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&rarity=${rarity}`);
    const data = await response.json();
    res.render("library", { data });
    return;
  }

  if (rarity === "" && name !== "") {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
    const data = await response.json();
    res.render("library", { data });
    return;
  }

  if (name !== "" && rarity !== "") {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}&rarity=${rarity}`);
    const data = await response.json();
    res.render("library", { data });
    return;
  }
  const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit`);
  const data = await response.json();
  res.render("library", { data });
});

app.get("/selection", async (req, res) => {
  const characterName = req.query.id;
  if (!characterName || typeof characterName !== "string") {
    return res.redirect("/library");
  }

  const response = await fetch(
    `https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${characterName}`
  );
  const data = await response.json();

  const emoteRes = await fetch("https://fortnite-api.com/v2/cosmetics/br?type=emote");
  const emoteData = await emoteRes.json();
  const emotesArray = emoteData.data as any[];
  const filteredEmotes = emotesArray.filter((item) => item.type.value === "emote").slice(0, 9);

  res.render("selection", { data, emotes: filteredEmotes });
});

app.post("/selection", async (req, res) => {
  const { weapon, emote, characterId, characterImage } = req.body;
  const userId = req.session.userId;

  if (!weapon || !emote || !characterId || !characterImage) {
    return res.redirect("/selection?id=" + characterId);
  }

  if (!userId) {
    return res.redirect("/login");
  }

  const user = await collection.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return res.redirect("/login");
  }

  await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $pull: { blacklist: { name: characterId } } }
  );

  const exists = user.favorite.some((fav) => fav.id === characterId);
  if (!exists) {
    await collection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $push: {
          favorite: {
            id: characterId,
            image: characterImage,
            weapon: weapon,
            emote: emote,
          },
        },
      }
    );
  }

  req.session.weapon = weapon;
  req.session.emote = emote;
  req.session.characterId = characterId;
  req.session.characterImage = characterImage;

  res.redirect("/game");
});


app.get("/favorite", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.redirect("/login");
  }
  const user = await collection.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return res.redirect("/login");
  }

  res.render("favorite", { favorites: user.favorite || [] });
});

app.post("/favorite/delete", async (req, res) => {
  const userId = req.session.userId;
  const favoriteId = req.body.id;
  if (!userId || !favoriteId) return res.redirect("/favorite");

  await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $pull: { favorite: { id: favoriteId } } }
  );

  res.redirect("/favorite");
});


app.post("/blacklist/delete", async (req, res) => {
  const userId = req.session.userId;
  const name = req.body.name;

  if (!userId) return res.redirect("/login");
  if (!name) return res.redirect("/blacklist");


  await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $pull: { blacklist: { name } } }
  );
  res.redirect("/blacklist");

});

app.get("/game", async (req, res) => {
  const { weapon, emote, characterId, characterImage } = req.session;

  if (!weapon || !emote || !characterId || !characterImage) {
    return res.redirect("/library");
  }

  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  const user = await collection.findOne({ _id: new ObjectId(userId) });
  if (!user) return res.redirect("/login");

  const favorite = user.favorite.find(fav => fav.id === characterId);
  if (!favorite) return res.redirect("/favorite");

  const favoritesScore = {
    wins: favorite.wins || 0,
    loses: favorite.loses || 0
  };

  const emoteResponse = await fetch(
    `https://fortnite-api.com/v2/cosmetics/br/search/all?type=emote&name=${emote}`
  );
  const emoteData = await emoteResponse.json();
  let emoteImage = "";
  if (
    emoteData &&
    emoteData.data &&
    emoteData.data[0] &&
    emoteData.data[0].images &&
    emoteData.data[0].images.icon
  ) {
    emoteImage = emoteData.data[0].images.icon;
  }
  res.render("game", {
    weapon,
    emoteImage,
    characterImage,
    favoritesScore,
    characterId,
  });
});

app.get("/detail", async (req, res) => {
  const name = req.query.id;

  if (!name || typeof name !== "string") {
    return res.render("detail", { error: "Geen geldige naam opgegeven.", data: null });
  }

  try {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${encodeURIComponent(name)}`);
    const data = await response.json();

    if (!data || !data.data || data.data.length === 0) {
      return res.render("detail", { error: "Personage niet gevonden.", data: null });
    }

    return res.render("detail", {
      data,
      error: null,
    });
  } catch (err) {
    console.error(err);
    return res.render("detail", { error: "Er is een fout opgetreden.", data: null });
  }
});

app.get("/blacklist", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  const user = await collection.findOne({ _id: new ObjectId(userId) });
  if (!user) return res.redirect("/login");

  const charactersWithNotes: any[] = [];

  for (const { name, note = "" } of user.blacklist || []) {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
    const json = await response.json();

    if (json?.data?.[0]) {
      const character = json.data[0];
      character.note = note;
      charactersWithNotes.push(character);
    }
  }

  res.render("blacklist", { data: charactersWithNotes });
});

app.post("/verbannen", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  const { name, note } = req.body;
  if (!name) return res.redirect("/blacklist");

  const user = await collection.findOne({ _id: new ObjectId(userId) });
  if (!user) return res.redirect("/login");

  const exists = user.blacklist?.some(item => item.name === name);
  if (!exists) {
    await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { blacklist: { name, note: note || "" } } }
    );
  } else {
    await collection.updateOne(
      { _id: new ObjectId(userId), "blacklist.name": name },
      { $set: { "blacklist.$.note": note || "" } }
    );
  }

  res.redirect("/blacklist");
});

app.post("/game/vote", async (req: Request, res: Response) => {
  const userId = req.session.userId;
  const { characterId, result } = req.body as { characterId: string; result: "win" | "lose" };

  if (!userId || !characterId || !result) {
    res.status(400).send("Ongeldige data");
    res.redirect('/')
  }

  const user = await collection.findOne({ _id: new ObjectId(userId) });
  if (!user) return res.redirect("/");

  const favoriteIndex = user.favorite.findIndex(fav => fav.id === characterId);
  if (favoriteIndex === -1) {
    res.status(404).send("Favoriet niet gevonden");
    res.redirect("library")
  }

  const favoriteItem = user.favorite[favoriteIndex];

  const wins = (favoriteItem.wins ?? 0) + (result === "win" ? 1 : 0);
  const loses = (favoriteItem.loses ?? 0) + (result === "lose" ? 1 : 0);

  await collection.updateOne(
    { _id: new ObjectId(userId), "favorite.id": characterId },
    { $set: { "favorite.$.wins": wins, "favorite.$.loses": loses } }
  );

  res.redirect("/game");
});


app.get("/profile", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("/login");
  }

  let user;
  try {
    user = await collection.findOne({ _id: new ObjectId(req.session.userId) });
  } catch (error) {
    return res.redirect("/login");
  }

  if (!user) {
    return res.redirect("/login");
  }


  res.render("profile", { user });
});
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  req.session.resetEmail = email;

  const resetLink = "http://localhost:3000/reset-password";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "monstertrio8@gmail.com",
      pass: "spbr gjjy dkoh cipm", 
    },
  });

  await transporter.sendMail({
    to: email,
    subject: "Wachtwoord resetten",
    html: `<p>Klik <a href="${resetLink}">hier</a> om je wachtwoord te resetten.</p>`,

  });

  res.send("Check je e-mail om je wachtwoord te resetten.");
});

app.get('/reset-password', (req, res) => {
  if (!req.session.resetEmail) {
    return res.redirect('/');
  }
  res.render('reset-password', { email: req.session.resetEmail });
});

app.post('/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  const email = req.session.resetEmail;

  if (!email) {
    return res.redirect('/');
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await collection.updateOne({ email }, { $set: { password: hashed } });

  delete req.session.resetEmail;

  res.send('Je wachtwoord is aangepast! Je kunt nu <a href="/login">inloggen</a>.');
});



app.listen(3000, async () => {
  await connect();
  console.log("Server running on port 3000");
});