import express from "express";

const app = express();

app.set("port", 3000);
app.use(express.static("public"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended:true}))
app.set('view engine', 'ejs');

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
    console.log(data)
    res.render("library", {data});
  }
});

app.get("/blacklist", (req, res) => {
  res.render("blacklist");
});

app.get("/login", (req, res) => {
  
  res.render("login");
});

app.get("/detail", async(req, res) => {
  let name = req.query.id;
  const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/search/all?type=outfit&name=${name}`);
  const data = await response.json();

  res.render("detail", {data});
});


app.listen(app.get("port"), () =>
  console.log("[server] http://localhost:" + app.get("port"))
);