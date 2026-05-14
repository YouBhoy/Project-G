import * as mysqlStorage from '../db.mysql.js';

// STRICTLY USE MYSQL ONLY
export const readDb = mysqlStorage.readDb;
export const writeDb = mysqlStorage.writeDb;
