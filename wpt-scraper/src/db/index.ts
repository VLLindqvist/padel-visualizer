import mysql from "mysql2/promise";

export default async function mysqlConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
}

export function sql(strings: TemplateStringsArray, ...expr: any[]) {
  return strings.map((str, index) => str + (expr.length > index ? String(expr[index]) : "")).join("");
}
