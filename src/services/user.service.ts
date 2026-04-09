import getConnection from "config/database"


const handleCreateUser = async (fullName: string, username: string, email: string, password: string) => {
    // insert into database
    const connection = await getConnection();
    try {
        const sql = 'INSERT INTO `users`(`name`, `username`, `email`, `password`) VALUES (?, ?, ?, ?)';
        const values = [fullName, username, email, password];

        const [result, fields] = await connection.execute(sql, values);

    } catch (err) {
        console.log(err);
        return [];
    }
}

const getAllUsers = async () => {
    const connection = await getConnection();
    try {
        const [results, fields] = await connection.query(
            'SELECT * FROM `users`'
        );
        return results;
    } catch (err) {
        console.log(err);
        return [];
    }
}

const handleDeleteUser = async (id: string) => {
    try {
        const connection = await getConnection();
        const sql = 'DELETE FROM `users` WHERE `id` = ? ';
        const values = [id];

        const [result, fields] = await connection.execute(sql, values);

        return result;
    } catch (err) {
        console.log(err);
        return [];
    }
}

export { handleCreateUser, getAllUsers, handleDeleteUser }