import { Request, Response } from "express";
import { getAllUsers, getUserByID, handleCreateUser, handleDeleteUser } from "services/user.service";


const getHomePage = (req: Request, res: Response) => {
    return res.render("client/home");
}

const getCreateUserPage = (req: Request, res: Response) => {
    return res.render("client/create-user");
}

const getMatchesPage = (req: Request, res: Response) => {
    return res.render("admin/matches");
}

const postCreateUserPage = async (req: Request, res: Response) => {
    const { fullName, username, email, password } = req.body;
    // handle create user
    await handleCreateUser(fullName, username, email, password)
    return res.redirect("/");
}

const getSignInPage = (req: Request, res: Response) => {
    return res.render("client/sign-in-page");
}

const getAdminDashboard = async (req: Request, res: Response) => {
    //get users
    const users = await getAllUsers();
    return res.render("admin/dashboard", {
        users: users
    });
}

const DeleteUser = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await handleDeleteUser(id);
    return res.redirect("/admin")
}

const ViewUser = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    //get user by id
    const user = await getUserByID(id);
    return res.render("admin/view", {
        id: id,
        user: user
    });
}

const getMainPage = (req: Request, res: Response) => {
    return res.render("client/main");
}

const getProfile = (req: Request, res: Response) => {
    return res.render("client/profile");
}

export {
    getHomePage, getCreateUserPage, getSignInPage, getAdminDashboard, getMatchesPage, getMainPage, getProfile,
    postCreateUserPage,
    DeleteUser, ViewUser
};