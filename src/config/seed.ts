import { prisma } from "config/client";
import { DEFAULT_AVATAR_PATH } from "services/user.service";
import { hashPassword } from "utils/password";

const initDatabase = async () => {
    const countRole = await prisma.role.count();
    if (countRole === 0) {
        await prisma.role.createMany({
            data: [{ name: "ADMIN" }, { name: "USER" }],
        });
    }

    const countUser = await prisma.user.count();
    if (countUser === 0) {
        const adminRole = await prisma.role.findFirst({ where: { name: "ADMIN" } });
        const userRole = await prisma.role.findFirst({ where: { name: "USER" } });
        if (!adminRole || !userRole) {
            console.error("Roles ADMIN/USER must exist before seeding users.");
            return;
        }
        const adminHash = await hashPassword("Dung123@");
        const userHash = await hashPassword("Nhi123@");
        await prisma.user.createMany({
            data: [
                {
                    username: "tudu",
                    name: "Admin Tudu",
                    email: "tudu@football-analytics.local",
                    password: adminHash,
                    accountType: "SYSTEM",
                    role_id: adminRole.id,
                    avatar: DEFAULT_AVATAR_PATH,
                },
                {
                    username: "nhi",
                    name: "Nhi",
                    email: "nhi@football-analytics.local",
                    password: userHash,
                    accountType: "SYSTEM",
                    role_id: userRole.id,
                    avatar: DEFAULT_AVATAR_PATH,
                },
            ],
        });
    } else {
        console.log("ALREADY INIT DATA");
    }
};

export default initDatabase;
