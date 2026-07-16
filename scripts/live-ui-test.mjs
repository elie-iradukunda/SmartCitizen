import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const apiUrl = process.env.API_BASE_URL || 'http://localhost:5001/api';
const slowMo = Number(process.env.LIVE_UI_SLOW_MS || 550);
const holdMs = Number(process.env.LIVE_UI_HOLD_MS || 5000);
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const screenshotsDir = path.resolve('test-screenshots', `live-ui-${runId}`);
const downloadsDir = path.resolve('test-results', `live-ui-downloads-${runId}`);
const profileDir = path.join(os.tmpdir(), `smart-citizen-live-ui-${runId}`);

const chromePath = () => {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('Chrome or Edge was not found. Set CHROME_PATH to the browser executable.');
  return found;
};

const log = (message) => console.log(`OK - ${message}`);

const screenshot = async (page, name) => {
  await mkdir(screenshotsDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotsDir, `${name}.png`), fullPage: true });
};

const healthCheck = async () => {
  const [apiHealth, frontendHealth] = await Promise.all([
    fetch(`${apiUrl}/health`),
    fetch(appUrl)
  ]);
  if (!apiHealth.ok) throw new Error(`API is not healthy: ${apiHealth.status}`);
  if (!frontendHealth.ok) throw new Error(`Frontend is not reachable: ${frontendHealth.status}`);
};

const resetToLogin = async (page) => {
  await page.goto(`${appUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${appUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Smart Citizen').waitFor({ timeout: 15000 });
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const loginDemo = async (page, label, email, pathPrefix) => {
  await resetToLogin(page);
  await page.getByRole('button', { name: new RegExp(escapeRegExp(email), 'i') }).click();
  await page.waitForURL((url) => url.pathname.startsWith(pathPrefix), { timeout: 20000 });
  await screenshot(page, `${label.toLowerCase().replace(/\s+/g, '-')}-dashboard`);
  log(`${label} login`);
};

const cardFor = (page, trackingNumber) => page.locator('.card').filter({ hasText: trackingNumber }).first();

const waitForCardText = async (page, trackingNumber, text) => {
  const card = cardFor(page, trackingNumber);
  await card.waitFor({ timeout: 20000 });
  await card.getByText(text).first().waitFor({ timeout: 20000 });
};

const run = async () => {
  await healthCheck();
  await mkdir(downloadsDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    executablePath: chromePath(),
    headless: false,
    acceptDownloads: true,
    viewport: { width: 1400, height: 900 },
    slowMo,
    args: ['--start-maximized', '--disable-popup-blocking']
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(20000);

  try {
    await loginDemo(page, 'Citizen', 'jean@smartcitizen.rw', '/app');
    await page.locator('textarea.input').first().fill(`Live UI test ${new Date().toISOString()}: my service certificate application has been delayed at the front desk.`);
    await page.getByRole('button', { name: /Send complaint/i }).click();
    const trackingNumber = (await page.locator('.scf-big').textContent({ timeout: 20000 }))?.trim();
    if (!trackingNumber?.startsWith('SCF-')) throw new Error('Citizen submission did not return a tracking number.');
    await screenshot(page, 'citizen-submitted-complaint');
    log(`citizen submitted ${trackingNumber}`);

    await loginDemo(page, 'Administrative Staff', 'staff@smartcitizen.rw', '/staff');
    await page.goto(`${appUrl}/staff/cases`, { waitUntil: 'domcontentloaded' });
    await page.getByText(trackingNumber).waitFor({ timeout: 20000 });
    let card = cardFor(page, trackingNumber);
    await card.getByRole('button', { name: /Open & work on this case/i }).click();
    await card.getByRole('button', { name: /Start reviewing/i }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForCardText(page, trackingNumber, 'In Review');
    card = cardFor(page, trackingNumber);
    await card.getByRole('button', { name: /Open & work on this case/i }).click();
    await card.locator('textarea').fill('Live UI test official answer: certificate request has been reviewed and resolved.');
    await card.getByRole('button', { name: /Mark as resolved/i }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^All/i }).click();
    await waitForCardText(page, trackingNumber, 'Resolved');
    await screenshot(page, 'staff-resolved-complaint');
    log('staff resolved complaint');

    await loginDemo(page, 'Citizen', 'jean@smartcitizen.rw', '/app');
    await page.goto(`${appUrl}/app/complaints`, { waitUntil: 'domcontentloaded' });
    await page.getByText(trackingNumber).waitFor({ timeout: 20000 });
    card = cardFor(page, trackingNumber);
    await card.locator('input.input').first().fill('Live UI test: response was clear.');
    await card.getByRole('button', { name: /Rate 5 out of 5/i }).click();
    await waitForCardText(page, trackingNumber, 'You rated');
    await screenshot(page, 'citizen-rated-complaint');
    log('citizen rated complaint');

    await loginDemo(page, 'Admin', 'admin@smartcitizen.rw', '/admin');
    await page.goto(`${appUrl}/admin/reports`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Print report/i }).waitFor();
    await page.getByRole('button', { name: /Download CSV/i }).waitFor();
    await page.getByRole('button', { name: /Download document/i }).waitFor();
    await screenshot(page, 'admin-reports-actions');

    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download CSV/i }).click()
    ]);
    await csvDownload.saveAs(path.join(downloadsDir, await csvDownload.suggestedFilename()));

    const [htmlDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download document/i }).click()
    ]);
    await htmlDownload.saveAs(path.join(downloadsDir, await htmlDownload.suggestedFilename()));
    log('admin report downloads');

    await page.goto(`${appUrl}/admin/complaints`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Past due only/i }).waitFor();
    await page.getByRole('button', { name: /Clear filters/i }).waitFor();
    await screenshot(page, 'admin-complaint-filters');
    log('admin complaint filters');

    console.log(`DONE - live UI tested ${trackingNumber}`);
    console.log(`Screenshots: ${screenshotsDir}`);
    console.log(`Downloads: ${downloadsDir}`);
    await page.waitForTimeout(holdMs);
  } finally {
    await context.close();
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
};

run().catch((error) => {
  console.error(`FAILED - ${error.message}`);
  process.exit(1);
});
