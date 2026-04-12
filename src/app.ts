import "./types/express-session-augment";
import express from "express";
import "dotenv/config";
import webRoutes from "./routes/web";
import initDatabase from "config/seed";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

webRoutes(app);

initDatabase();

app.listen(PORT, () => {
    console.log(`My app is on port ${PORT}`);
});
