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
    return (async () => {
        const videos = await prisma.video.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                input_video: true,
                output_video: true,
                recognition_list_path: true,
                createdAt: true,
                user: { select: { id: true, username: true } },
            },
        });

        const rows = videos.map((v) => {
            let teamA: string | null = null;
            let teamB: string | null = null;
            if (v.recognition_list_path) {
                const abs = path.join(process.cwd(), "public", v.recognition_list_path.replace(/^\//, ""));
                try {
                    const parsed = readRecognitionFile(abs);
                    teamA = parsed.teamA;
                    teamB = parsed.teamB;
                } catch {
                    // ignore
                }
            }
            return {
                id: v.id,
                username: v.user?.username ?? "—",
                input_video: v.input_video,
                output_video: v.output_video,
                team_a: teamA,
                team_b: teamB,
                created_at: v.createdAt,
            };
        });

        return res.render("admin/matches", { videos: rows });
    })().catch((e) => {
        throw e;
    });
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
    const uid = id && /^\d+$/.test(id) ? Number(id) : null;
    const videos =
        uid == null
            ? []
            : await prisma.video.findMany({
                where: { user_id: uid },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    input_video: true,
                    output_video: true,
                    recognition_list_path: true,
                    createdAt: true,
                },
            });

    const rows = videos.map((v) => {
        let teamA: string | null = null;
        let teamB: string | null = null;
        if (v.recognition_list_path) {
            const abs = path.join(process.cwd(), "public", v.recognition_list_path.replace(/^\//, ""));
            try {
                const parsed = readRecognitionFile(abs);
                teamA = parsed.teamA;
                teamB = parsed.teamB;
            } catch {
                // ignore
            }
        }
        return {
            id: v.id,
            input_video: v.input_video,
            output_video: v.output_video,
            team_a: teamA,
            team_b: teamB,
            created_at: v.createdAt,
        };
    });

    return res.render("admin/view", {
        id,
        user,
        videos: rows,
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

function csvEscape(value: string) {
    if (value == null) return "";
    const s = String(value);
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let i = 0;
    let inQuotes = false;
    while (i < line.length) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                const next = line[i + 1];
                if (next === '"') {
                    cur += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i += 1;
                continue;
            }
            cur += ch;
            i += 1;
            continue;
        }
        if (ch === ",") {
            out.push(cur);
            cur = "";
            i += 1;
            continue;
        }
        if (ch === '"') {
            inQuotes = true;
            i += 1;
            continue;
        }
        cur += ch;
        i += 1;
    }
    out.push(cur);
    return out;
}

function readRecognitionCsv(absPath: string) {
    const raw = fs.readFileSync(absPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
    let teamA = "Team A";
    let teamB = "Team B";
    const players: Array<{ shirt_number: number | null; player_name: string | null; position: string | null; team: string | null }> = [];

    // expected:
    // 0: team_a,team_b
    // 1: <A>,<B>
    // 2: shirt_number,player_name,position,team
    // 3..: rows
    if (lines.length >= 2) {
        const hdr = parseCsvLine(lines[0]).map((x) => x.trim().toLowerCase());
        if (hdr[0] === "team_a" && hdr[1] === "team_b") {
            const vals = parseCsvLine(lines[1]);
            teamA = (vals[0] ?? "").trim() || teamA;
            teamB = (vals[1] ?? "").trim() || teamB;
        }
    }

    // find player header row
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]).map((x) => x.trim().toLowerCase());
        if (cols[0] === "shirt_number" && cols[1] === "player_name") {
            startIdx = i + 1;
            break;
        }
    }

    if (startIdx !== -1) {
        for (let i = startIdx; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i]);
            const snRaw = (cols[0] ?? "").trim();
            const sn = snRaw === "" ? null : Number(snRaw);
            players.push({
                shirt_number: Number.isFinite(sn as number) ? (sn as number) : null,
                player_name: (cols[1] ?? "").trim() || null,
                position: (cols[2] ?? "").trim() || null,
                team: (cols[3] ?? "").trim() || null,
            });
        }
    }

    return { teamA, teamB, players };
}

function readRecognitionFile(absPath: string) {
    const ext = path.extname(absPath).toLowerCase();
    if (ext === ".csv") return readRecognitionCsv(absPath);

    // backward-compat: old TSV txt format (no team meta)
    const raw = fs.readFileSync(absPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
    const players: Array<{ shirt_number: number | null; player_name: string | null; position: string | null; team: string | null }> = [];
    let startIdx = 0;
    if (lines.length && /^shirt_number\s+/i.test(lines[0])) startIdx = 1;
    for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split("\t");
        const snRaw = (cols[0] ?? "").trim();
        const sn = snRaw === "" ? null : Number(snRaw);
        players.push({
            shirt_number: Number.isFinite(sn as number) ? (sn as number) : null,
            player_name: (cols[1] ?? "").trim() || null,
            position: (cols[2] ?? "").trim() || null,
            team: (cols[3] ?? "").trim() || null,
        });
    }
    return { teamA: "Team A", teamB: "Team B", players };
}

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
        select: { id: true, team_a: true, team_b: true },
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

    const csvLines: string[] = [];
    csvLines.push("team_a,team_b");
    csvLines.push([csvEscape(session.team_a), csvEscape(session.team_b)].join(","));
    csvLines.push("shirt_number,player_name,position,team");
    for (const l of links) {
        const p = l.player;
        csvLines.push(
            [
                p.shirt_number != null ? csvEscape(String(p.shirt_number)) : "",
                csvEscape(p.player_name ?? ""),
                csvEscape(p.position ?? ""),
                csvEscape(p.team ?? ""),
            ].join(","),
        );
    }
    const csvBody = csvLines.join("\n");
    const csvFilename = `players-${uid}-${session.id}-${Date.now()}.csv`;
    const csvAbs = path.join(process.cwd(), "public", "recognition-lists", csvFilename);
    fs.mkdirSync(path.dirname(csvAbs), { recursive: true });
    fs.writeFileSync(csvAbs, csvBody, "utf8");
    const recognitionPublicPath = `/recognition-lists/${csvFilename}`;

    const video = await prisma.$transaction(async (tx) => {
        const inputPublicPath = `${videoStorage.publicInputPrefix}/${filename}`;
        const video = await tx.video.create({
            data: {
                user_id: uid,
                input_video: inputPublicPath,
                recognition_list_path: recognitionPublicPath,
                // temporary: output follows input until pipeline generates output
                output_video: inputPublicPath,
                status: "UPLOADED",
                analysis_session_id: null,
            },
        });

        const playerIds = links.map((l) => l.player_id);
        await tx.analysisSessionPlayer.deleteMany({ where: { session_id: session.id } });
        // keep players table cleanup minimal for now: remove player rows tied to this session
        if (playerIds.length) await tx.player.deleteMany({ where: { id: { in: playerIds } } });
        await tx.analysisSession.delete({ where: { id: session.id } });
    
        return video;
    });

    const fullVideoPath = req.file?.path;       // 👈 full path video
    const fullCsvPath = csvAbs;                 // 👈 bạn đã có

    await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            video_path: fullVideoPath,
            csv_path: fullCsvPath,
            callback_url: "http://localhost:3000/api/ai-callback",
            video_id: video.id,
        }),
    });

    return res.redirect("/football-analytics");
};

const handleAICallback = async (req: Request, res: Response) => {
    console.log("AI callback received:", req.body);

    const { job_id, video_path, video_id} = req.body;
    console.log("Job ID:", job_id);
    console.log("Video path:", video_path);
    console.log("Video ID:", video_id);
    
    await prisma.video.update({
        where: { id: video_id },
        data: {
            output_video: video_path, // 👈 cập nhật ở đây
            status: "DONE",
        },
    });

    return res.status(200).json({ status: "ok" });
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
    const videos = await prisma.video.findMany({
        where: { user_id: uid },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            input_video: true,
            output_video: true,
            recognition_list_path: true,
            createdAt: true,
        },
    });

    function fileSizeMbFromPublicPath(publicPath: string | null | undefined): number | null {
        if (!publicPath) return null;
        const raw = String(publicPath).trim();
        // only allow app-controlled public paths like "/videos/..."
        if (!raw.startsWith("/")) return null;
        if (raw.includes("..")) return null;
        if (/^[a-z]+:\/\//i.test(raw)) return null;
        const rel = raw.replace(/^\//, "");
        const abs = path.join(process.cwd(), "public", rel);
        try {
            const st = fs.statSync(abs);
            if (!st.isFile()) return null;
            const mb = st.size / (1024 * 1024);
            return Number.isFinite(mb) ? mb : null;
        } catch {
            return null;
        }
    }

    const clips = videos.map((v) => {
        let teamA: string | null = null;
        let teamB: string | null = null;
        if (v.recognition_list_path) {
            const abs = path.join(process.cwd(), "public", v.recognition_list_path.replace(/^\//, ""));
            try {
                const parsed = readRecognitionFile(abs);
                teamA = parsed.teamA;
                teamB = parsed.teamB;
            } catch {
                // ignore parse errors, keep nulls
            }
        }
        return {
            id: v.id,
            team_a: teamA,
            team_b: teamB,
            input_video: v.input_video,
            output_video: v.output_video,
            input_size_mb: fileSizeMbFromPublicPath(v.input_video),
            output_size_mb: fileSizeMbFromPublicPath(v.output_video),
            created_at: v.createdAt,
        };
    });
    return res.render("client/profile", {
        profileUser: user,
        displayName: displayNameFor(user),
        profileErrorMessage,
        profileSuccess,
        openProfileModal: Boolean(profileErrorMessage),
        clips,
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

const getDetailMatchPage = async (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (uid == null) {
        return res.redirect("/signin");
    }
    const videoIdRaw = typeof req.query.videoId === "string" ? req.query.videoId : "";
    const videoId = videoIdRaw && /^\d+$/.test(videoIdRaw) ? Number(videoIdRaw) : null;
    if (videoId == null) {
        return res.redirect("/profile");
    }

    const video = await prisma.video.findFirst({
        where: { id: videoId, user_id: uid },
        select: {
            id: true,
            input_video: true,
            output_video: true,
            recognition_list_path: true,
        },
    });
    if (!video) {
        return res.redirect("/profile");
    }

    const matchVideoSrc = video.output_video || video.input_video || "";
    let teamAName = "Team A";
    let teamBName = "Team B";
    let players: Array<{ shirt_number: number | null; player_name: string | null; position: string | null; team: string | null }> = [];
    if (video.recognition_list_path) {
        const abs = path.join(process.cwd(), "public", video.recognition_list_path.replace(/^\//, ""));
        try {
            const parsed = readRecognitionFile(abs);
            teamAName = parsed.teamA;
            teamBName = parsed.teamB;
            players = parsed.players;
        } catch {
            // keep defaults
        }
    }

    return res.render("client/detail-match", {
        possessionTeamA: 0,
        matchVideoSrc,
        teamAName,
        teamBName,
        players,
    });
};

function safePublicAbsPathFromPublicUrl(publicUrl: string | null | undefined): string | null {
    if (!publicUrl) return null;
    const raw = String(publicUrl).trim();
    // only allow app-controlled public paths like "/videos/..." or "/recognition-lists/..."
    if (!raw.startsWith("/")) return null;
    if (raw.includes("..")) return null;
    if (/^[a-z]+:\/\//i.test(raw)) return null;
    return path.join(process.cwd(), "public", raw.replace(/^\//, ""));
}

const deleteVideo = async (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (uid == null) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

    const idRaw = String(req.params.id ?? "").trim();
    const id = idRaw && /^\d+$/.test(idRaw) ? Number(idRaw) : null;
    if (id == null) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const video = await prisma.video.findFirst({
        where: { id, user_id: uid },
        select: { id: true, input_video: true, output_video: true, recognition_list_path: true },
    });
    if (!video) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    await prisma.video.delete({ where: { id: video.id } });

    const absInput = safePublicAbsPathFromPublicUrl(video.input_video);
    const absOutput = safePublicAbsPathFromPublicUrl(video.output_video);
    const absRec = safePublicAbsPathFromPublicUrl(video.recognition_list_path);
    const toDelete = [absInput, absOutput, absRec].filter((x): x is string => Boolean(x));
    toDelete.forEach((abs) => {
        try {
            fs.unlinkSync(abs);
        } catch {
            // ignore missing file / permission
        }
    });

    return res.json({ ok: true });
};

const downloadVideo = async (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (uid == null) return res.redirect("/signin");

    const idRaw = String(req.params.id ?? "").trim();
    const id = idRaw && /^\d+$/.test(idRaw) ? Number(idRaw) : null;
    if (id == null) return res.status(400).send("Invalid video id");

    const video = await prisma.video.findFirst({
        where: { id, user_id: uid },
        select: { id: true, input_video: true, output_video: true },
    });
    if (!video) return res.status(404).send("Video not found");

    const publicUrl = video.output_video || video.input_video;
    const abs = safePublicAbsPathFromPublicUrl(publicUrl);
    if (!abs) return res.status(404).send("File not available");

    const filename = path.basename(abs);
    return res.download(abs, filename);
};

const adminDeleteVideo = async (req: Request, res: Response) => {
    const idRaw = String(req.params.id ?? "").trim();
    const id = idRaw && /^\d+$/.test(idRaw) ? Number(idRaw) : null;
    if (id == null) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const video = await prisma.video.findFirst({
        where: { id },
        select: { id: true, input_video: true, output_video: true, recognition_list_path: true },
    });
    if (!video) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    await prisma.video.delete({ where: { id: video.id } });

    const absInput = safePublicAbsPathFromPublicUrl(video.input_video);
    const absOutput = safePublicAbsPathFromPublicUrl(video.output_video);
    const absRec = safePublicAbsPathFromPublicUrl(video.recognition_list_path);
    const toDelete = [absInput, absOutput, absRec].filter((x): x is string => Boolean(x));
    toDelete.forEach((abs) => {
        try {
            fs.unlinkSync(abs);
        } catch {
            // ignore
        }
    });

    return res.json({ ok: true });
};

const adminDownloadVideo = async (req: Request, res: Response) => {
    const idRaw = String(req.params.id ?? "").trim();
    const id = idRaw && /^\d+$/.test(idRaw) ? Number(idRaw) : null;
    if (id == null) return res.status(400).send("Invalid video id");

    const video = await prisma.video.findFirst({
        where: { id },
        select: { id: true, input_video: true, output_video: true },
    });
    if (!video) return res.status(404).send("Video not found");

    const publicUrl = video.output_video || video.input_video;
    const abs = safePublicAbsPathFromPublicUrl(publicUrl);
    if (!abs) return res.status(404).send("File not available");

    const filename = path.basename(abs);
    return res.download(abs, filename);
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
    handleAICallback,
    deleteVideo,
    downloadVideo,
    adminDeleteVideo,
    adminDownloadVideo,
};
