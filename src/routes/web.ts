import express, { Express } from "express";
import { DeleteUser, getAdminDashboard, getCreateUserPage, getHomePage, getSignInPage, postCreateUserPage } from "controllers/user.controller";

const router = express.Router();

const webRoutes = (app: Express) => {
    router.get("/", getHomePage); //homepage
    router.get("/createUser", getCreateUserPage); //create a new user, sign up page
    router.get("/signin", getSignInPage); //sign in page
    router.get("/admin", getAdminDashboard); // admin dashboard page
    router.post("/createUser", postCreateUserPage); //post data from create user
    router.post("/delete-user/:id", DeleteUser); //delete user from admin

    app.use("/", router);
}

export default webRoutes


