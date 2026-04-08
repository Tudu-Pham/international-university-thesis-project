import { Request, Response } from "express";
import { handleCreateUser } from "../services/user.service";


const getHomePage = (req: Request, res: Response) => {
    return res.render("client/home");
}

const getCreateUserPage = (req: Request, res: Response) => {
    return res.render("client/create-user");
}

const postCreateUserPage = (req: Request, res: Response) => {
    const { fullName, username, email, password } = req.body;
    // handle create user
    handleCreateUser(fullName, username, email, password)

    return res.redirect("/");
}

const getSignInPage = (req: Request, res: Response) => {
    return res.render("client/sign-in-page");
}


export {
    getHomePage, getCreateUserPage, getSignInPage,
    postCreateUserPage
};