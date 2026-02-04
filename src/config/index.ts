import 'dotenv/config';
import path from 'path';
import { Sequelize } from 'sequelize';

const config = require(path.join(__dirname, 'database.js')).development;

export const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging === false ? false : console.log,
  }
);

export type Dialect = 'postgres';
