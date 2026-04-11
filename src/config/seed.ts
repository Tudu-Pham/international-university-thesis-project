import { prisma } from "config/client";
import { count } from "console";

const initDatabase = async () => {
    const countUser = await prisma.user.count();
    if (countUser === 0) {
        await prisma.user.createMany({
            data: [
                {
                    username: "tudu",
                    password: "Dung123@",
                    accountType: "SYSTEM"
                },
                {
                    username: "nhi",
                    password: "Nhi123@",
                    accountType: "SYSTEM"
                }
            ]
        })

    } else {
        console.log("ALREADY INIT DATA");
    }
}

export default initDatabase;