import { NavLink } from 'react-router-dom';

// Status vocabulary used by the backend, mapped to the badge colours of the design system.
const statusTone = {
  Assigned: 'b-blue',
  'In Review': 'b-blue',
  'Waiting for Citizen': 'b-amber',
  Resolved: 'b-green',
  Closed: 'b-gray',
  Escalated: 'b-red',
  Critical: 'b-red',
  High: 'b-amber',
  Medium: 'b-blue',
  Low: 'b-gray',
  citizen: 'b-blue',
  staff: 'b-blue',
  admin: 'b-violet',
  active: 'b-green',
  suspended: 'b-red',
  pending: 'b-amber'
};

export const Badge = ({ value, tone }) => (
  <span className={`badge ${tone || statusTone[value] || 'b-gray'}`}>
    <span className="dot" />
    {value}
  </span>
);

export const Tabs = ({ tabs }) => (
  <div className="tabs">
    {tabs.map((tab) => (
      <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        <span aria-hidden="true">{tab.icon}</span>
        {tab.label}
        {tab.count > 0 && <span className="count">{tab.count}</span>}
      </NavLink>
    ))}
  </div>
);

export const Timeline = ({ items }) => (
  <div className="tl">
    {items.map((item, index) => (
      <div key={index} className={`tl-item ${item.done === false ? '' : 'done'}`}>
        <div className="tl-t">{item.title}</div>
        <div className="tl-w">{item.when}</div>
      </div>
    ))}
  </div>
);

export const Empty = ({ title, subtitle }) => (
  <div className="empty">
    <b>{title}</b>
    {subtitle}
  </div>
);

export const Stat = ({ label, value, danger = false }) => (
  <div className="stat">
    <div className="stat-l">{label}</div>
    <div className="stat-v" style={danger && Number(value) > 0 ? { color: '#dc2626' } : undefined}>{value}</div>
  </div>
);

export const Bar = ({ label, value, total }) => {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--muted)' }}>{label}</span>
        <b>{value}</b>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export const PageTitle = ({ title, subtitle }) => (
  <div>
    <div className="page-h">{title}</div>
    {subtitle && <div className="page-sub">{subtitle}</div>}
  </div>
);

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '—');
export const formatDateTime = (value) => (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—');

const todayIso = () => new Date().toISOString().slice(0, 10);
export const isTerminal = (complaint) => ['Resolved', 'Closed'].includes(complaint.status);
export const isOverdue = (complaint) => !isTerminal(complaint) && complaint.dueDate && complaint.dueDate < todayIso();
