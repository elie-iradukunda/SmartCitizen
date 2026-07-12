import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileText, PlusCircle, Settings, Trash2, Users } from 'lucide-react';
import { endpoints } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([endpoints.complaintReports(), endpoints.complaints(), endpoints.users()]).then(([reports, complaints, users]) => {
      setData({ reports, complaints, users });
    });
  }, []);
  if (!data) return <LoadingState />;

  const { reports, complaints, users } = data;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonth = complaints.filter((complaint) => String(complaint.createdAt || '').slice(0, 7) === currentMonth).length;
  const satisfactionRate = `${reports.summary.averageSatisfaction || 0}/5`;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-violet-200 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-violet-700 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-100">Admin Dashboard</p>
            <h1 className="text-xl font-bold">Manage users, roles, categories, SLAs, security, routing, and analytics</h1>
          </div>
          <Link to="/admin/reports" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-violet-700">
            <BarChart3 size={16} />
            View Reports
          </Link>
        </div>

        <div className="grid gap-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminStat label="Total Complaints" value={complaints.length} color="bg-violet-700" />
            <AdminStat label="This Month" value={thisMonth} color="bg-blue-600" />
            <AdminStat label="Needs Attention" value={reports.summary.needsAdminAttention || 0} color="bg-red-600" />
            <AdminStat label="Resolved" value={reports.summary.resolved} color="bg-emerald-600" />
            <AdminStat label="Satisfaction Rate" value={satisfactionRate} color="bg-amber-500" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">Complaints Overview</h2>
              <AdminRows data={reports.byStatus} color="bg-violet-700" />
            </section>
            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">System Health</h2>
              <div className="mt-3 grid gap-2 text-xs">
                <HealthRow label="System Status" value="Online" />
                <HealthRow label="Database" value="Healthy" />
                <HealthRow label="Role-Based Access" value="Enabled" />
                <HealthRow label="Active Users" value={users.length} />
              </div>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">By Category</h2>
              <AdminRows data={reports.byCategory} color="bg-blue-600" />
            </section>
            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">By Office</h2>
              <AdminRows data={reports.byOffice} color="bg-violet-700" />
            </section>
            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">Recent System Activities</h2>
              <div className="mt-3 space-y-2">
                {reports.auditLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-900">{log.action}</p>
                    <p className="mt-1 text-xs text-slate-500">{log.actor} - {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-950">Reports & Analytics</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <ReportLink to="/admin/reports" label="Complaint Performance" />
              <ReportLink to="/admin/reports" label="Office Performance" />
              <ReportLink to="/admin/categories" label="SLA Compliance" />
              <ReportLink to="/admin/reports" label="Citizen Satisfaction" />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

const emptyUser = { fullName: '', email: '', phone: '', password: '', role: 'citizen', district: '', officeId: '' };

export const AdminUsers = () => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => endpoints.users().then(setUsers);
  useEffect(() => {
    load();
    endpoints.complaintMeta().then((meta) => setOffices(meta.offices || []));
  }, []);

  const updateUser = async (id, patch) => {
    setBusyId(id);
    try {
      const updated = await endpoints.updateUser(id, patch);
      setUsers((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      toast.success('User updated.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update user'));
    } finally {
      setBusyId(null);
    }
  };

  // A staff account with no office can open no cases, so promoting someone to staff
  // must carry an office with it.
  const changeRole = (user, role) => updateUser(user.id, {
    role,
    ...(role === 'staff' && !user.officeId ? { officeId: offices[0]?.id } : {})
  });

  const createUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await endpoints.createUser(form);
      setUsers((items) => [created, ...items]);
      setForm(emptyUser);
      toast.success(`${created.fullName} was added as ${created.role}.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create user'));
    } finally {
      setCreating(false);
    }
  };

  const removeUser = async (targetUser) => {
    if (!window.confirm(`Delete ${targetUser.fullName}? This cannot be undone.`)) return;
    setBusyId(targetUser.id);
    try {
      await endpoints.deleteUser(targetUser.id);
      setUsers((items) => items.filter((item) => item.id !== targetUser.id));
      toast.success(`${targetUser.fullName} was deleted.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete user'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminListPage title="Users & Roles" subtitle="Manage the three SCFCMS roles: Citizen, Administrative Staff, and Admin." icon={Users}>
      <form onSubmit={createUser} className="panel mb-6 grid gap-3 p-5 md:grid-cols-6">
        <Field label="Full name" value={form.fullName} onChange={(value) => setForm((f) => ({ ...f, fullName: value }))} />
        <Field label="Email" value={form.email} onChange={(value) => setForm((f) => ({ ...f, email: value }))} />
        <Field label="Phone" value={form.phone} onChange={(value) => setForm((f) => ({ ...f, phone: value }))} />
        <Field label="Password" type="password" value={form.password} onChange={(value) => setForm((f) => ({ ...f, password: value }))} />
        <label>
          <span className="label">Role</span>
          <select
            className="input"
            value={form.role}
            onChange={(event) => {
              const role = event.target.value;
              setForm((f) => ({ ...f, role, officeId: role === 'staff' ? (f.officeId || offices[0]?.id || '') : '' }));
            }}
          >
            <option value="citizen">Citizen</option>
            <option value="staff">Administrative Staff</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {form.role === 'staff' && (
          <label>
            <span className="label">Responsible office</span>
            <select className="input" value={form.officeId} onChange={(event) => setForm((f) => ({ ...f, officeId: Number(event.target.value) }))} required>
              <option value="">Select office</option>
              {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={creating}><PlusCircle size={16} />{creating ? 'Adding...' : 'Add User'}</button>
        </div>
      </form>
      <Table headers={['Name', 'Email', 'Role', 'Office', 'Location', 'Status', '']}>
        {users.map((user) => (
          <tr key={user.id}>
            <td className="px-4 py-3 font-semibold text-slate-900">{user.fullName}</td>
            <td className="px-4 py-3 text-slate-500">{user.email}</td>
            <td className="px-4 py-3">
              <select className="input min-w-44" value={user.role} disabled={busyId === user.id} onChange={(event) => changeRole(user, event.target.value)}>
                <option value="citizen">Citizen</option>
                <option value="staff">Administrative Staff</option>
                <option value="admin">Admin</option>
              </select>
            </td>
            <td className="px-4 py-3">
              {user.role === 'staff' ? (
                <select className="input min-w-48" value={user.officeId || ''} disabled={busyId === user.id} onChange={(event) => updateUser(user.id, { officeId: Number(event.target.value) })}>
                  {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                </select>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-slate-500">{user.district}</td>
            <td className="px-4 py-3">
              <select className="input min-w-32" value={user.status || 'active'} disabled={busyId === user.id} onChange={(event) => updateUser(user.id, { status: event.target.value })}>
                <option value="active">active</option>
                <option value="suspended">suspended</option>
                <option value="pending">pending</option>
              </select>
            </td>
            <td className="px-4 py-3">
              {user.id !== currentUser?.id && (
                <button className="grid h-8 w-8 place-items-center rounded-md border border-red-100 text-red-600 hover:bg-red-50" disabled={busyId === user.id} onClick={() => removeUser(user)} aria-label={`Delete ${user.fullName}`}>
                  <Trash2 size={15} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </AdminListPage>
  );
};

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  useEffect(() => { endpoints.complaintAuditLogs().then(setLogs); }, []);
  return (
    <AdminListPage title="Audit Logs" subtitle="Review complaint submissions, assignments, responses, escalations, closures, and citizen ratings." icon={FileText}>
      <Table headers={['Actor', 'Action', 'Date']}>
        {logs.map((log) => (
          <tr key={log.id}>
            <td className="px-4 py-3 font-semibold text-slate-900">{log.actor}</td>
            <td className="px-4 py-3 text-slate-600">{log.action}</td>
            <td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </Table>
    </AdminListPage>
  );
};

export const AdminSettings = () => (
  <AdminListPage title="System Security" subtitle="Ensure secure login, role-based access, complaint audit trail, and protected complaint records." icon={Settings}>
    <div className="grid gap-4 md:grid-cols-2">
      {[
        ['Secure Login and Logout', 'Only registered users can enter their role dashboard. JSON Web Tokens expire after 7 days.'],
        ['Role-Based Access', 'Citizen, Administrative Staff, and Admin each see only their required functions, enforced on both the interface and the API.'],
        ['Audit Logs', 'Important complaint, routing, escalation, and rating actions are recorded with actor, action, and timestamp.'],
        ['Data Protection', 'Complaint records use tracking numbers, ownership checks restrict citizen access to their own cases, and uploaded evidence is stored under a controlled path.']
      ].map(([title, text]) => (
        <article key={title} className="card p-4">
          <StatusBadge value="Enabled" />
          <h2 className="mt-3 font-bold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
        </article>
      ))}
    </div>
  </AdminListPage>
);

const AdminListPage = ({ title, subtitle, icon: Icon, children, actions = null }) => (
  <div>
    <PageHeader title={title} subtitle={subtitle} actions={actions} />
    {children}
  </div>
);

const Table = ({ headers, children }) => (
  <section className="panel overflow-x-auto">
    <table className="w-full min-w-[900px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </section>
);

const Field = ({ label, value, onChange, type = 'text' }) => (
  <label>
    <span className="label">{label}</span>
    <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const AdminStat = ({ label, value, color }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    <span className={`mt-3 block h-1.5 rounded-full ${color}`} />
  </div>
);

const AdminRows = ({ data = [], color = 'bg-violet-700' }) => {
  const max = Math.max(1, ...data.map((item) => Number(item.value || 0)));
  return (
    <div className="mt-3 space-y-3">
      {data.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">{item.name}</span>
            <span className="text-slate-500">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(8, (Number(item.value || 0) / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const HealthRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3">
    <span className="font-semibold text-slate-600">{label}</span>
    <span className="font-bold text-emerald-700">{value}</span>
  </div>
);

const ReportLink = ({ to, label }) => (
  <Link to={to} className="rounded-md border border-violet-100 bg-violet-50 px-3 py-2 text-center text-xs font-bold text-violet-700 hover:border-violet-300 hover:bg-violet-100">
    {label}
  </Link>
);
