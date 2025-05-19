import express from "express";
import { Collection, MongoClient } from "mongodb";
import { User, Favorite, Blacklist } from "./interfaces/types";
import bcrypt from "bcrypt";
import e from "express";

const app = express();

app.use(express.static("public"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs');

const uri = "mongodb+srv://s154672:FortniteOGSpswd@fortniteogs.nl0tmqx.mongodb.net/";
const client = new MongoClient(uri);
const collection: Collection<User> = client.db("FortniteOGS").collection<User>("Users");

async function connect() {
  try {
    await client.connect();
    console.log("Connected to database");
    process.on("SIGINT", exit);
  } catch (error) {
    console.error(error);
  }
}

async function exit() {
  try {
    await client.close();
    console.log("Disconnected from database");
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
}



app.get("/", (req, res) => {
  res.render("index");
});


app.get("/favorite", (req, res) => {
  res.render("favorite");
});


app.get("/game", (req, res) => {
  res.render("game");
});

app.get("/selection", async (req, res) => {
  let name = req.query.id;
  const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
  const data = await response.json();
  res.render("selection", { data });
});

app.get("/library", async (req, res) => {
  const response = await fetch('https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit');
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
    console.log(data)
    res.render("library", { data });
  }
});

app.get("/blacklist", (req, res) => {
  res.render("blacklist");
});

app.get("/login", (req, res) => {

  res.render("login");
});

app.get("/register", (req, res) => {

  res.render("register");
});


app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (await collection.findOne({ email })) {
    return res.render("register", { error: "Email bestaat al" });
  }
  else {
    const hashedPassword = await bcrypt.hash(password, 10);
    await collection.insertOne({
      name,
      email,
      password: hashedPassword,
      favorite: [],
      blacklist: [],
    });
  }
  res.redirect("/login");
});

app.get("/detail", async (req, res) => {
  let name = req.query.id;
  const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
  const data = await response.json();
  console.log(data)
  res.render("detail", { data });
});

app.post("verbannen", async (req, res) => {
  let name = req.body.name;
  let message = prompt("waarom wil je deze skin blacklisten");
  console.log(name);
  console.log(message);
});
app.get("/selection/:id", async (req, res) => {
  const id = req.params.id;
  const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
  const emotedate = await response.json();
  console.log(emotedate)
  res.render("selection", { emotedate });
});
app.post("selection", async (req, res) => {

});
app.listen(3000, async () => {
  await connect();
  console.log("Server is running on port 3000");
});
