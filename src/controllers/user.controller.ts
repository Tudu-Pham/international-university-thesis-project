import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import { prisma } from "config/client";
import { videoStorage } from "config/upload";
import {
    authenticateUser,
    DEFAULT_AVATAR_PATH,
    displayNameFor,
    getAllUsers,
    getUserByID,
    getUserByIdPrisma,
    handleCreateUser,
    handleDeleteUser,
    handleUpdateProfile,
} from "services/user.service";
import {
    confirmCodeAndEmailNewPassword,
    normalizeEmail,
    requestPasswordResetCode,
} from "services/password-reset.service";

const profileErrorMessages: Record<string, string> = {
    incorrect_password: "Incorrect password.",
    old_password_required: "Enter your current password to set a new one.",
    weak_password:
        "New password does not meet requirements (min 8 characters, one number, one uppercase letter, one special character).",
    username_taken: "This username is already taken.",
    invalid_username: "Username is required.",
    invalid_file: "Invalid image. Use JPG or PNG only.",
    file_too_large: "File is too large (maximum 2 MB).",
    upload_error: "Upload failed. Please try again.",
};

const getHomePage = (req: Request, res: Response) => {
    return res.render("client/home");
};

const getCreateUserPage = (req: Request, res: Response) => {
    return res.render("client/create-user", { error: null });
};

const getMatchesPage = (req: Request, res: Response) => {
    return res.render("admin/matches");
};

const postCreateUserPage = async (req: Request, res: Response) => {
    const { fullName, username, email, password, confirmPassword } = req.body;
    const pw = String(password ?? "");
    const cpw = String(confirmPassword ?? "");

    if (pw !== cpw) {
        return res.render("client/create-user", { error: "Passwords do not match." });
    }

    try {
        await handleCreateUser(String(fullName ?? ""), String(username ?? ""), String(email ?? ""), pw);
        return res.redirect("/");
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            return res.render("client/create-user", { error: "This email is already registered." });
        }
        throw e;
    }
};

const getSignInPage = (req: Request, res: Response) => {
    if (req.session.userId != null) {
        if (req.session.roleName === "ADMIN") {
            return res.redirect("/admin");
        }
        return res.redirect("/football-analytics");
    }
    const passwordResetOk = req.query.passwordReset === "1";
    return res.render("client/sign-in-page", {
        error: null,
        success: passwordResetOk ? "Your password was reset. Check your email and sign in with the new password." : null,
    });
};

const postSignIn = async (req: Request, res: Response) => {
    const email = String(req.body.email ?? "").trim();
    const password = String(req.body.password ?? "");

    const user = await authenticateUser(email, password);
    if (!user || !user.role) {
        return res.render("client/sign-in-page", {
            error: "Invalid email or password.",
            success: null,
        });
    }

    req.session.userId = user.id;
    req.session.userName = displayNameFor(user);
    req.session.userAvatar = user.avatar || DEFAULT_AVATAR_PATH;
    req.session.roleName = user.role.name;

    if (user.role.name === "ADMIN") {
        return res.redirect("/admin");
    }
    return res.redirect("/football-analytics");
};

const getLogout = (req: Request, res: Response) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
};

const getForgotPassword = (req: Request, res: Response) => {
    delete req.session.forgotPasswordEmail;
    return res.render("client/forgot-password", { error: null, info: null });
};

const postForgotPasswordEmail = async (req: Request, res: Response) => {
    const email = String(req.body.email ?? "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.render("client/forgot-password", {
            error: "Please enter a valid email address.",
            info: null,
        });
    }

    try {
        const { sent } = await requestPasswordResetCode(email);
        if (!sent) {
            return res.render("client/forgot-password", {
                error: null,
                info: "If an account exists for this email, you will receive a verification code shortly.",
            });
        }
    } catch (err) {
        console.error(err);
        return res.render("client/forgot-password", {
            error: "Unable to send email. Please try again later or contact support.",
            info: null,
        });
    }

    req.session.forgotPasswordEmail = normalizeEmail(String(req.body.email ?? ""));
    return res.redirect("/forgot-password/code");
};

const getForgotPasswordCode = (req: Request, res: Response) => {
    if (!req.session.forgotPasswordEmail) {
        return res.redirect("/forgot-password");
    }
    return res.render("client/forgot-password-code", {
        error: null,
        email: req.session.forgotPasswordEmail,
    });
};

const postForgotPasswordCode = async (req: Request, res: Response) => {
    const email = req.session.forgotPasswordEmail;
    const code = String(req.body.code ?? "").trim();

    if (!email) {
        return res.redirect("/forgot-password");
    }

    const result = await confirmCodeAndEmailNewPassword(email, code);
    if (result.ok === false) {
        return res.render("client/forgot-password-code", {
            error: result.error,
            email,
        });
    }

    delete req.session.forgotPasswordEmail;
    return res.redirect("/signin?passwordReset=1");
};


const getAdminDashboard = async (req: Request, res: Response) => {
    const users = await getAllUsers();
    return res.render("admin/dashboard", {
        users: users,
    });
};

const DeleteUser = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await handleDeleteUser(id);
    return res.redirect("/admin");
};

const ViewUser = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const user = await getUserByID(id);
    return res.render("admin/view", {
        id: id,
        user: user,
    });
};

const getMainPage = (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (uid == null) {
        return res.redirect("/signin");
    }
    const qSessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    const sessionId = qSessionId && /^\d+$/.test(qSessionId) ? Number(qSessionId) : null;

    return (async () => {
        let session: { id: number; team_a: string; team_b: string } | null = null;
        if (sessionId != null) {
            session = await prisma.analysisSession.findFirst({
                where: { id: sessionId, user_id: uid },
                select: { id: true, team_a: true, team_b: true },
            });
        }

        const players =
            session?.id != null
                ? await prisma.analysisSessionPlayer.findMany({
                    where: { session_id: session.id },
                    include: { player: true },
                    orderBy: { id: "asc" },
                })
                : [];

        const errorKey = typeof req.query.error === "string" ? req.query.error : "";
        const errorMessages: Record<string, string> = {
            clip_too_large: "Clip file is too large (maximum 1000MB).",
            invalid_clip: "Invalid clip. Use MP4 or AVI only.",
            upload_error: "Upload failed. Please try again.",
        };

        return res.render("client/main", {
            analysisSession: session,
            teamAName: session?.team_a ?? "Team A",
            teamBName: session?.team_b ?? "Team B",
            recognizedPlayers: players.map((p) => p.player),
            faErrorMessage: errorKey && errorMessages[errorKey] ? errorMessages[errorKey] : null,
        });
    })().catch((e) => {
        throw e;
    });
};

const postCreateAnalysisSession = async (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (uid == null) {
        return res.redirect("/signin");
    }
    const teamAName = String(req.body.teamAName ?? "").trim() || "Team A";
    const teamBName = String(req.body.teamBName ?? "").trim() || "Team B";

    const session = await prisma.analysisSession.create({
        data: { user_id: uid, team_a: teamAName, team_b: teamBName },
        select: { id: true },
    });

    return res.redirect(`/football-analytics?sessionId=${encodeURIComponent(String(session.id))}`);
};

const postAddPlayerToSession = async (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (uid == null) {
        return res.redirect("/signin");
    }

    const sessionIdRaw = String(req.body.sessionId ?? "").trim();
    const sessionId = sessionIdRaw && /^\d+$/.test(sessionIdRaw) ? Number(sessionIdRaw) : null;
    if (sessionId == null) {
        return res.redirect("/football-analytics");
    }

    const session = await prisma.analysisSession.findFirst({
        where: { id: sessionId, user_id: uid },
        select: { id: true, team_a: true, team_b: true },
    });
    if (!session) {
        return res.redirect("/football-analytics");
    }

    const shirtNumberRaw = String(req.body.shirtNumber ?? "").trim();
    const shirtNumber = shirtNumberRaw === "" ? null : Number(shirtNumberRaw);
    const playerName = String(req.body.playerName ?? "").trim() || null;
    const position = String(req.body.playerPosition ?? "").trim() || null;
    const teamChoice = String(req.body.team ?? "").trim();
    const teamName = teamChoice === "B" ? session.team_b : session.team_a;

    const createdPlayer = await prisma.player.create({
        data: {
            shirt_number: Number.isFinite(shirtNumber as number) ? (shirtNumber as number) : null,
            player_name: playerName,
            position: position,
            team: teamName,
        },
        select: { id: true },
    });

    await prisma.analysisSessionPlayer.create({
        data: { session_id: session.id, player_id: createdPlayer.id },
    });

    return res.redirect(`/football-analytics?sessionId=${encodeURIComponent(String(session.id))}`);
};

const postAnalyzeClip = async (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (uid == null) {
        return res.redirect("/signin");
    }

    const sessionIdRaw = String(req.body.sessionId ?? "").trim();
    const sessionId = sessionIdRaw && /^\d+$/.test(sessionIdRaw) ? Number(sessionIdRaw) : null;
    if (sessionId == null) {
        return res.redirect("/football-analytics");
    }

    const session = await prisma.analysisSession.findFirst({
        where: { id: sessionId, user_id: uid },
        select: { id: true },
    });
    if (!session) {
        return res.redirect("/football-analytics");
    }

    const filename = req.file?.filename ? String(req.file.filename) : null;
    if (!filename) {
        return res.redirect(`/football-analytics?sessionId=${encodeURIComponent(String(session.id))}`);
    }

    const links = await prisma.analysisSessionPlayer.findMany({
        where: { session_id: session.id },
        include: { player: true },
        orderBy: { id: "asc" },
    });

    const lines = [
        "shirt_number\tplayer_name\tposition\tteam",
        ...links.map((l) => {
            const p = l.player;
            const sn = p.shirt_number != null ? String(p.shirt_number) : "";
            const name = p.player_name ?? "";
            const pos = p.position ?? "";
            const team = p.team ?? "";
            return `${sn}\t${name}\t${pos}\t${team}`;
        }),
    ];
    const txtBody = lines.join("\n");
    const txtFilename = `players-${uid}-${session.id}-${Date.now()}.txt`;
    const txtAbs = path.join(process.cwd(), "public", "recognition-lists", txtFilename);
    fs.mkdirSync(path.dirname(txtAbs), { recursive: true });
    fs.writeFileSync(txtAbs, txtBody, "utf8");
    const recognitionPublicPath = `/recognition-lists/${txtFilename}`;

    await prisma.$transaction(async (tx) => {
        await tx.video.create({
            data: {
                user_id: uid,
                input_video: `${videoStorage.publicInputPrefix}/${filename}`,
                recognition_list_path: recognitionPublicPath,
                status: "UPLOADED",
                analysis_session_id: null,
            },
        });

        const playerIds = links.map((l) => l.player_id);
        await tx.analysisSessionPlayer.deleteMany({ where: { session_id: session.id } });
        if (playerIds.length) {
            await tx.player.deleteMany({ where: { id: { in: playerIds } } });
        }
        await tx.analysisSession.delete({ where: { id: session.id } });
    });

    return res.redirect("/football-analytics");
};

const getProfile = async (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (uid == null) {
        return res.redirect("/signin");
    }
    const user = await getUserByIdPrisma(uid);
    if (!user) {
        return res.redirect("/signin");
    }
    const errKey = typeof req.query.error === "string" ? req.query.error : "";
    const profileErrorMessage = errKey && profileErrorMessages[errKey] ? profileErrorMessages[errKey] : null;
    const profileSuccess = req.query.updated === "1";
    return res.render("client/profile", {
        profileUser: user,
        displayName: displayNameFor(user),
        profileErrorMessage,
        profileSuccess,
        openProfileModal: Boolean(profileErrorMessage),
    });
};

const postUpdateProfile = async (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (uid == null) {
        return res.redirect("/signin");
    }

    const existing = await getUserByIdPrisma(uid);
    if (!existing) {
        return res.redirect("/signin");
    }

    const name = String(req.body.name ?? "");
    const username = String(req.body.username ?? "");
    const oldPassword = String(req.body.oldPassword ?? "");
    const newPassword = String(req.body.newPassword ?? "");

    let newAvatarPublicPath: string | undefined;
    if (req.file) {
        newAvatarPublicPath = `/images/avatars/${req.file.filename}`;
    }

    const result = await handleUpdateProfile(
        uid,
        { name, username, oldPassword, newPassword },
        newAvatarPublicPath,
    );

    if (result.ok === false) {
        const codeMap: Record<string, string> = {
            INCORRECT_PASSWORD: "incorrect_password",
            OLD_PASSWORD_REQUIRED: "old_password_required",
            WEAK_PASSWORD: "weak_password",
            USERNAME_TAKEN: "username_taken",
            INVALID_USERNAME: "invalid_username",
        };
        const q = codeMap[result.error] ?? "upload_error";
        if (req.file?.path) {
            fs.unlink(req.file.path, () => { });
        }
        return res.redirect(`/profile?error=${encodeURIComponent(q)}`);
    }

    if (
        newAvatarPublicPath &&
        existing.avatar &&
        (existing.avatar.startsWith("/images/avatars/") || existing.avatar.startsWith("/uploads/avatars/"))
    ) {
        const oldPath = path.join(process.cwd(), "public", existing.avatar.replace(/^\//, ""));
        fs.unlink(oldPath, () => { });
    }

    const updated = await getUserByIdPrisma(uid);
    if (updated) {
        req.session.userName = displayNameFor(updated);
        req.session.userAvatar = updated.avatar || DEFAULT_AVATAR_PATH;
    }

    return res.redirect("/profile?updated=1");
};

const getDetailMatchPage = (req: Request, res: Response) => {
    return res.render("client/detail-match", { possessionTeamA: 65 });
};

export {
    getHomePage,
    getCreateUserPage,
    getSignInPage,
    postSignIn,
    getLogout,
    getForgotPassword,
    postForgotPasswordEmail,
    getForgotPasswordCode,
    postForgotPasswordCode,
    getAdminDashboard,
    getMatchesPage,
    getMainPage,
    getProfile,
    postUpdateProfile,
    getDetailMatchPage,
    postCreateUserPage,
    DeleteUser,
    ViewUser,
    postCreateAnalysisSession,
    postAddPlayerToSession,
    postAnalyzeClip,
};
