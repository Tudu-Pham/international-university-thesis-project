import express, { Express } from "express";

const router = express.Router();

const webRoutes = (app: Express) => {
    router.get("/", (req, res) => {
        res.render("home.ejs")
    })

    router.get("/abc", (req, res) => {
        res.send("hello world")
    })

    app.use("/", router);
}

export default webRoutes


