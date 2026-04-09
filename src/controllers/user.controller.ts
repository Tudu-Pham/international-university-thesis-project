import { Request, Response } from "express";
import { getAllUsers, handleCreateUser, handleDeleteUser } from "services/user.service";


const getHomePage = (req: Request, res: Response) => {
    return res.render("client/home");
}

const getCreateUserPage = (req: Request, res: Response) => {
    return res.render("client/create-user");
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

export {
    getHomePage, getCreateUserPage, getSignInPage, getAdminDashboard,
    postCreateUserPage,
    DeleteUser
};