const styles = {
  Environment: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Education: 'bg-blue-50 text-blue-700 ring-blue-100',
  Health: 'bg-rose-50 text-rose-700 ring-rose-100',
  Transport: 'bg-amber-50 text-amber-700 ring-amber-100',
  Technology: 'bg-violet-50 text-violet-700 ring-violet-100',
  Governance: 'bg-teal-50 text-teal-700 ring-teal-100',
  Agriculture: 'bg-lime-50 text-lime-700 ring-lime-100',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  'Under Review': 'bg-blue-50 text-blue-700 ring-blue-100',
  'In Progress': 'bg-amber-50 text-amber-700 ring-amber-100',
  Implemented: 'bg-violet-50 text-violet-700 ring-violet-100',
  Rejected: 'bg-red-50 text-red-700 ring-red-100',
  Open: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Assigned: 'bg-blue-50 text-blue-700 ring-blue-100',
  'In Review': 'bg-amber-50 text-amber-700 ring-amber-100',
  'Waiting for Citizen': 'bg-violet-50 text-violet-700 ring-violet-100',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Closed: 'bg-slate-100 text-slate-700 ring-slate-200',
  Escalated: 'bg-red-50 text-red-700 ring-red-100',
  Overdue: 'bg-red-50 text-red-700 ring-red-100',
  Critical: 'bg-red-50 text-red-700 ring-red-100',
  High: 'bg-amber-50 text-amber-700 ring-amber-100',
  Medium: 'bg-blue-50 text-blue-700 ring-blue-100',
  Low: 'bg-slate-50 text-slate-700 ring-slate-100',
  Read: 'bg-slate-50 text-slate-600 ring-slate-100',
  Unread: 'bg-blue-50 text-blue-700 ring-blue-100',
  Citizen: 'bg-blue-50 text-blue-700 ring-blue-100',
  'Administrative Staff': 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Admin: 'bg-violet-50 text-violet-700 ring-violet-100',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Enabled: 'bg-emerald-50 text-emerald-700 ring-emerald-100'
};

export const StatusBadge = ({ value }) => (
  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ${styles[value] || 'bg-slate-50 text-slate-700 ring-slate-100'}`}>
    {value}
  </span>
);
