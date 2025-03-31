import express from "express";

const app = express();

app.set("port", 3000);

app.get("/",(req,res)=>{
    res.render("blacklist.ejs");
});

app.listen(app.get("port"), () =>
  console.log("[server] http://localhost:" + app.get("port"))
);