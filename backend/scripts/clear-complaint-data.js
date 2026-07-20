import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Op } from 'sequelize';
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

const force = process.argv.includes('--force');

const describeTarget = () => {
  const config = sequelize.config || {};
  return `${config.database || 'unknown database'} @ ${config.host || 'unknown host'}`;
};

const confirm = async (count) => {
  if (force) return true;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`Type DELETE to remove ${count} complaint(s) from ${describeTarget()}: `);
  rl.close();
  return answer.trim() === 'DELETE';
};

const run = async () => {
  await sequelize.authenticate();

  const counts = {
    complaints: await Complaint.count(),
    messages: await ComplaintMessage.count(),
    responses: await ComplaintResponse.count(),
    ratings: await SatisfactionRating.count(),
    notifications: await ComplaintNotification.count(),
    auditLogs: await AuditLog.count()
  };

  console.log(`Target database: ${describeTarget()}`);
  console.log('Deleting complaint data only. User accounts, offices, categories and routing rules stay.');
  Object.entries(counts).forEach(([name, count]) => console.log(`${name}: ${count}`));

  if (counts.complaints === 0) {
    console.log('No complaints found. Nothing was deleted.');
    return;
  }

  if (!await confirm(counts.complaints)) {
    console.log('Cancelled. Nothing was deleted.');
    return;
  }

  await sequelize.transaction(async (transaction) => {
    await ComplaintNotification.destroy({ where: {}, transaction });
    await ComplaintMessage.destroy({ where: {}, transaction });
    await ComplaintResponse.destroy({ where: {}, transaction });
    await SatisfactionRating.destroy({ where: {}, transaction });
    await Complaint.destroy({ where: {}, transaction });
    await AuditLog.destroy({ where: {}, transaction });
    await Counter.destroy({ where: { key: { [Op.like]: 'complaint-%' } }, transaction });
  });

  const remaining = await Complaint.count();
  console.log(`Done. Complaints now: ${remaining}`);
};

run()
  .catch((error) => {
    console.error('Clear failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
