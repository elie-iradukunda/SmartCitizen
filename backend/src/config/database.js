import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';

dotenv.config();

const dialect = process.env.DB_DIALECT || 'mysql';
const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;
const database = process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'smart_citizen_portal';
const username = process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
const password = process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? process.env.MYSQL_PASSWORD ?? '';
const host = process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost';
const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306);
const canCreateDatabase = process.env.DB_CREATE === 'true' || ['localhost', '127.0.0.1', '::1'].includes(host);

export const ensureDatabase = async () => {
  if (dialect !== 'mysql' || connectionUrl || !canCreateDatabase) return;

  try {
    const connection = await mysql.createConnection({ host, port, user: username, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.end();
  } catch (error) {
    const details = error.errors?.map((item) => `${item.code || item.name} ${item.address || host}:${item.port || port}`).join(', ');
    throw new Error(details || error.message || 'Unable to connect to MySQL');
  }
};

const sequelizeOptions = {
  host,
  port,
  dialect,
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true
  }
};

export const sequelize = connectionUrl
  ? new Sequelize(connectionUrl, sequelizeOptions)
  : new Sequelize(database, username, password, sequelizeOptions);

export default sequelize;
