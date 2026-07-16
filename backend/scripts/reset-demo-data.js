// Wipes every complaint and everything hanging off one, then lets the normal seed put back
// the single demo case. Written for the moment a demo database has filled up with test
// submissions and needs to be handed over clean.
//
// It never runs by accident: it prints what it found, then waits for you to type DELETE.
//
//   cd backend
//   railway run node scripts/reset-demo-data.js     # against the Railway database
//   node scripts/reset-demo-data.js                 # against whatever .env points at
//
// Add --force to skip the prompt (for a non-interactive shell only).

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { sequelize } from '../src/config/database.js';
import {
  AuditLog,
  Complaint,
  ComplaintMessage,
  ComplaintNotification,
  ComplaintResponse,
  Counter,
  SatisfactionRating
} from '../src/models/index.js';
import { seedDemoData } from '../src/services/seedService.js';

const force = process.argv.includes('--force');

const describeTarget = () => {
  const config = sequelize.config || {};
  const host = config.host || 'unknown host';
  const database = config.database || 'unknown database';
  return `${database} @ ${host}`;
};

const confirm = async (count) => {
  if (force) return true;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`\nType DELETE to remove all ${count} complaint(s) from ${describeTarget()}: `);
  rl.close();
  return answer.trim() === 'DELETE';
};

const run = async () => {
  await sequelize.authenticate();

  const complaints = await Complaint.count();
  const [messages, responses, ratings, notifications, logs] = await Promise.all([
    ComplaintMessage.count(),
    ComplaintResponse.count(),
    SatisfactionRating.count(),
    ComplaintNotification.count(),
    AuditLog.count()
  ]);

  console.log(`\nTarget database : ${describeTarget()}`);
  console.log('\nThis will permanently delete:');
  console.log(`  complaints            ${complaints}`);
  console.log(`  chat messages         ${messages}`);
  console.log(`  responses / timeline  ${responses}`);
  console.log(`  satisfaction ratings  ${ratings}`);
  console.log(`  notifications         ${notifications}`);
  console.log(`  audit log entries     ${logs}`);
  console.log('\nUser accounts, offices, categories and routing rules are NOT touched.');
  console.log('Afterwards the seed puts back one demo complaint (SCF-<year>-0001).');

  if (complaints === 0) {
    console.log('\nThere are no complaints to delete. Nothing to do.');
    return;
  }

  if (!await confirm(complaints)) {
    console.log('\nCancelled. Nothing was deleted.');
    return;
  }

  // Children first: every one of these points at a complaint, so the parent row cannot go
  // until they have. One transaction, so a failure half way leaves the data as it was.
  await sequelize.transaction(async (transaction) => {
    await ComplaintNotification.destroy({ where: {}, transaction });
    await ComplaintMessage.destroy({ where: {}, transaction });
    await ComplaintResponse.destroy({ where: {}, transaction });
    await SatisfactionRating.destroy({ where: {}, transaction });
    await Complaint.destroy({ where: {}, transaction });
    await AuditLog.destroy({ where: {}, transaction });
    // The counter only ever climbs, so without clearing it the fresh demo case would be
    // SCF-<year>-0001 while the next real complaint jumped to 0029.
    await Counter.destroy({ where: {}, transaction });
  });

  console.log('\nDeleted. Re-seeding the single demo complaint…');
  await seedDemoData();

  const [remaining, sample] = await Promise.all([
    Complaint.count(),
    Complaint.findOne({ order: [['id', 'ASC']] })
  ]);
  console.log(`\nDone. Complaints now: ${remaining}`);
  if (sample) console.log(`Demo case: ${sample.trackingNumber} (${sample.status})`);
};

run()
  .catch((error) => {
    console.error('\nReset failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
