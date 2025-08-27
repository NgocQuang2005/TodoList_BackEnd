require("dotenv").config();

module.exports = {
  client: process.env.DB_CLIENT || "mssql",
  debug: false,
  connection: {
    server: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      appName: "todo-app",
      requestTimeout: 30000,
      connectionTimeout: 10000,
    },
  },
  pool: { min: 2, max: 10 },
};
