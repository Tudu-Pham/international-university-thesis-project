import getConnection from "config/database"
import { prisma } from "config/client";


const handleCreateUser = async (fullName: string, username: string, email: string, password: string) => {
    // insert into database

    await prisma.user.create({
        data: {
            name: fullName,
            username: username,
            email: email,
            password: password
        }
    })
}

const getAllUsers = async () => {
    const users = await prisma.user.findMany();
    return users;
}

const handleDeleteUser = async (id: string) => {
    await prisma.user.delete({
        where: { id: +id }
    })
}

const getUserByID = async (id: string) => {
    try {
        const connection = await getConnection();
        const sql = 'SELECT * FROM `user` WHERE `id` = ? ';
        const values = [id];

        const [result, fields] = await connection.execute(sql, values);

        return result;
    } catch (err) {
        console.log(err);
        return [];
    }
}


export { handleCreateUser, getAllUsers, handleDeleteUser, getUserByID }