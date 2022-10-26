import mysql from 'mysql2/promise';

export const query = async ({ query, values = [] }: any) => {
  const dbConnection = await mysql.createConnection({
    host: process.env.HOST,
    database: process.env.DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    const [results] = await dbConnection.execute(query, values);
    dbConnection.end();
    return results;
  } catch (error: any) {
    throw Error(error.message);
  }
};
