const csvValue = (value = '') => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const csvRow = (values) => values.map(csvValue).join(',');

const escapeHtml = (value = '') => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const dateStamp = () => new Date().toISOString().slice(0, 10);

const complaintRows = (items = []) => items.map((item) => csvRow([
  item.trackingNumber,
  item.category,
  item.assignedOffice,
  item.priority,
  item.status,
  item.dueDate,
  item.createdAt
]));

export const reportExportService = {
  toCsv(reports) {
    const { summary, byStatus = [], byCategory = [], byOffice = [], recentComplaints = [], adminAttention = [] } = reports;
    const rows = [
      csvRow(['Smart Citizen Complaint Report']),
      csvRow(['Generated at', new Date().toISOString()]),
      '',
      csvRow(['Summary', 'Value']),
      csvRow(['Total complaints', summary.totalComplaints]),
      csvRow(['Solved / closed', summary.resolved]),
      csvRow(['Pending / open', summary.openComplaints]),
      csvRow(['Past due date', summary.overdue]),
      csvRow(['Escalated', summary.escalated]),
      csvRow(['Average rating', summary.averageSatisfaction]),
      '',
      csvRow(['Complaints by status']),
      csvRow(['Status', 'Count']),
      ...byStatus.map((item) => csvRow([item.name, item.value])),
      '',
      csvRow(['Complaints by category']),
      csvRow(['Category', 'Count']),
      ...byCategory.map((item) => csvRow([item.name, item.value])),
      '',
      csvRow(['Complaints by responsible office']),
      csvRow(['Office', 'Count']),
      ...byOffice.map((item) => csvRow([item.name, item.value])),
      '',
      csvRow(['Recent complaints']),
      csvRow(['Tracking number', 'Category', 'Office', 'Priority', 'Status', 'Due date', 'Created at']),
      ...complaintRows(recentComplaints),
      '',
      csvRow(['Needs attention']),
      csvRow(['Tracking number', 'Category', 'Office', 'Priority', 'Status', 'Due date', 'Created at']),
      ...complaintRows(adminAttention)
    ];
    return rows.join('\r\n');
  },

  toHtml(reports, actor) {
    const { summary, byStatus = [], byCategory = [], byOffice = [], recentComplaints = [], adminAttention = [], auditLogs = [] } = reports;
    const tableRows = (items, columns) => items.length
      ? items.map((item) => `<tr>${columns.map((column) => `<td>${escapeHtml(column(item))}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}" class="empty">No records</td></tr>`;
    const breakdownRows = (items) => tableRows(items, [(item) => item.name, (item) => item.value]);
    const caseColumns = [
      (item) => item.trackingNumber,
      (item) => item.category,
      (item) => item.assignedOffice,
      (item) => item.priority,
      (item) => item.status,
      (item) => item.dueDate
    ];

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Smart Citizen Complaint Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f2537; margin: 28px; line-height: 1.35; }
    h1 { margin: 0 0 4px; font-size: 24px; }
    h2 { margin: 24px 0 8px; font-size: 16px; color: #0369a1; }
    .muted { color: #5b7185; font-size: 12px; }
    .head { border-bottom: 3px solid #0ea5e9; padding-bottom: 14px; margin-bottom: 16px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .metric { border: 1px solid #dbeafe; border-radius: 8px; background: #f8fcff; padding: 10px; }
    .metric b { display: block; color: #0369a1; font-size: 22px; }
    .metric span { color: #5b7185; font-size: 11px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th, td { border: 1px solid #dbeafe; padding: 7px; text-align: left; vertical-align: top; }
    th { background: #e0f2fe; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .empty { color: #5b7185; text-align: center; }
    @page { margin: 16mm; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print</button>
  <section class="head">
    <h1>Smart Citizen Complaint Report</h1>
    <div class="muted">Generated at ${escapeHtml(new Date().toISOString())} by ${escapeHtml(actor?.fullName || 'System')}</div>
  </section>
  <section class="summary">
    <div class="metric"><span>Total complaints</span><b>${escapeHtml(summary.totalComplaints)}</b></div>
    <div class="metric"><span>Solved / closed</span><b>${escapeHtml(summary.resolved)}</b></div>
    <div class="metric"><span>Pending / open</span><b>${escapeHtml(summary.openComplaints)}</b></div>
    <div class="metric"><span>Past due date</span><b>${escapeHtml(summary.overdue)}</b></div>
    <div class="metric"><span>Escalated</span><b>${escapeHtml(summary.escalated)}</b></div>
    <div class="metric"><span>Average rating</span><b>${escapeHtml(summary.averageSatisfaction || '-')}</b></div>
  </section>
  <section class="split">
    <div><h2>Complaints by status</h2><table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>${breakdownRows(byStatus)}</tbody></table></div>
    <div><h2>Complaints by category</h2><table><thead><tr><th>Category</th><th>Count</th></tr></thead><tbody>${breakdownRows(byCategory)}</tbody></table></div>
  </section>
  <h2>Complaints by responsible office</h2>
  <table><thead><tr><th>Office</th><th>Count</th></tr></thead><tbody>${breakdownRows(byOffice)}</tbody></table>
  <h2>Recent complaints</h2>
  <table><thead><tr><th>Tracking</th><th>Category</th><th>Office</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>${tableRows(recentComplaints, caseColumns)}</tbody></table>
  <h2>Needs attention</h2>
  <table><thead><tr><th>Tracking</th><th>Category</th><th>Office</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>${tableRows(adminAttention, caseColumns)}</tbody></table>
  <h2>Recent audit actions</h2>
  <table><thead><tr><th>Time</th><th>Actor</th><th>Action</th></tr></thead><tbody>${tableRows(auditLogs, [(item) => item.createdAt, (item) => item.actor, (item) => item.action])}</tbody></table>
</body>
</html>`;
  },

  file(format, reports, actor) {
    if (format === 'html') {
      return {
        filename: `smart-citizen-complaint-report-${dateStamp()}.html`,
        contentType: 'text/html; charset=utf-8',
        body: this.toHtml(reports, actor)
      };
    }
    return {
      filename: `smart-citizen-complaint-report-${dateStamp()}.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: this.toCsv(reports)
    };
  }
};
