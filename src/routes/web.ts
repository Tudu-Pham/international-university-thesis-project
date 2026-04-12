import express, { Express } from "express";
import { DeleteUser, getAdminDashboard, getCreateUserPage, getDetailMatchPage, getHomePage, getMainPage, getMatchesPage, getProfile, getSignInPage, postCreateUserPage, ViewUser } from "controllers/user.controller";

const router = express.Router();

const webRoutes = (app: Express) => {
    router.get("/", getHomePage); //homepage
    router.get("/createUser", getCreateUserPage); //create a new user, sign up page
    router.post("/createUser", postCreateUserPage); //post data from create user
    router.get("/signin", getSignInPage); //sign in page
    router.get("/admin", getAdminDashboard); // admin dashboard page
    router.get("/view-user/:id", ViewUser); //view each user page
    router.get("/matches", getMatchesPage); //view matches page from admin page
    router.post("/delete-user/:id", DeleteUser); //delete user from admin
    router.get("/football-analytics", getMainPage);
    router.get("/detail-match", getDetailMatchPage); //view detail analyze clip page
    router.get("/profile", getProfile); //view user's profile, history

    app.use("/", router);
}

export default webRoutes


