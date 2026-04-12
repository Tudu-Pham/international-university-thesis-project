import { prisma } from "config/client";
import { count } from "console";

const initDatabase = async () => {
    const countUser = await prisma.user.count();
    const countRole = await prisma.role.count();
    if (countUser === 0) {
        await prisma.user.createMany({
            data: [
                {
                    username: "tudu",
                    password: "Dung123@",
                    accountType: "SYSTEM",
                    role_id: 1
                },
                {
                    username: "nhi",
                    password: "Nhi123@",
                    accountType: "SYSTEM",
                    role_id: 2
                }
            ]
        })

    } else if (countRole === 0) {
        await prisma.role.createMany({
            data: [
                {
                    name: "ADMIN"
                },
                {
                    name: "USER"
                }
            ]
        })
    } else {
        console.log("ALREADY INIT DATA");
    }

}

export default initDatabase;