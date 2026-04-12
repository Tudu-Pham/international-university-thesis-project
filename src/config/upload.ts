import fs from "fs";
import path from "path";
import multer from "multer";
import type { Request } from "express";

const avatarsDir = path.join(process.cwd(), "public", "images", "avatars");

if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
}

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
