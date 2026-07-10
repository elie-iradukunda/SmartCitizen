import dotenv from 'dotenv';
import app from './app.js';
import { bootDatabase } from './services/databaseService.js';

dotenv.config();

const port = process.env.PORT || 5001;

bootDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Smart Citizen API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to boot database:', error?.stack || error);
    process.exit(1);
  });
