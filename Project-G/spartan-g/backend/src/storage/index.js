import * as sqliteStorage from '../db.js';
import * as mysqlStorage from '../db.mysql.js';

const activeStorage = (process.env.DB_CLIENT || 'sqlite').toLowerCase() === 'mysql'
  ? mysqlStorage
  : sqliteStorage;

export const readDb = activeStorage.readDb;
export const writeDb = activeStorage.writeDb;
