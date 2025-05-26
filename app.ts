import express from "express";
import session from "express-session";
import { Collection, MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import { User, Favorite } from "./interfaces/types";

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
  let name: string = req.body.name;
  let rarity: string = req.body.rarity;

  if (name == "") {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&rarity=${rarity}`);
    const data = await response.json();
    res.render("library", { data });
  }

  if (rarity == "") {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
    const data = await response.json();
    console.log(data);
    res.render("library", { data });
  }

  if (name != "" && rarity != "") {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}&rarity=${rarity}`);
    const data = await response.json();
    res.render("library", { data });
  }
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
    return res.render("selection", {
      error: "Je moet een wapen, emote en skin kiezen",
    });
  }

  req.session.weapon = weapon;
  req.session.emote = emote;
  req.session.characterId = characterId;
  req.session.characterImage = characterImage;

  if (!userId) {
    return res.redirect("/login");
  }

  const user = await collection.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return res.redirect("/login");
  }


  const exists = user.favorite.some((fav) => fav.id === characterId);
  if (!exists) {
    await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { favorite: { id: characterId, image: characterImage } } }
    );
  }

  res.redirect("/favorite");
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

app.get("/game", async (req, res) => {
  const { weapon, emote, characterId, characterImage } = req.session;

  if (!weapon || !emote || !characterId || !characterImage) {
    return res.redirect("/selection");
  }

  const emoteResponse = await fetch(
    `https://fortnite-api.com/v2/cosmetics/br/search/all?type=emote&name=${emote}`
  );
  const emoteData = await emoteResponse.json();

  const emoteImage = emoteData.data[0].images.icon;

  res.render("game", {
    weapon,
    emoteImage,
    characterImage,
  });
});

app.get("/detail", async (req, res) => {
  const name = req.query.id;
  if (!name || typeof name !== "string") {
    return res.redirect("/library");
  }


  const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
  const data = await response.json();



  res.render("detail", { data });

});


app.get("/blacklist", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.redirect("/login");
  }
  const user = await collection.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return res.redirect("/login");
  }

  const data: any[] = [];

  for (const skinName of user.blacklist || []) {
    try {
      const response = await fetch(
        `https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${skinName}`
      );
      const skin = await response.json();
      if (skin?.data) {
        data.push(skin.data);
      }
    } catch (error) {
      console.error(error);
    }
  }

  res.render("blacklist", { data });
});

app.post("/verbannen", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  const { name } = req.body;
  if (!name) return res.redirect("/blacklist");

  await collection.updateOne(
    { _id: new ObjectId(userId), "blacklist": { $ne: name } },
    { $push: { blacklist: name } }
  );

  res.redirect("/blacklist");
});



app.listen(3000, async () => {
  await connect();
  console.log("Server running on port 3000");
});
