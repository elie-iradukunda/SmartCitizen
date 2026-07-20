// Wipes every complaint and everything hanging off one, then lets the normal seed refresh
// users and reference data. Demo complaints are restored only when DB_SEED_COMPLAINTS=true.
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
import { Op } from 'sequelize';
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
import { seedDemoData, seedDemoInventory } from '../src/services/seedService.js';

const force = process.argv.includes('--force');

const describeTarget = () => {
  const config = sequelize.config || {};
  const host = config.host || 'unknown host';
  const database = config.database || 'unknown database';
  return `${database} @ ${host}`;
};

const staleValues = (legacy, current) => legacy.filter((value) => !current.includes(value));

const confirm = async (count) => {
  if (force) return true;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`\nType DELETE to reset ${count} demo record(s) in ${describeTarget()}: `);
  rl.close();
  return answer.trim() === 'DELETE';
};

const destroyIfAny = async (model, field, values, transaction) => {
  if (!values.length) return 0;
  return model.destroy({ where: { [field]: { [Op.in]: values } }, transaction });
};

const run = async () => {
  await sequelize.authenticate();

  const staleUserEmails = staleValues(seedDemoInventory.legacyUserEmails, seedDemoInventory.currentUserEmails);
  const staleRoutingRuleCodes = staleValues(seedDemoInventory.legacyRoutingRuleCodes, seedDemoInventory.currentRoutingRuleCodes);
  const staleCategoryCodes = staleValues(seedDemoInventory.legacyCategoryCodes, seedDemoInventory.currentCategoryCodes);
  const staleOfficeCodes = staleValues(seedDemoInventory.legacyOfficeCodes, seedDemoInventory.currentOfficeCodes);

  const complaints = await Complaint.count();
  const [messages, responses, ratings, notifications, logs, staleUsers, staleRules, staleCategories, staleOffices] = await Promise.all([
    ComplaintMessage.count(),
    ComplaintResponse.count(),
    SatisfactionRating.count(),
    ComplaintNotification.count(),
    AuditLog.count(),
    staleUserEmails.length ? User.count({ where: { email: { [Op.in]: staleUserEmails } } }) : 0,
    staleRoutingRuleCodes.length ? RoutingRule.count({ where: { code: { [Op.in]: staleRoutingRuleCodes } } }) : 0,
    staleCategoryCodes.length ? ComplaintCategory.count({ where: { code: { [Op.in]: staleCategoryCodes } } }) : 0,
    staleOfficeCodes.length ? Office.count({ where: { code: { [Op.in]: staleOfficeCodes } } }) : 0
  ]);
  const totalToReset = complaints + messages + responses + ratings + notifications + logs
    + staleUsers + staleRules + staleCategories + staleOffices;

  console.log(`\nTarget database : ${describeTarget()}`);
  console.log('\nThis will permanently delete:');
  console.log(`  complaints            ${complaints}`);
  console.log(`  chat messages         ${messages}`);
  console.log(`  responses / timeline  ${responses}`);
  console.log(`  satisfaction ratings  ${ratings}`);
  console.log(`  notifications         ${notifications}`);
  console.log(`  audit log entries     ${logs}`);
  console.log(`  old demo users        ${staleUsers}`);
  console.log(`  old routing rules     ${staleRules}`);
  console.log(`  old categories        ${staleCategories}`);
  console.log(`  old offices           ${staleOffices}`);
  console.log('\nAfterwards the seed recreates one citizen, one normal staff account, one escalation staff account, one admin, one active category, one active routing rule, and one sample complaint.');

  if (totalToReset > 0 && !await confirm(totalToReset)) {
    console.log('\nCancelled. Nothing was deleted.');
    return;
  }

  // Children first, then stale seed-managed reference rows. One transaction, so a failure
  // half way leaves the data as it was.
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

    await destroyIfAny(User, 'email', staleUserEmails, transaction);
    await destroyIfAny(RoutingRule, 'code', staleRoutingRuleCodes, transaction);
    await destroyIfAny(ComplaintCategory, 'code', staleCategoryCodes, transaction);
    await destroyIfAny(Office, 'code', staleOfficeCodes, transaction);
  });

  console.log('\nDeleted. Rebuilding the single-example seed data...');
  const previousSeedComplaints = process.env.DB_SEED_COMPLAINTS;
  process.env.DB_SEED_COMPLAINTS = 'true';
  await seedDemoData();
  if (previousSeedComplaints === undefined) delete process.env.DB_SEED_COMPLAINTS;
  else process.env.DB_SEED_COMPLAINTS = previousSeedComplaints;

  const [remaining, sample, users, categories, offices, rules] = await Promise.all([
    Complaint.count(),
    Complaint.findOne({ order: [['id', 'ASC']] }),
    User.count({ where: { email: { [Op.in]: seedDemoInventory.currentUserEmails } } }),
    ComplaintCategory.count({ where: { code: { [Op.in]: seedDemoInventory.currentCategoryCodes }, active: true } }),
    Office.count({ where: { code: { [Op.in]: seedDemoInventory.currentOfficeCodes }, active: true } }),
    RoutingRule.count({ where: { code: { [Op.in]: seedDemoInventory.currentRoutingRuleCodes }, active: true } })
  ]);
  console.log(`\nDone. Complaints now: ${remaining}`);
  console.log(`Demo users now: ${users}`);
  console.log(`Active demo categories now: ${categories}`);
  console.log(`Active demo offices now: ${offices}`);
  console.log(`Active demo routing rules now: ${rules}`);
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
