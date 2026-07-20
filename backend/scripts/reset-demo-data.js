// Wipes demo tables, then rebuilds the one-example seed set. Demo complaints are restored
// only when DB_SEED_COMPLAINTS=true.
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
  ComplaintCategory,
  ComplaintMessage,
  ComplaintNotification,
  ComplaintResponse,
  Counter,
  Office,
  RoutingRule,
  SatisfactionRating,
  User
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
  const answer = await rl.question(`\nType DELETE to reset ${count} demo record(s) in ${describeTarget()}: `);
  rl.close();
  return answer.trim() === 'DELETE';
};

const run = async () => {
  await sequelize.authenticate();

  const [
    complaints,
    messages,
    responses,
    ratings,
    notifications,
    logs,
    counters,
    users,
    rules,
    categories,
    offices
  ] = await Promise.all([
    Complaint.count(),
    ComplaintMessage.count(),
    ComplaintResponse.count(),
    SatisfactionRating.count(),
    ComplaintNotification.count(),
    AuditLog.count(),
    Counter.count(),
    User.count(),
    RoutingRule.count(),
    ComplaintCategory.count(),
    Office.count()
  ]);
  const totalToReset = complaints + messages + responses + ratings + notifications + logs
    + counters + users + rules + categories + offices;

  console.log(`\nTarget database : ${describeTarget()}`);
  console.log('\nThis will permanently delete:');
  console.log(`  complaints            ${complaints}`);
  console.log(`  chat messages         ${messages}`);
  console.log(`  responses / timeline  ${responses}`);
  console.log(`  satisfaction ratings  ${ratings}`);
  console.log(`  notifications         ${notifications}`);
  console.log(`  audit log entries     ${logs}`);
  console.log(`  counters              ${counters}`);
  console.log(`  users                 ${users}`);
  console.log(`  routing rules         ${rules}`);
  console.log(`  categories            ${categories}`);
  console.log(`  offices               ${offices}`);
  console.log('\nAfterwards the seed recreates one citizen, one administrative staff account, one admin, one active office, one active category, one active routing rule, and one sample complaint.');

  if (totalToReset > 0 && !await confirm(totalToReset)) {
    console.log('\nCancelled. Nothing was deleted.');
    return;
  }

  // Children first, then reference rows. One transaction, so a failure half way leaves the
  // data as it was.
  await sequelize.transaction(async (transaction) => {
    await ComplaintNotification.destroy({ where: {}, transaction });
    await ComplaintMessage.destroy({ where: {}, transaction });
    await ComplaintResponse.destroy({ where: {}, transaction });
    await SatisfactionRating.destroy({ where: {}, transaction });
    await Complaint.destroy({ where: {}, transaction });
    await AuditLog.destroy({ where: {}, transaction });
    // The counter only ever climbs, so without clearing it the next real complaint would
    // keep jumping forward after the old cases are gone.
    await Counter.destroy({ where: {}, transaction });

    await RoutingRule.destroy({ where: {}, transaction });
    await User.destroy({ where: {}, transaction });
    await ComplaintCategory.destroy({ where: {}, transaction });
    await Office.destroy({ where: {}, transaction });
  });

  console.log('\nDeleted. Rebuilding the single-example seed data...');
  const previousSeedComplaints = process.env.DB_SEED_COMPLAINTS;
  process.env.DB_SEED_COMPLAINTS = 'true';
  await seedDemoData();
  if (previousSeedComplaints === undefined) delete process.env.DB_SEED_COMPLAINTS;
  else process.env.DB_SEED_COMPLAINTS = previousSeedComplaints;

  const [remaining, sample, remainingUsers, remainingCategories, remainingOffices, remainingRules] = await Promise.all([
    Complaint.count(),
    Complaint.findOne({ order: [['id', 'ASC']] }),
    User.count(),
    ComplaintCategory.count(),
    Office.count(),
    RoutingRule.count()
  ]);
  console.log(`\nDone. Complaints now: ${remaining}`);
  console.log(`Demo users now: ${remainingUsers}`);
  console.log(`Active demo categories now: ${remainingCategories}`);
  console.log(`Active demo offices now: ${remainingOffices}`);
  console.log(`Active demo routing rules now: ${remainingRules}`);
  if (sample) console.log(`Remaining case: ${sample.trackingNumber} (${sample.status})`);
};

run()
  .catch((error) => {
    console.error('\nReset failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
