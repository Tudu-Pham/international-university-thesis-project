import getConnection from "config/database";
import { prisma } from "config/client";
import { Prisma, User } from "@prisma/client";
import { hashPassword, verifyPassword } from "utils/password";

export const DEFAULT_AVATAR_PATH = "/images/default_avatar.jpg";

const displayNameFor = (user: Pick<User, "name" | "username">) => {
    const n = user.name?.trim();
    return n ? n : user.username;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const handleCreateUser = async (fullName: string, username: string, email: string, password: string) => {
    const userRole = await prisma.role.findFirst({
        where: { name: "USER" },
    });
    if (!userRole) {
        throw new Error('Role "USER" not found. Seed roles before creating users.');
    }

    const hashed = await hashPassword(password);

    await prisma.user.create({
        data: {
            name: fullName,
            username: username,
            email: normalizeEmail(email),
            password: hashed,
            accountType: "USER",
            avatar: DEFAULT_AVATAR_PATH,
            role: { connect: { id: userRole.id } },
        },
    });
};

const getAllUsers = async () => {
    const users = await prisma.user.findMany({
        include: { role: true },
        orderBy: { id: "asc" },
    });
    return users;
};

const handleDeleteUser = async (id: string) => {
    await prisma.user.delete({
        where: { id: +id },
    });
};

const getUserByID = async (id: string) => {
    try {
        const connection = await getConnection();
        const sql = "SELECT * FROM `users` WHERE `id` = ? ";
        const values = [id];

        const [result] = await connection.execute(sql, values);

        return result;
    } catch (err) {
        console.log(err);
        return [];
    }
};

const authenticateUser = async (email: string, password: string) => {
    const normalized = normalizeEmail(email);
    const user = await prisma.user.findUnique({
        where: { email: normalized },
        include: { role: true },
    });
    if (!user) {
        return null;
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
        return null;
    }

    const isLegacyHash =
        !user.password.startsWith("$2a$") &&
        !user.password.startsWith("$2b$") &&
        !user.password.startsWith("$2y$");
    if (isLegacyHash) {
        await prisma.user.update({
            where: { id: user.id },
            data: { password: await hashPassword(password) },
        });
    }

    return user;
};

const setDefaultAvatarOnLogin = async (userId: number) => {
    await prisma.user.update({
        where: { id: userId },
        data: { avatar: DEFAULT_AVATAR_PATH },
    });
};

const getUserByIdPrisma = async (id: number) => {
    return prisma.user.findUnique({
        where: { id },
        include: { role: true },
    });
};

const passwordMeetsProfileRules = (pw: string) =>
    pw.length >= 8 && /\d/.test(pw) && /[A-Z]/.test(pw) && /[^A-Za-z0-9]/.test(pw);

export type ProfileUpdateError =
    | "INCORRECT_PASSWORD"
    | "OLD_PASSWORD_REQUIRED"
    | "WEAK_PASSWORD"
    | "USERNAME_TAKEN"
    | "INVALID_USERNAME";

const handleUpdateProfile = async (
    userId: number,
    input: {
        name: string;
        username: string;
        oldPassword: string;
        newPassword: string;
    },
    newAvatarPublicPath?: string | null,
): Promise<{ ok: true } | { ok: false; error: ProfileUpdateError }> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new Error("User not found");
    }

    const nameTrim = input.name.trim();
    const usernameTrim = input.username.trim();
    const oldPw = input.oldPassword;
    const newPw = input.newPassword;

    if (!usernameTrim) {
        return { ok: false, error: "INVALID_USERNAME" };
    }

    const wantsPasswordChange = newPw.trim().length > 0;
    if (wantsPasswordChange) {
        if (!oldPw) {
            return { ok: false, error: "OLD_PASSWORD_REQUIRED" };
        }
        const oldOk = await verifyPassword(oldPw, user.password);
        if (!oldOk) {
            return { ok: false, error: "INCORRECT_PASSWORD" };
        }
        if (!passwordMeetsProfileRules(newPw.trim())) {
            return { ok: false, error: "WEAK_PASSWORD" };
        }
    }

    const data: Prisma.UserUpdateInput = {
        name: nameTrim.length ? nameTrim : null,
        username: usernameTrim,
    };

    if (wantsPasswordChange) {
        data.password = await hashPassword(newPw.trim());
    }

    if (newAvatarPublicPath) {
        data.avatar = newAvatarPublicPath;
    }

    if (usernameTrim !== user.username) {
        const clash = await prisma.user.findFirst({
            where: { username: usernameTrim, NOT: { id: userId } },
        });
        if (clash) {
            return { ok: false, error: "USERNAME_TAKEN" };
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data,
    });
    return { ok: true };
};

export {
    handleCreateUser,
    getAllUsers,
    handleDeleteUser,
    getUserByID,
    authenticateUser,
    setDefaultAvatarOnLogin,
    getUserByIdPrisma,
    handleUpdateProfile,
    displayNameFor,
};
