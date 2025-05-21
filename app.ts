import express from "express";
import { Collection, MongoClient } from "mongodb";  
import { User, Favorite, Blacklist } from "./interfaces/types";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();

app.use(express.static("public"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended:true}))
app.set('view engine', 'ejs');
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
}));
declare module "express-session" {
    interface SessionData {
      userId: string;
    }
}

const uri = "mongodb+srv://s154672:FortniteOGSpswd@fortniteogs.nl0tmqx.mongodb.net/"; 
const client = new MongoClient(uri);
const collection : Collection<User> = client.db("FortniteOGS").collection<User>("Users");

async function connect(){
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

app.get("/library", async(req, res) => {
  const response = await fetch('https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit');
  const data = await response.json();
  res.render("library", {data});
});

app.post("/library", async(req, res) => {
  let name : string = req.body.name;
  let rarity : string = req.body.rarity;

  if (name == "") {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&rarity=${rarity}`);
    const data = await response.json();
    res.render("library", {data});
  }
  if (rarity == "") {
    const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
    const data = await response.json();
    res.render("library", {data});
  }
});

app.get("/blacklist", async(req, res) => {
  let user = await collection.findOne({ name: 'test' });  //test moet veranderd worden naar session id 
  let data : any[] = [];
 
  if (user?.blacklist) {
    for (const element of user.blacklist) {
      let response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${element}`);
      let skin = await response.json();
      data.push(skin.data[0]);
    }
    
  }

  res.render("blacklist", {data});
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async(req, res) => {
   let { email, password } = req.body;
    let user = await collection.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.name;
    }
    res.redirect("game"); 
});

app.get("/register", (req, res) => {
  
  res.render("register");
});

app.post("/register", async (req, res) => {
    const {  name, email, password } = req.body;
    if (await collection.findOne({ email })) {
        // return res.render("register", { error: "Email bestaat al" });  !!!!! aanpassen in de ejs van register
    }
    else {
        const hashedPassword = await bcrypt.hash(password, 10);
        await collection.insertOne({
        name,
        email,
        password: hashedPassword,
        favorite : [],
        blacklist: [],
     });
    }
  res.redirect("/login");
});

app.get("/detail", async(req, res) => {
  let name = req.query.id;
  const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
  const data = await response.json();

  res.render("detail", {data});
});

app.post("/verbannen", async(req, res) => {
  let name = req.body.name;
  //let message = prompt("waarom wil je deze skin blacklisten");
  console.log(name);
  //console.log(message);
  collection.updateOne({ name: "test" }, { $push: { blacklist: name } }); //testing naam moet veranderd worden naar session dinge !!!!!
  res.redirect("library")
   
});


app.listen(3000, async() => {
    await connect();
    console.log("Server is running on port 3000");
});