const base = process.env.API_BASE_URL || 'http://localhost:5001/api';
const password = process.env.DEMO_PASSWORD || 'password';

const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${text}`);
  return data;
};

const login = (email) => request('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const log = (message) => console.log(`OK - ${message}`);

const run = async () => {
  await request('/health');
  log('API health');

  const citizen = await login('jean@smartcitizen.rw');
  const staff = await login('staff@smartcitizen.rw');
  const admin = await login('admin@smartcitizen.rw');
  log('demo logins');

  const meta = await request('/complaints/meta', { headers: auth(citizen.token) });
  const category = meta.categories.find((item) => item.code === 'citizen-services') || meta.categories[0];
  assert(category, 'No complaint category exists');

  const complaint = await request('/complaints', {
    method: 'POST',
    headers: auth(citizen.token),
    body: JSON.stringify({
      type: category.name,
      categoryId: category.id,
      description: `Automated integration test ${new Date().toISOString()}: certificate service follow-up is delayed.`,
      cell: 'Kamatamu',
      village: 'Umucyo',
      citizenPhone: '+250 788 456 111',
      location: 'Kacyiru, Gasabo, Kigali City'
    })
  });
  log(`citizen submitted ${complaint.trackingNumber}`);

  const publicTrack = await request(`/complaints/public-track/${encodeURIComponent(complaint.trackingNumber)}`);
  assert(publicTrack.status === 'Assigned', 'Public tracking did not show assigned complaint');
  log('public tracking');

  const staffCases = await request('/complaints', { headers: auth(staff.token) });
  assert(staffCases.some((item) => item.trackingNumber === complaint.trackingNumber), 'Staff cannot see routed complaint');
  log('staff can see assigned complaint');

  await request(`/complaints/${complaint.trackingNumber}/status`, {
    method: 'PATCH',
    headers: auth(staff.token),
    body: JSON.stringify({ status: 'In Review', responseText: 'Integration test review started.' })
  });
  const resolved = await request(`/complaints/${complaint.trackingNumber}/status`, {
    method: 'PATCH',
    headers: auth(staff.token),
    body: JSON.stringify({ status: 'Resolved', responseText: 'Integration test official answer.' })
  });
  assert(resolved.status === 'Resolved', 'Staff did not resolve complaint');
  log('staff resolves complaint');

  const closed = await request(`/complaints/${complaint.trackingNumber}/rate`, {
    method: 'POST',
    headers: auth(citizen.token),
    body: JSON.stringify({ score: 5, comment: 'Integration test satisfied.' })
  });
  assert(closed.status === 'Closed', 'Citizen rating did not close complaint');
  log('citizen rating closes complaint');

  const reports = await request('/complaints/reports', { headers: auth(admin.token) });
  assert(reports.summary.totalComplaints > 0, 'Admin reports summary is empty');
  log('admin reports');

  const csv = await fetch(`${base}/complaints/reports/export?format=csv`, { headers: auth(admin.token) });
  assert(csv.ok && (await csv.text()).includes('Solved / closed'), 'CSV report export failed');
  log('CSV report export');

  const auditLogs = await request('/complaints/audit-logs', { headers: auth(admin.token) });
  assert(auditLogs.some((item) => item.action.includes(complaint.trackingNumber)), 'Audit log missing test complaint');
  log('audit log');

  console.log(`DONE - tested ${complaint.trackingNumber}`);
};

run().catch((error) => {
  console.error(`FAILED - ${error.message}`);
  process.exit(1);
});
