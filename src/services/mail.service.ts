import nodemailer from "nodemailer";

export const sendMail = async (options: { to: string; subject: string; text: string; html?: string }) => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user || "noreply@football-analytics.local";

    if (!host) {
        console.warn("[mail] SMTP_HOST not set — logging message instead of sending.");
        console.warn(`[mail] To: ${options.to}\nSubject: ${options.subject}\n${options.text}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === "true",
        auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html ?? options.text.replace(/\n/g, "<br>"),
    });
};
