import express from "express";

const app = express();

app.set("port", 3000);
app.use(express.static("public"));
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

app.get("/library", (req, res) => {
  res.render("library");
});

app.get("/blacklist", (req, res) => {
  res.render("blacklist");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/detail", (req, res) => {
  res.render("detail");
});


app.listen(app.get("port"), () =>
  console.log("[server] http://localhost:" + app.get("port"))
);