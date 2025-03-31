import express from "express";

const app = express();

app.set("port", 3000);
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.get("/",(req,res)=>{
    res.render("detail");
});

app.get("/game",(req,res)=>{
    res.render("game");
});

app.listen(app.get("port"), () =>
  console.log("[server] http://localhost:" + app.get("port"))
);