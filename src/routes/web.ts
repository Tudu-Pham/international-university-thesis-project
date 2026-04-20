import express, { Express } from "express";
import multer from "multer";
import session from "express-session";
import { avatarUpload, clipUpload } from "config/upload";
import { attachCurrentUser, requireAdmin, requireAuth } from "middleware/auth";
import {
    DeleteUser,
    getAdminDashboard,
    getCreateUserPage,
    getDetailMatchPage,
    getForgotPassword,
    getForgotPasswordCode,
    getHomePage,
    getLogout,
    getMainPage,
    getMatchesPage,
    getProfile,
    getSignInPage,
    postCreateUserPage,
    postForgotPasswordCode,
    postForgotPasswordEmail,
    postSignIn,
    postUpdateProfile,
    postCreateAnalysisSession,
    postAddPlayerToSession,
    postAnalyzeClip,
    ViewUser,
    deleteVideo,
    downloadVideo,
    adminDeleteVideo,
    adminDownloadVideo,
    handleAICallback,
    proxyVideo,
} from "controllers/user.controller";

const router = express.Router();

const webRoutes = (app: Express) => {
    app.use(
        session({
            secret: process.env.SESSION_SECRET || "thesis-web-dev-secret-change-me",
            resave: false,
            saveUninitialized: false,
            cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
        }),
    );
    app.use(attachCurrentUser);

    router.get("/", getHomePage);
    router.get("/createUser", getCreateUserPage);
    router.post("/createUser", postCreateUserPage);
    router.get("/signin", getSignInPage);
    router.post("/signin", postSignIn);
    router.get("/logout", getLogout);

    router.get("/forgot-password", getForgotPassword);
    router.post("/forgot-password", postForgotPasswordEmail);
    router.get("/forgot-password/code", getForgotPasswordCode);
    router.post("/forgot-password/code", postForgotPasswordCode);

    router.get("/admin", requireAdmin, getAdminDashboard);
    router.get("/matches", requireAdmin, getMatchesPage);
    router.get("/admin/videos/:id/download", requireAdmin, adminDownloadVideo);
    router.delete("/admin/videos/:id", requireAdmin, adminDeleteVideo);
    router.post("/delete-user/:id", requireAdmin, DeleteUser);
    router.get("/view-user/:id", requireAdmin, ViewUser);

    router.get("/football-analytics", requireAuth, getMainPage);
    router.post("/football-analytics/session", requireAuth, postCreateAnalysisSession);
    router.post("/football-analytics/player", requireAuth, postAddPlayerToSession);
    router.post(
        "/football-analytics/analyze-clip",
        requireAuth,
        (req, res, next) => {
            clipUpload.single("clip")(req, res, (err: unknown) => {
                if (!err) return next();
                if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
                    return res.redirect("/football-analytics?error=clip_too_large");
                }
                const msg = err instanceof Error ? err.message : "";
                if (msg === "INVALID_CLIP_TYPE") {
                    return res.redirect("/football-analytics?error=invalid_clip");
                }
                return res.redirect("/football-analytics?error=upload_error");
            });
        },
        postAnalyzeClip,
    );
    router.get("/detail-match", requireAuth, getDetailMatchPage);
    router.get("/profile", requireAuth, getProfile);
    router.get("/videos/:id/download", requireAuth, downloadVideo);
    router.delete("/videos/:id", requireAuth, deleteVideo);
    router.post(
        "/profile",
        requireAuth,
        (req, res, next) => {
            avatarUpload.single("avatar")(req, res, (err: unknown) => {
                if (!err) {
                    return next();
                }
                if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
                    return res.redirect("/profile?error=file_too_large");
                }
                const msg = err instanceof Error ? err.message : "";
                if (msg === "INVALID_AVATAR_TYPE") {
                    return res.redirect("/profile?error=invalid_file");
                }
                return res.redirect("/profile?error=upload_error");
            });
        },
        postUpdateProfile,
    );

    router.post("/api/ai-callback", handleAICallback);
    router.get("/proxy/:filename", proxyVideo);

    app.use("/", router);
};

export default webRoutes;
