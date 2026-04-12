import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export const hashPassword = async (plain: string): Promise<string> => {
    return bcrypt.hash(plain, SALT_ROUNDS);
};

export const verifyPassword = async (plain: string, stored: string): Promise<boolean> => {
    if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
        return bcrypt.compare(plain, stored);
    }
    return plain === stored;
};
export const generateRandomPassword = (length = 12): string => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let out = "";
    const crypto = globalThis.crypto;
    if (crypto && typeof crypto.getRandomValues === "function") {
        const buf = new Uint32Array(length);
        crypto.getRandomValues(buf);
        for (let i = 0; i < length; i++) {
            out += chars[buf[i]! % chars.length];
        }
        return out;
    }
    for (let i = 0; i < length; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
};
