import dotenv from 'dotenv';
import app from './app.js';
import { complaintService } from './services/complaintService.js';
import { bootDatabase } from './services/databaseService.js';

dotenv.config();

const port = process.env.PORT || 5001;
const slaCheckMinutes = Number(process.env.SLA_CHECK_MINUTES || 60);

// This is what makes the SLA mean anything: an overdue case escalates itself even if
// nobody opens the admin screen. Set SLA_CHECK_MINUTES=0 to turn the schedule off.
const startSlaSchedule = () => {
  if (!slaCheckMinutes) return;

  const run = async () => {
    try {
      const { escalated } = await complaintService.runSlaCheck({ fullName: 'System' });
      if (escalated) console.log(`[SLA] auto-escalated ${escalated} overdue complaint(s)`);
    } catch (error) {
      console.error('[SLA] check failed:', error.message);
    }
  };

  run();
  setInterval(run, slaCheckMinutes * 60000).unref();
  console.log(`[SLA] auto-escalation runs every ${slaCheckMinutes} minutes`);
};

bootDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Smart Citizen API running on http://localhost:${port}`);
      startSlaSchedule();
    });
  })
  .catch((error) => {
    console.error('Failed to boot database:', error?.stack || error);
    process.exit(1);
  });
