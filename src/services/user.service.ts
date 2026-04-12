import getConnection from "config/database"
import { prisma } from "config/client";


const handleCreateUser = async (fullName: string, username: string, email: string, password: string) => {
    const userRole = await prisma.role.findFirst({
        where: { name: "USER" },
    });
    if (!userRole) {
        throw new Error('Role "USER" not found. Seed roles before creating users.');
    }

    await prisma.user.create({
        data: {
            name: fullName,
            username: username,
            email: email,
            password: password,
            accountType: "USER",
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
        where: { id: +id }
    })
}

const getUserByID = async (id: string) => {
    try {
        const connection = await getConnection();
        const sql = 'SELECT * FROM `users` WHERE `id` = ? ';
        const values = [id];

        const [result, fields] = await connection.execute(sql, values);

        return result;
    } catch (err) {
        console.log(err);
        return [];
    }
}


export { handleCreateUser, getAllUsers, handleDeleteUser, getUserByID }