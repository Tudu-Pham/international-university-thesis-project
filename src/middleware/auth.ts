import { NextFunction, Request, Response } from "express";

export const attachCurrentUser = (req: Request, res: Response, next: NextFunction) => {
    const { userId, userName, userAvatar, roleName } = req.session;
    if (userId != null && userName != null) {
        res.locals.currentUser = {
            id: userId,
            name: userName,
            avatar: userAvatar ?? "/images/default_avatar.jpg",
            roleName: roleName ?? "USER",
        };
    } else {
        res.locals.currentUser = null;
    }
    next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId == null) {
        return res.redirect("/signin");
    }
    next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId == null) {
        return res.redirect("/signin");
    }
    if (req.session.roleName !== "ADMIN") {
        return res.redirect("/");
    }
    next();
};
