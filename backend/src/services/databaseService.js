import { ensureDatabase, sequelize } from '../config/database.js';
import '../models/index.js';
import { seedDemoData } from './seedService.js';

export const bootDatabase = async () => {
  await ensureDatabase();
  await sequelize.authenticate();

  if (process.env.DB_SYNC !== 'false') {
    await sequelize.sync();
  }

  if (process.env.DB_SEED !== 'false') {
    await seedDemoData();
  }
};

