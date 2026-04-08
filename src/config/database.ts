import mysql from 'mysql2/promise';


const getConnection = async () => {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'footballanalytics'
    });

    try {
        const [results, fields] = await connection.query(
            'SELECT * FROM `users`'
        );
        console.log(results);
        console.log(fields);
    } catch (err) {
        console.log(err);
    }
}

export default getConnection;