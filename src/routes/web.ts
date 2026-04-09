import express, { Express } from "express";
import { getAdminDashboard, getCreateUserPage, getHomePage, getSignInPage, postCreateUserPage } from "../controllers/user.controller";

const router = express.Router();

const webRoutes = (app: Express) => {
    router.get("/", getHomePage); //homepage
    router.get("/createUser", getCreateUserPage); //create a new user, sign up page
    router.get("/signin", getSignInPage); //sign in page
    router.post("/createUser", postCreateUserPage); //post data from create user
    router.get("/admin", getAdminDashboard); // admin dashboard page

    app.use("/", router);
}

export default webRoutes


