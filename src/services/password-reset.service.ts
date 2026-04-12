import { prisma } from "config/client";
import { generateRandomPassword, hashPassword } from "utils/password";
import { sendMail } from "services/mail.service";

const CODE_TTL_MS = 15 * 60 * 1000;

const generateFourDigitCode = (): string => {
    return String(Math.floor(1000 + Math.random() * 9000));
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const requestPasswordResetCode = async (email: string): Promise<{ sent: boolean }> => {
    const normalized = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (!user) {
        return { sent: false };
    }

    await prisma.passwordReset.deleteMany({ where: { email: normalized } });
    const code = generateFourDigitCode();
    await prisma.passwordReset.create({
        data: {
            email: normalized,
            code,
            expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
    });

    await sendMail({
        to: normalized,
        subject: "Your Football Analytics verification code",
        text: `Your verification code is: ${code}\n\nIt expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.`,
    });

    return { sent: true };
};

export const confirmCodeAndEmailNewPassword = async (
    email: string,
    code: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
    const normalized = normalizeEmail(email);
    const trimmedCode = code.trim();

    const row = await prisma.passwordReset.findFirst({
        where: { email: normalized, code: trimmedCode },
    });

    if (!row || row.expiresAt < new Date()) {
        return { ok: false, error: "Invalid or expired verification code." };
    }

    const newPlain = generateRandomPassword(12);
    const hashed = await hashPassword(newPlain);

    await prisma.user.update({
        where: { email: normalized },
        data: { password: hashed },
    });

    await prisma.passwordReset.deleteMany({ where: { email: normalized } });

    await sendMail({
        to: normalized,
        subject: "Your new Football Analytics password",
        text: `Your password has been reset.\n\nNew password: ${newPlain}\n\nPlease sign in and change it from your profile when possible.`,
    });

    return { ok: true };
};
