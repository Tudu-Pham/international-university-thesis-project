import fs from "fs";
import path from "path";
import multer from "multer";
import type { Request } from "express";

const avatarsDir = path.join(process.cwd(), "public", "images", "avatars");
const inputVideosDir = path.join(process.cwd(), "public", "videos", "input_videos");
const outputVideosDir = path.join(process.cwd(), "public", "videos", "output_videos");
const recognitionListsDir = path.join(process.cwd(), "public", "recognition-lists");

if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
}

if (!fs.existsSync(inputVideosDir)) {
    fs.mkdirSync(inputVideosDir, { recursive: true });
}

if (!fs.existsSync(outputVideosDir)) {
    fs.mkdirSync(outputVideosDir, { recursive: true });
}

if (!fs.existsSync(recognitionListsDir)) {
    fs.mkdirSync(recognitionListsDir, { recursive: true });
}

/** Disk paths + public URL prefixes for analyze pipeline */
export const videoStorage = {
    inputDir: inputVideosDir,
    outputDir: outputVideosDir,
    publicInputPrefix: "/videos/input_videos",
    publicOutputPrefix: "/videos/output_videos",
} as const;

export const avatarUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, avatarsDir),
        filename: (req: Request, file, cb) => {
            const uid = req.session?.userId ?? "0";
            const ext = path.extname(file.originalname).toLowerCase();
            const safeExt = ext === ".jpg" || ext === ".jpeg" || ext === ".png" ? ext : ".jpg";
            cb(null, `user-${uid}-${Date.now()}${safeExt}`);
        },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const mimeOk = /^image\/(jpeg|png)$/i.test(file.mimetype);
        const nameOk = /\.(jpe?g|png)$/i.test(file.originalname);
        if (mimeOk || nameOk) {
            cb(null, true);
        } else {
            cb(new Error("INVALID_AVATAR_TYPE"));
        }
    },
});

export const clipUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, inputVideosDir),
        filename: (req: Request, file, cb) => {
            const uid = req.session?.userId ?? "0";
            const ext = path.extname(file.originalname).toLowerCase();
            const safeExt = ext === ".mp4" || ext === ".avi" ? ext : ".mp4";
            cb(null, `clip-${uid}-${Date.now()}${safeExt}`);
        },
    }),
    limits: { fileSize: 1000 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const mimeOk = /^video\/(mp4|x-msvideo)$/i.test(file.mimetype);
        const nameOk = /\.(mp4|avi)$/i.test(file.originalname);
        if (mimeOk || nameOk) {
            cb(null, true);
        } else {
            cb(new Error("INVALID_CLIP_TYPE"));
        }
    },
});
