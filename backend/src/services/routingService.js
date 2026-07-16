import { ComplaintCategory, Counter, sequelize } from '../models/index.js';

// The core engine: pick the right category from what the citizen actually wrote, so they
// never have to know which office owns which problem. The browser guesses too, but the
// server decides — that way anonymous, SMS or API submissions are routed the same way.
// Kinyarwanda first, because that is what most citizens type.
const keywordsByCategoryCode = {
  'infrastructure-sanitation': [
    'mazi', 'myanda', 'muhanda', 'isuku', 'miyoboro', 'itara', 'mashanyarazi', 'kiraro', 'ibarabara', 'rumuri',
    'water', 'road', 'waste', 'garbage', 'drainage', 'street light', 'sanitation', 'electricity', 'bridge'
  ],
  'land-housing-construction': [
    'butaka', 'inzu', 'miturire', 'kibanza', 'mupaka', 'mbibi', 'bwubatsi',
    'land', 'plot', 'housing', 'construction', 'permit', 'boundary', 'property'
  ],
  'community-safety-health': [
    'mutekano', 'buzima', 'ivuriro', 'ndwara', 'rugomo', 'bajura', 'bwoba',
    'safety', 'health', 'security', 'clinic', 'disease', 'violence', 'theft'
  ],
  'governance-accountability': [
    'ruswa', 'buriganya', 'karengane', 'muyobozi', 'kunyereza', 'kurenganya',
    'corruption', 'bribe', 'misconduct', 'unfair', 'abuse'
  ],
  'citizen-services': [
    'cyangombwa', 'mpapuro', 'serivisi', 'ruhushya', 'yandikishe',
    'document', 'certificate', 'service', 'application', 'delay', 'permit fee'
  ]
};

const fallbackCode = 'citizen-services';

export const detectCategoryCode = (text = '') => {
  const value = String(text).toLowerCase();
  if (!value.trim()) return fallbackCode;
  const match = Object.entries(keywordsByCategoryCode)
    .find(([, words]) => words.some((word) => value.includes(word)));
  return match?.[0] || fallbackCode;
};

// Used when the caller sent no category at all (anonymous submit, or a client that
// does not guess). Falls back to any active category if the seeded codes are gone.
export const detectCategory = async (text) => {
  const code = detectCategoryCode(text);
  return await ComplaintCategory.findOne({ where: { code, active: true } })
    || await ComplaintCategory.findOne({ where: { active: true }, order: [['id', 'ASC']] });
};

// Atomic per-year sequence. The counter row is locked for the length of the transaction,
// so two complaints submitted in the same millisecond cannot collide on SCF-2026-0007.
export const nextTrackingNumber = async () => sequelize.transaction(async (transaction) => {
  const year = new Date().getFullYear();
  const key = `complaint-${year}`;

  // SELECT ... FOR UPDATE: the second caller waits here until the first has committed,
  // so both cannot read the same value.
  let counter = await Counter.findOne({ where: { key }, transaction, lock: transaction.LOCK.UPDATE });
  if (!counter) counter = await Counter.create({ key, value: 0 }, { transaction });

  const value = counter.value + 1;
  await counter.update({ value }, { transaction });
  return `SCF-${year}-${String(value).padStart(4, '0')}`;
});
