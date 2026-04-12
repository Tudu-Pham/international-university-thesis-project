import "express-session";

declare module "express-session" {
    interface SessionData {
        userId?: number;
        userName?: string;
        userAvatar?: string;
        roleName?: string;
        forgotPasswordEmail?: string;
    }
}

export { };
