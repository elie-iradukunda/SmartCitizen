import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { endpoints } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.jsx';
import { Badge, Bar, Empty, PageTitle, Stat, formatDateTime } from '../../components/Ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';

/* ══════════════ OVERVIEW ══════════════ */

export const AdminDashboard = () => {
  const toast = useToast();
  const [reports, setReports] = useState(null);
  const [running, setRunning] = useState(false);

  const load = () => endpoints.complaintReports().then(setReports).catch(() => setReports(null));
  useEffect(() => { load(); }, []);

  if (!reports) return <LoadingState />;

  const { summary, byCategory, byStatus } = reports;
  const totalByCategory = byCategory.reduce((sum, item) => sum + item.value, 0);
  const totalByStatus = byStatus.reduce((sum, item) => sum + item.value, 0);
  const complaintFilterUrl = (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'all') search.set(key, value);
    });
    const query = search.toString();
    return query ? `/admin/complaints?${query}` : '/admin/complaints';
  };

  const runSlaCheck = async () => {
    setRunning(true);
    try {
      const result = await endpoints.runSlaCheck();
      toast.success(result.escalated
        ? `${result.escalated} complaint(s) passed their due date and were escalated automatically.`
        : 'No complaint has passed its due date.');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not run the SLA check'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle title="Admin · Kacyiru Sector" subtitle="Every complaint in the sector, the rules that route them, and who can do what." />

      <div className="stats">
        <Link className="stat-link" to={complaintFilterUrl()}><Stat label="All complaints" value={summary.totalComplaints} /></Link>
        <Link className="stat-link" to={complaintFilterUrl({ statusGroup: 'resolved' })}><Stat label="Resolved / closed" value={summary.resolved} /></Link>
        <Link className="stat-link" to={complaintFilterUrl({ overdue: 'true' })}><Stat label="Past due date" value={summary.overdue} danger /></Link>
        <Link className="stat-link" to={complaintFilterUrl({ status: 'Escalated' })}><Stat label="Escalated" value={summary.escalated} /></Link>
        <Link className="stat-link" to="/admin/reports"><Stat label="Average rating" value={summary.averageSatisfaction || '—'} /></Link>
      </div>

      <div className="grid g2">
        <div className="card">
          <p className="card-t">Complaints by category</p>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byCategory.map((item) => (
              <Link className="bar-link" key={item.name} to={complaintFilterUrl({ categoryId: item.id })}>
                <Bar label={item.name} value={item.value} total={totalByCategory} />
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="card-t">Complaints by status</p>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {byStatus.length === 0
              ? <small className="hint">No complaints yet.</small>
              : byStatus.map((item) => (
                <Link className="bar-link" key={item.name} to={complaintFilterUrl({ status: item.name })}>
                  <Bar label={item.name} value={item.value} total={totalByStatus} />
                </Link>
              ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <p className="card-t">Automatic escalation (SLA)</p>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
          Any complaint that passes its due date is escalated on its own to the Sector Executive Office, and the citizen is
          notified. In production this runs as a daily job; here you can run it now.
        </p>
        <button type="button" className="btn" style={{ marginTop: 14 }} disabled={running} onClick={runSlaCheck}>
          {running ? 'Checking…' : '▶ Run the SLA check now'}
        </button>
      </div>
    </div>
  );
};

/* ══════════════ CATEGORIES, SLA & ROUTING ══════════════ */

// One category = one office it is routed to = one SLA. They were three separate admin
// screens before; they are the same decision, so they are edited on one row here.
export const AdminSetup = () => {
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: '', officeId: '', slaDays: 3, defaultPriority: 'High' });
  const [adding, setAdding] = useState(false);

  const load = () => endpoints.complaintMeta().then((data) => {
    setMeta(data);
    setDrafts(Object.fromEntries(data.categories.map((category) => {
      const rule = data.routingRules.find((item) => item.categoryId === category.id);
      return [category.id, {
        officeId: rule?.officeId || '',
        ruleId: rule?.id || null,
        slaDays: category.slaDays,
        priority: rule?.priority || category.defaultPriority
      }];
    })));
  }).catch(() => setMeta(null));

  useEffect(() => { load(); }, []);

  if (!meta) return <LoadingState />;

  const setDraft = (categoryId, patch) => setDrafts((current) => ({
    ...current,
    [categoryId]: { ...current[categoryId], ...patch }
  }));

  const save = async (category) => {
    const draft = drafts[category.id];
    if (!draft.officeId) return toast.error('Choose the office this category is routed to.');
    setSavingId(category.id);
    try {
      await endpoints.updateComplaintCategory(category.id, {
        slaDays: Number(draft.slaDays),
        defaultPriority: draft.priority
      });
      if (draft.ruleId) {
        await endpoints.updateRoutingRule(draft.ruleId, {
          officeId: Number(draft.officeId),
          slaDays: Number(draft.slaDays),
          priority: draft.priority
        });
      } else {
        await endpoints.createRoutingRule({
          categoryId: category.id,
          officeId: Number(draft.officeId),
          slaDays: Number(draft.slaDays),
          priority: draft.priority
        });
      }
      toast.success(`${category.name} now goes to the office you chose, answered within ${draft.slaDays} days.`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the rule'));
    } finally {
      setSavingId(null);
    }
  };

  const addCategory = async () => {
    if (!newCategory.name.trim() || !newCategory.officeId) {
      return toast.error('A new category needs a name and the office it is routed to.');
    }
    setAdding(true);
    try {
      const category = await endpoints.createComplaintCategory({
        name: newCategory.name.trim(),
        slaDays: Number(newCategory.slaDays),
        defaultPriority: newCategory.defaultPriority
      });
      await endpoints.createRoutingRule({
        categoryId: category.id,
        officeId: Number(newCategory.officeId),
        slaDays: Number(newCategory.slaDays),
        priority: newCategory.defaultPriority
      });
      toast.success(`${category.name} was added and routed.`);
      setNewCategory({ name: '', officeId: '', slaDays: 3, defaultPriority: 'High' });
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add the category'));
    } finally {
      setAdding(false);
    }
  };

  const removeCategory = async (category) => {
    try {
      await endpoints.deleteComplaintCategory(category.id);
      toast.success(`${category.name} was deleted.`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete the category'));
    }
  };

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle
        title="Categories, SLA & routing"
        subtitle="Each category is routed to one office and answered within its own number of days. Edit all of it on one row."
      />

      <div className="card" style={{ marginTop: 18 }}>
        <div className="cfg-row head">
          <div>Category</div>
          <div>Routed to (office)</div>
          <div>SLA (days)</div>
          <div>Priority</div>
          <div />
        </div>

        {meta.categories.map((category) => {
          const draft = drafts[category.id] || {};
          return (
            <div className="cfg-row" key={category.id}>
              <div className="nm">{category.name}</div>
              <select
                className="input"
                value={draft.officeId || ''}
                onChange={(event) => setDraft(category.id, { officeId: event.target.value })}
              >
                <option value="">Choose an office</option>
                {meta.offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
              </select>
              <input
                className="input"
                type="number"
                min="1"
                value={draft.slaDays ?? ''}
                onChange={(event) => setDraft(category.id, { slaDays: event.target.value })}
              />
              <select
                className="input"
                value={draft.priority || 'Medium'}
                onChange={(event) => setDraft(category.id, { priority: event.target.value })}
              >
                {['Low', 'Medium', 'High', 'Critical'].map((item) => <option key={item}>{item}</option>)}
              </select>
              <div className="cfg-actions">
                <button type="button" className="btn sm" disabled={savingId === category.id} onClick={() => save(category)}>
                  {savingId === category.id ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn red sm" onClick={() => removeCategory(category)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <p className="card-t">Add a category</p>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 12 }}>
          <input
            className="input"
            placeholder="Category name"
            value={newCategory.name}
            onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
          />
          <select
            className="input"
            value={newCategory.officeId}
            onChange={(event) => setNewCategory({ ...newCategory, officeId: event.target.value })}
          >
            <option value="">Choose an office</option>
            {meta.offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
          </select>
          <input
            className="input"
            type="number"
            min="1"
            value={newCategory.slaDays}
            onChange={(event) => setNewCategory({ ...newCategory, slaDays: event.target.value })}
          />
          <select
            className="input"
            value={newCategory.defaultPriority}
            onChange={(event) => setNewCategory({ ...newCategory, defaultPriority: event.target.value })}
          >
            {['Low', 'Medium', 'High', 'Critical'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <button type="button" className="btn sm" style={{ marginTop: 12 }} disabled={adding} onClick={addCategory}>
          {adding ? 'Adding…' : '+ Add category'}
        </button>
      </div>
    </div>
  );
};

/* ══════════════ USERS & ROLES ══════════════ */

const emptyUser = { fullName: '', email: '', password: 'password', role: 'staff', officeId: '', phone: '', nationalId: '' };

export const AdminUsers = () => {
  const toast = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [offices, setOffices] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => endpoints.users().then(setUsers).catch(() => setUsers([]));
  useEffect(() => {
    load();
    endpoints.complaintMeta().then((meta) => setOffices(meta.offices)).catch(() => {});
  }, []);

  if (!users) return <LoadingState />;

  const add = async () => {
    if (!form.fullName.trim() || !form.email.trim()) return toast.error('A new user needs a name and an email.');
    if (form.role === 'staff' && !form.officeId) return toast.error('An Administrative Staff account must belong to an office.');
    if (form.role === 'citizen' && form.nationalId.length !== 16) return toast.error('The National ID must be 16 digits.');
    setSaving(true);
    try {
      await endpoints.createUser({
        ...form,
        officeId: form.role === 'staff' ? Number(form.officeId) : null
      });
      toast.success(`${form.fullName} can now log in.`);
      setForm(emptyUser);
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create the user'));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (user, status) => {
    try {
      await endpoints.updateUser(user.id, { status });
      toast.success(`${user.fullName} is now ${status}.`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the user'));
    }
  };

  const remove = async (user) => {
    try {
      await endpoints.deleteUser(user.id);
      toast.success(`${user.fullName} was deleted.`);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete the user'));
    }
  };

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle title="Users & roles" subtitle="Citizens submit, staff answer for one office, admins set the rules." />

      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <p className="card-t">Accounts</p>
          <button type="button" className="btn sm" onClick={() => setAddOpen((open) => !open)}>
            {addOpen ? 'Cancel' : '+ Add user'}
          </button>
        </div>

        {addOpen && (
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 14 }}>
            <input className="input" placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <input className="input" placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <input className="input" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value, officeId: '' })}>
              <option value="citizen">Citizen</option>
              <option value="staff">Administrative Staff</option>
              <option value="admin">Admin</option>
            </select>
            {/* A citizen account is tied to a real resident by their ID; staff and admin are
                office roles, so the field only appears where it is actually required. */}
            {form.role === 'citizen' && (
              <input
                className="input"
                inputMode="numeric"
                placeholder="National ID (16 digits)"
                value={form.nationalId}
                onChange={(event) => setForm({ ...form, nationalId: event.target.value.replace(/\D/g, '').slice(0, 16) })}
              />
            )}
            {form.role === 'staff' && (
              <select className="input" value={form.officeId} onChange={(event) => setForm({ ...form, officeId: event.target.value })}>
                <option value="">Choose an office</option>
                {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
              </select>
            )}
            <button type="button" className="btn sm" style={{ gridColumn: '1 / -1' }} disabled={saving} onClick={add}>
              {saving ? 'Saving…' : 'Save user'}
            </button>
          </div>
        )}

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Office</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>{user.fullName}</td>
                  <td style={{ fontSize: 12.5 }}>{user.email}</td>
                  <td><Badge value={user.role} /></td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{user.office?.name || '—'}</td>
                  <td><Badge value={user.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {user.id !== me?.id && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => setStatus(user, user.status === 'active' ? 'suspended' : 'active')}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                      {user.id !== me?.id && (
                        <button type="button" className="btn red sm" onClick={() => remove(user)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ══════════════ AUDIT LOG ══════════════ */

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState(null);

  useEffect(() => { endpoints.complaintAuditLogs().then(setLogs).catch(() => setLogs([])); }, []);

  if (!logs) return <LoadingState />;

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle title="Audit log" subtitle="Every action taken in the system, in order, with who did it." />
      {logs.length === 0
        ? <Empty title="Nothing has been recorded yet" subtitle="Actions appear here as soon as they happen." />
        : (
          <div className="card" style={{ marginTop: 18 }}>
            {logs.map((log) => (
              <div key={log.id} className="notif">
                <span className="notif-ico" aria-hidden="true">📝</span>
                <span>
                  <span style={{ fontSize: 14, fontWeight: 600, display: 'block' }}>{log.action}</span>
                  <small className="hint">{log.actor} · {formatDateTime(log.createdAt)}</small>
                </span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};
