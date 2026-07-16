import { ensureDatabase, sequelize } from '../config/database.js';
import { Complaint, Office, SatisfactionRating, User } from '../models/index.js';
import { seedDemoData } from './seedService.js';

const ensureColumn = async (queryInterface, model, attributeName) => {
  const tableName = model.getTableName();
  const attributes = model.getAttributes();
  const attribute = attributes[attributeName];
  if (!attribute) return;

  const columns = await queryInterface.describeTable(tableName);
  const columnName = attribute.field || attributeName;
  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, {
      type: attribute.type,
      allowNull: attribute.allowNull,
      defaultValue: attribute.defaultValue
    });
  }
};

const ensureSchemaColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const additions = [
    [User, 'nationalId'],
    [User, 'cell'],
    [User, 'village'],
    [User, 'address'],
    [User, 'preferredLanguage'],
    [User, 'resetTokenHash'],
    [User, 'resetTokenExpiry'],
    [Office, 'isSectorExecutive'],
    [Complaint, 'isAnonymous'],
    [Complaint, 'submissionMode'],
    [Complaint, 'evidenceType'],
    [Complaint, 'evidenceLink'],
    [Complaint, 'voiceNoteName'],
    [Complaint, 'voiceNotePath'],
    [Complaint, 'voiceNoteType'],
    [Complaint, 'chatOpenedAt'],
    [Complaint, 'escalationRequestedAt'],
    [SatisfactionRating, 'isPublic']
  ];

  for (const [model, attributeName] of additions) {
    await ensureColumn(queryInterface, model, attributeName);
  }
};

export const bootDatabase = async () => {
  await ensureDatabase();
  await sequelize.authenticate();

  if (process.env.DB_SYNC !== 'false') {
    await sequelize.sync();
    await ensureSchemaColumns();
  }

  if (process.env.DB_SEED !== 'false') {
    await seedDemoData();
  }
};
