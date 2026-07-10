import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileText, ListChecks, Paperclip, PlusCircle, Send, Star } from 'lucide-react';
import { API_ORIGIN, endpoints } from '../../api/client.js';
import { CategoryDonut } from '../../components/Charts.jsx';
import { LoadingState } from '../../components/LoadingState.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { StatCard } from '../../components/StatCard.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const defaultComplaint = {
  type: '',
  description: '',
  citizenPhone: '',
  province: 'Kigali City',
  district: 'Gasabo',
  sector: 'Kacyiru',
  cell: '',
  village: ''
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : 'Not set');

export const SubmitComplaint = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ ...defaultComplaint, citizenPhone: user?.phone || '' });
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [created, setCreated] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { endpoints.complaintMeta().then(setMeta); }, []);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const location = [form.sector, form.district, form.province].filter(Boolean).join(', ');
      let complaint;
      if (file) {
        const formData = new FormData();
        Object.entries({ ...form, location }).forEach(([key, value]) => formData.append(key, value));
        formData.append('attachment', file);
        complaint = await endpoints.createComplaint(formData);
      } else {
        complaint = await endpoints.createComplaint({ ...form, location });
      }
      setCreated(complaint);
      setForm({ ...defaultComplaint, citizenPhone: user?.phone || '' });
      setFile(null);
      toast.success(`Complaint submitted. Tracking number ${complaint.trackingNumber}.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not submit complaint'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Submit Complaint" subtitle="Record a complaint or citizen feedback and receive a tracking number immediately." />
      {created && (
        <section className="panel mb-6 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Tracking number</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">{created.trackingNumber}</h2>
              <p className="mt-2 text-sm text-slate-600">Automatically routed to {created.assignedOffice} and assigned to {created.assignedTo}.</p>
            </div>
            <Link to={`/app/complaints/${created.trackingNumber}`} className="btn-primary">
              <FileText size={16} />
              View Case
            </Link>
          </div>
        </section>
      )}
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="panel p-6">
          <div className="grid gap-4">
            <label>
              <span className="label">Complaint Type</span>
              <select className="input" value={form.type} onChange={(event) => update('type', event.target.value)} required>
                <option value="">Select type</option>
                {meta?.categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Description</span>
              <textarea className="input min-h-36" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Explain what happened, when it happened, and what help you expect." required />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Province" value={form.province} onChange={(value) => update('province', value)} />
              <Field label="District" value={form.district} onChange={(value) => update('district', value)} />
              <Field label="Sector" value={form.sector} onChange={(value) => update('sector', value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Cell" value={form.cell} onChange={(value) => update('cell', value)} />
              <Field label="Village" value={form.village} onChange={(value) => update('village', value)} />
              <Field label="Phone" value={form.citizenPhone} onChange={(value) => update('citizenPhone', value)} />
            </div>
            <label>
              <span className="label">Attachment (optional)</span>
              <input
                className="input"
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              {file && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Paperclip size={13} />{file.name}</p>}
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="btn-primary" disabled={saving}>
              <Send size={16} />
              {saving ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </section>
        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="font-bold text-slate-950">Automatic Routing Preview</h2>
            <div className="mt-4 space-y-3">
              {meta?.categories.map((category) => {
                const rule = meta.routingRules.find((item) => item.categoryId === category.id);
                const office = meta.offices.find((item) => item.id === rule?.officeId);
                return (
                  <div key={category.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-800">{category.name}</p>
                      <StatusBadge value={rule?.priority || category.defaultPriority} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{office?.name} · SLA {rule?.slaDays || category.slaDays} days</p>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
};

export const MyComplaints = () => {
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [rating, setRating] = useState({ score: 5, comment: '' });
  const [savingId, setSavingId] = useState(null);
  useEffect(() => { endpoints.myComplaints().then(setComplaints); }, []);

  const rate = async (trackingNumber) => {
    setSavingId(trackingNumber);
    try {
      const updated = await endpoints.rateComplaint(trackingNumber, rating);
      setComplaints((items) => items.map((item) => (item.trackingNumber === trackingNumber ? updated : item)));
      setRating({ score: 5, comment: '' });
      toast.success('Thank you, your rating was saved.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save rating'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="My Complaints" subtitle="Track submitted cases, offices responsible, responses, and satisfaction rating." />
      <div className="space-y-4">
        {complaints.map((complaint) => (
          <article key={complaint.trackingNumber} className="card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={complaint.status} />
                  <StatusBadge value={complaint.priority} />
                </div>
                <Link to={`/app/complaints/${complaint.trackingNumber}`} className="mt-3 block text-lg font-bold text-slate-950 hover:text-brand-600">{complaint.trackingNumber}</Link>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{complaint.description}</p>
                <p className="mt-3 text-sm text-slate-500">Assigned to {complaint.assignedOffice} · Due {complaint.dueDate}</p>
              </div>
              {['Resolved', 'Closed'].includes(complaint.status) && !complaint.satisfaction && (
                <div className="w-full rounded-md border border-slate-200 p-3 lg:w-72">
                  <p className="text-sm font-bold text-slate-900">Rate resolution</p>
                  <select className="input mt-2" value={rating.score} onChange={(event) => setRating({ ...rating, score: Number(event.target.value) })}>
                    {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                  </select>
                  <textarea className="input mt-2 min-h-20" value={rating.comment} onChange={(event) => setRating({ ...rating, comment: event.target.value })} placeholder="Comment" />
                  <button className="btn-primary mt-2 w-full" disabled={savingId === complaint.trackingNumber} onClick={() => rate(complaint.trackingNumber)}>
                    <Star size={16} />
                    {savingId === complaint.trackingNumber ? 'Saving...' : 'Save Rating'}
                  </button>
                </div>
              )}
              {complaint.satisfaction && <StatusBadge value={`${complaint.satisfaction.score} star rating`} />}
            </div>
          </article>
        ))}
        {complaints.length === 0 && <p className="text-sm text-slate-500">You have not submitted any complaints yet.</p>}
      </div>
    </div>
  );
};

export const ComplaintDetails = () => {
  const { trackingNumber } = useParams();
  const [complaint, setComplaint] = useState(null);
  const toast = useToast();
  useEffect(() => {
    endpoints.complaint(trackingNumber).then(setComplaint).catch((err) => toast.error(errorMessage(err, 'Could not load complaint')));
  }, [trackingNumber]);

  if (!complaint) return <LoadingState />;

  return (
    <div>
      <PageHeader title={complaint.trackingNumber} subtitle="Complaint details, routing, responses, and status history." />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="panel p-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={complaint.status} />
            <StatusBadge value={complaint.priority} />
            <StatusBadge value={complaint.type} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-950">Complaint Description</h2>
          <p className="mt-3 leading-7 text-slate-600">{complaint.description}</p>
          <h2 className="mt-6 text-base font-bold text-slate-950">Response Timeline</h2>
          <div className="mt-4 space-y-3">
            {complaint.responses.map((response) => (
              <div key={response.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">{response.responder}</p>
                  <StatusBadge value={response.statusUpdate} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{response.responseText}</p>
                <p className="mt-2 text-xs font-semibold text-slate-400">{formatDate(response.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
        <aside className="panel p-5">
          <h2 className="font-bold text-slate-950">Routing Information</h2>
          <Info label="Assigned Office" value={complaint.assignedOffice} />
          <Info label="Assigned Officer" value={complaint.assignedTo} />
          <Info label="Location" value={complaint.location} />
          <Info label="Cell / Village" value={[complaint.cell, complaint.village].filter(Boolean).join(' / ') || 'Not provided'} />
          <Info label="Submitted" value={formatDate(complaint.createdAt)} />
          <Info label="Due Date" value={complaint.dueDate} />
          {complaint.attachmentPath ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Attachment</p>
              <a
                href={`${API_ORIGIN}${complaint.attachmentPath}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
              >
                <Paperclip size={14} />
                {complaint.attachmentName || 'View attachment'}
              </a>
            </div>
          ) : (
            <Info label="Attachment" value="No attachment" />
          )}
          {complaint.satisfaction && <Info label="Citizen Rating" value={`${complaint.satisfaction.score}/5 - ${complaint.satisfaction.comment}`} />}
        </aside>
      </div>
    </div>
  );
};

export const ComplaintOfficerDashboard = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([endpoints.complaintReports(), endpoints.complaints()]).then(([reports, complaints]) => {
      setData({ reports, complaints });
    });
  }, []);
  if (!data) return <LoadingState />;

  const { reports, complaints } = data;
  const today = new Date().toISOString().slice(0, 10);
  const active = complaints.filter((item) => !['Resolved', 'Closed'].includes(item.status));
  const inProgress = complaints.filter((item) => ['Assigned', 'In Review', 'Waiting for Citizen'].includes(item.status));
  const resolved = complaints.filter((item) => ['Resolved', 'Closed'].includes(item.status));
  const overdue = active.filter((item) => item.dueDate < today);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-700 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Administrative Staff Dashboard</p>
            <h1 className="text-xl font-bold">Receive, review, classify, respond, escalate, and prepare reports</h1>
          </div>
          <Link to="/staff/cases" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-emerald-700">
            <ListChecks size={16} />
            View Assigned Cases
          </Link>
        </div>

        <div className="grid gap-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StaffStat label="Assigned to Me" value={active.length} color="bg-blue-600" />
            <StaffStat label="In Progress" value={inProgress.length} color="bg-amber-500" />
            <StaffStat label="Resolved" value={resolved.length} color="bg-emerald-600" />
            <StaffStat label="Overdue" value={overdue.length} color="bg-red-600" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
            <section className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-950">My Assigned Cases</h2>
                <Link to="/staff/cases" className="text-xs font-bold text-emerald-700">View all</Link>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Tracking No.</th>
                      <th className="py-2 pr-3">Complaint Title</th>
                      <th className="py-2 pr-3">Priority</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {complaints.slice(0, 6).map((complaint) => (
                      <tr key={complaint.trackingNumber}>
                        <td className="py-2 pr-3 font-semibold text-slate-900">
                          <Link to={`/staff/cases/${complaint.trackingNumber}`} className="hover:text-emerald-700">{complaint.trackingNumber}</Link>
                        </td>
                        <td className="max-w-[260px] truncate py-2 pr-3 text-slate-600">{complaint.description}</td>
                        <td className="py-2 pr-3"><StatusBadge value={complaint.priority} /></td>
                        <td className="py-2 pr-3"><StatusBadge value={complaint.status} /></td>
                        <td className="py-2 pr-3 text-slate-500">{complaint.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">Case Status Distribution</h2>
              <SimpleRows data={reports.byStatus} color="bg-emerald-600" />
            </section>
          </div>

          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-950">Case Processing Flow</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {[
                '5. Review case and update status',
                '6. Respond or request more information',
                '7. Escalate unresolved or overdue case',
                '8. Resolve, close and notify citizen',
                '9. Citizen rates; managers view reports'
              ].map((step) => (
                <div key={step} className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-center text-xs font-semibold leading-5 text-slate-700">
                  {step}
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">Upcoming Deadlines</h2>
              <div className="mt-3 space-y-2">
                {active.slice(0, 4).map((complaint) => (
                  <div key={complaint.trackingNumber} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-xs">
                    <span className="font-bold text-slate-900">{complaint.trackingNumber}</span>
                    <span className="text-slate-500">{complaint.dueDate}</span>
                    <StatusBadge value={complaint.priority} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">Quick Actions</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <StaffAction to="/staff/cases" label="Update Status" />
                <StaffAction to="/staff/respond" label="Request Info" />
                <StaffAction to="/staff/respond" label="Respond to Citizen" />
                <StaffAction to="/staff/escalations" label="Escalate Case" />
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
};

export const AssignedCases = () => {
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [meta, setMeta] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  useEffect(() => {
    Promise.all([endpoints.complaints(), endpoints.complaintMeta()]).then(([complaintData, metaData]) => {
      setComplaints(complaintData);
      setMeta(metaData);
    });
  }, []);

  const updateDraft = (trackingNumber, patch) => setDrafts((current) => ({
    ...current,
    [trackingNumber]: { status: 'In Review', responseText: '', ...(current[trackingNumber] || {}), ...patch }
  }));

  const updateStatus = async (trackingNumber) => {
    const payload = drafts[trackingNumber] || { status: 'In Review', responseText: 'Case reviewed by responsible office.' };
    setBusyId(trackingNumber);
    try {
      const updated = await endpoints.updateComplaintStatus(trackingNumber, payload);
      setComplaints((items) => items.map((item) => (item.trackingNumber === trackingNumber ? updated : item)));
      toast.success(`${trackingNumber} updated to ${updated.status}.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update complaint'));
    } finally {
      setBusyId(null);
    }
  };

  const escalate = async (trackingNumber) => {
    setBusyId(trackingNumber);
    try {
      const updated = await endpoints.escalateComplaint(trackingNumber, { reason: 'Escalated because the case needs senior administrative follow-up.' });
      setComplaints((items) => items.map((item) => (item.trackingNumber === trackingNumber ? updated : item)));
      toast.success(`${trackingNumber} escalated.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not escalate complaint'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Administrative Staff Cases" subtitle="Review complaints, classify and assign cases, respond or update citizens, and escalate unresolved matters." />
      <div className="space-y-4">
        {complaints.map((complaint) => (
          <article key={complaint.trackingNumber} className="card p-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={complaint.status} />
                  <StatusBadge value={complaint.priority} />
                  <StatusBadge value={complaint.type} />
                </div>
                <h2 className="mt-3 text-lg font-bold text-slate-950">{complaint.trackingNumber}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{complaint.description}</p>
                <p className="mt-3 text-sm text-slate-500">{complaint.assignedOffice} · {complaint.assignedTo} · Due {complaint.dueDate}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <label>
                  <span className="label">Responsible office</span>
                  <select className="input" value={drafts[complaint.trackingNumber]?.assignedOfficeId || complaint.assignedOfficeId || ''} onChange={(event) => updateDraft(complaint.trackingNumber, { assignedOfficeId: event.target.value })}>
                    {meta?.offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                  </select>
                </label>
                <label className="mt-2 block">
                  <span className="label">Status update</span>
                  <select className="input" value={drafts[complaint.trackingNumber]?.status || complaint.status} onChange={(event) => updateDraft(complaint.trackingNumber, { status: event.target.value })}>
                    {['In Review', 'Waiting for Citizen', 'Resolved', 'Closed'].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
                <textarea className="input mt-2 min-h-24" value={drafts[complaint.trackingNumber]?.responseText || ''} onChange={(event) => updateDraft(complaint.trackingNumber, { responseText: event.target.value })} placeholder="Official response to citizen" />
                <div className="mt-2 flex gap-2">
                  <button className="btn-primary flex-1" disabled={busyId === complaint.trackingNumber} onClick={() => updateStatus(complaint.trackingNumber)}><CheckCircle2 size={16} />Save</button>
                  <button className="btn-secondary flex-1 text-amber-700" disabled={busyId === complaint.trackingNumber} onClick={() => escalate(complaint.trackingNumber)}><AlertTriangle size={16} />Escalate</button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {complaints.length === 0 && <p className="text-sm text-slate-500">No complaints have been assigned yet.</p>}
      </div>
    </div>
  );
};

export const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  useEffect(() => { endpoints.complaints().then(setComplaints); }, []);
  return (
    <div>
      <PageHeader title="Complaint Register" subtitle="Central case register showing tracking numbers, routing, offices, priorities, and status." />
      <ComplaintTable complaints={complaints} base="/admin/complaints" />
    </div>
  );
};

export const AdminComplaintReports = () => {
  const [reports, setReports] = useState(null);
  useEffect(() => { endpoints.complaintReports().then(setReports); }, []);
  if (!reports) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Complaint Reports" subtitle="Management dashboard for categories, offices, status, response control, escalation, and satisfaction." />
      <ComplaintStats summary={reports.summary} />
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="panel p-5"><h2 className="mb-4 font-bold text-slate-950">By Status</h2><CategoryDonut data={reports.byStatus} /></section>
        <section className="panel p-5"><h2 className="mb-4 font-bold text-slate-950">By Category</h2><CategoryDonut data={reports.byCategory} /></section>
        <section className="panel p-5"><h2 className="mb-4 font-bold text-slate-950">By Office</h2><CategoryDonut data={reports.byOffice} /></section>
      </div>
      <section className="panel mt-6 p-5">
        <h2 className="mb-4 font-bold text-slate-950">Recent Audit Logs</h2>
        <div className="space-y-3">
          {reports.auditLogs.map((log) => (
            <div key={log.id} className="rounded-md border border-slate-200 p-3">
              <p className="text-sm font-bold text-slate-900">{log.action}</p>
              <p className="text-xs text-slate-500">{log.actor} · {formatDate(log.createdAt)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const useRoutingDrafts = (meta) => {
  const [drafts, setDrafts] = useState({});
  const ruleValue = (rule, field) => drafts[rule.id]?.[field] ?? rule[field];
  const setField = (ruleId, field, value) => setDrafts((current) => ({ ...current, [ruleId]: { ...current[ruleId], [field]: value } }));
  const isDirty = (rule) => Boolean(drafts[rule.id]);
  const clear = (ruleId) => setDrafts((current) => {
    const next = { ...current };
    delete next[ruleId];
    return next;
  });
  return { ruleValue, setField, isDirty, clear };
};

export const AdminRoutingRules = () => {
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [creatingRule, setCreatingRule] = useState(false);
  const [newRule, setNewRule] = useState({ categoryId: '', officeId: '', location: 'Kacyiru', priority: 'Medium', slaDays: 3 });
  const { ruleValue, setField, isDirty, clear } = useRoutingDrafts(meta);
  useEffect(() => {
    endpoints.complaintMeta().then((data) => {
      setMeta(data);
      setNewRule((current) => ({
        ...current,
        categoryId: current.categoryId || data.categories[0]?.id || '',
        officeId: current.officeId || data.offices[0]?.id || ''
      }));
    });
  }, []);

  const updateNewRule = (field, value) => setNewRule((current) => ({ ...current, [field]: value }));

  const createRule = async (event) => {
    event.preventDefault();
    if (!newRule.categoryId || !newRule.officeId) return;
    setCreatingRule(true);
    try {
      const result = await endpoints.createRoutingRule({
        categoryId: Number(newRule.categoryId),
        officeId: Number(newRule.officeId),
        location: newRule.location || 'Kacyiru',
        priority: newRule.priority,
        slaDays: Number(newRule.slaDays || 3)
      });
      setMeta((current) => ({ ...current, routingRules: result.routingRules }));
      setNewRule((current) => ({ ...current, location: 'Kacyiru', priority: 'Medium', slaDays: 3 }));
      toast.success('Routing rule added.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add routing rule'));
    } finally {
      setCreatingRule(false);
    }
  };

  const saveRule = async (rule) => {
    setSavingId(rule.id);
    try {
      const patch = {
        officeId: ruleValue(rule, 'officeId'),
        priority: ruleValue(rule, 'priority'),
        slaDays: ruleValue(rule, 'slaDays')
      };
      const result = await endpoints.updateRoutingRule(rule.id, patch);
      setMeta((current) => ({ ...current, routingRules: result.routingRules }));
      clear(rule.id);
      toast.success('Routing rule updated.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update routing rule'));
    } finally {
      setSavingId(null);
    }
  };

  if (!meta) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Routing Rules" subtitle="Map complaint types and locations to the responsible administrative office." />
      <form onSubmit={createRule} className="panel mb-6 grid gap-3 p-5 md:grid-cols-[1.2fr_1.2fr_0.9fr_0.8fr_0.6fr_auto]">
        <label>
          <span className="label">Complaint type</span>
          <select className="input" value={newRule.categoryId} onChange={(event) => updateNewRule('categoryId', event.target.value)} required>
            {meta.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Responsible office</span>
          <select className="input" value={newRule.officeId} onChange={(event) => updateNewRule('officeId', event.target.value)} required>
            {meta.offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
          </select>
        </label>
        <Field label="Location" value={newRule.location} onChange={(value) => updateNewRule('location', value)} />
        <label>
          <span className="label">Priority</span>
          <select className="input" value={newRule.priority} onChange={(event) => updateNewRule('priority', event.target.value)}>
            {['Low', 'Medium', 'High', 'Critical'].map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </label>
        <label>
          <span className="label">SLA days</span>
          <input className="input" type="number" min="1" value={newRule.slaDays} onChange={(event) => updateNewRule('slaDays', Number(event.target.value))} />
        </label>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={creatingRule}><PlusCircle size={16} />{creatingRule ? 'Adding...' : 'Add Rule'}</button>
        </div>
      </form>
      <section className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Complaint Type</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Office</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">SLA</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {meta.routingRules.map((rule) => {
              const complaintType = meta.categories.find((item) => item.id === rule.categoryId);
              return (
                <tr key={rule.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{complaintType?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{rule.location}</td>
                  <td className="px-4 py-3">
                    <select className="input" value={ruleValue(rule, 'officeId')} onChange={(event) => setField(rule.id, 'officeId', event.target.value)}>
                      {meta.offices.map((officeItem) => <option key={officeItem.id} value={officeItem.id}>{officeItem.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className="input" value={ruleValue(rule, 'priority')} onChange={(event) => setField(rule.id, 'priority', event.target.value)}>
                      {['Low', 'Medium', 'High', 'Critical'].map((priority) => <option key={priority}>{priority}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input className="input w-24" type="number" min="1" value={ruleValue(rule, 'slaDays')} onChange={(event) => setField(rule.id, 'slaDays', Number(event.target.value))} />
                  </td>
                  <td className="px-4 py-3">
                    {isDirty(rule) && (
                      <button className="btn-primary" disabled={savingId === rule.id} onClick={() => saveRule(rule)}>
                        {savingId === rule.id ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export const ComplaintTypeManagement = () => {
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', defaultPriority: 'Medium', slaDays: 3 });
  const [creating, setCreating] = useState(false);
  const { ruleValue, setField, isDirty, clear } = useRoutingDrafts(meta);
  useEffect(() => { endpoints.complaintMeta().then(setMeta); }, []);

  const saveRule = async (rule) => {
    setSavingId(rule.id);
    try {
      const patch = {
        officeId: ruleValue(rule, 'officeId'),
        priority: ruleValue(rule, 'priority'),
        slaDays: ruleValue(rule, 'slaDays')
      };
      const result = await endpoints.updateRoutingRule(rule.id, patch);
      setMeta((current) => ({ ...current, routingRules: result.routingRules }));
      clear(rule.id);
      toast.success('Category routing updated.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update category'));
    } finally {
      setSavingId(null);
    }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    if (!newCategory.name.trim()) return;
    setCreating(true);
    try {
      const category = await endpoints.createComplaintCategory(newCategory);
      setMeta((current) => ({ ...current, categories: [...current.categories, category] }));
      setNewCategory({ name: '', description: '', defaultPriority: 'Medium', slaDays: 3 });
      toast.success(`Category "${category.name}" created. Add a routing rule for it in Routing Rules.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create category'));
    } finally {
      setCreating(false);
    }
  };

  if (!meta) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Categories & SLA" subtitle="Manage complaint categories, responsible office, priority, and response deadline control." />
      <form onSubmit={createCategory} className="panel mb-6 grid gap-3 p-5 md:grid-cols-[1.2fr_1.6fr_0.8fr_0.6fr_auto]">
        <Field label="New category name" value={newCategory.name} onChange={(value) => setNewCategory((c) => ({ ...c, name: value }))} placeholder="Example: Noise Complaint" />
        <Field label="Description" value={newCategory.description} onChange={(value) => setNewCategory((c) => ({ ...c, description: value }))} placeholder="Short description" />
        <label>
          <span className="label">Default priority</span>
          <select className="input" value={newCategory.defaultPriority} onChange={(event) => setNewCategory((c) => ({ ...c, defaultPriority: event.target.value }))}>
            {['Low', 'Medium', 'High', 'Critical'].map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </label>
        <label>
          <span className="label">SLA days</span>
          <input className="input" type="number" min="1" value={newCategory.slaDays} onChange={(event) => setNewCategory((c) => ({ ...c, slaDays: Number(event.target.value) }))} />
        </label>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={creating}><PlusCircle size={16} />{creating ? 'Adding...' : 'Add'}</button>
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {meta.categories.map((category) => {
          const rule = meta.routingRules.find((item) => item.categoryId === category.id);
          return (
            <article key={category.id} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-slate-950">{category.name}</h2>
                <StatusBadge value={rule?.priority || category.defaultPriority} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{category.description}</p>
              {rule ? (
                <div className="mt-4 grid gap-3">
                  <label>
                    <span className="label">Responsible office</span>
                    <select className="input" value={ruleValue(rule, 'officeId')} onChange={(event) => setField(rule.id, 'officeId', event.target.value)}>
                      {meta.offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                    </select>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="label">Priority</span>
                      <select className="input" value={ruleValue(rule, 'priority')} onChange={(event) => setField(rule.id, 'priority', event.target.value)}>
                        {['Low', 'Medium', 'High', 'Critical'].map((priority) => <option key={priority}>{priority}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="label">SLA days</span>
                      <input className="input" type="number" min="1" value={ruleValue(rule, 'slaDays')} onChange={(event) => setField(rule.id, 'slaDays', Number(event.target.value))} />
                    </label>
                  </div>
                  {isDirty(rule) && (
                    <button className="btn-primary" disabled={savingId === rule.id} onClick={() => saveRule(rule)}>
                      {savingId === rule.id ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-xs font-semibold text-amber-600">No routing rule yet - add one in Complaint Routing.</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export const ComplaintNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => { endpoints.complaintNotifications().then(setNotifications); }, []);

  const markRead = async (notification) => {
    if (notification.read) return;
    await endpoints.readNotification(notification.dbId).catch(() => {});
    setNotifications((items) => items.map((item) => (item.id === notification.id ? { ...item, read: true } : item)));
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Complaint submission, assignment, response, escalation, and closure updates." />
      <div className="space-y-3">
        {notifications.map((notification) => (
          <article key={notification.id} className="card cursor-pointer p-4" onClick={() => markRead(notification)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-950">{notification.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
              </div>
              <StatusBadge value={notification.read ? 'Read' : 'Unread'} />
            </div>
          </article>
        ))}
        {notifications.length === 0 && <p className="text-sm text-slate-500">No notifications yet.</p>}
      </div>
    </div>
  );
};

const ComplaintStats = ({ summary }) => (
  <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
    <StatCard label="Total" value={summary.totalComplaints} icon={FileText} />
    <StatCard label="Open" value={summary.openComplaints} icon={ListChecks} tone="amber" />
    <StatCard label="Escalated" value={summary.escalated} icon={AlertTriangle} tone="rose" />
    <StatCard label="Resolved" value={summary.resolved} icon={CheckCircle2} tone="emerald" />
    <StatCard label="Overdue" value={summary.overdue} icon={AlertTriangle} tone="violet" />
    <StatCard label="Avg Rating" value={summary.averageSatisfaction} icon={Star} tone="blue" />
  </div>
);

const ComplaintTable = ({ complaints = [], base = '/app/complaints' }) => (
  <section className="panel overflow-hidden">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr><th className="px-4 py-3">Tracking</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Office</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {complaints.map((complaint) => (
          <tr key={complaint.trackingNumber}>
            <td className="px-4 py-3 font-semibold text-slate-900"><Link to={`${base}/${complaint.trackingNumber}`} className="hover:text-brand-600">{complaint.trackingNumber}</Link></td>
            <td className="px-4 py-3"><StatusBadge value={complaint.type} /></td>
            <td className="px-4 py-3 text-slate-500">{complaint.assignedOffice}</td>
            <td className="px-4 py-3"><StatusBadge value={complaint.status} /></td>
            <td className="px-4 py-3 text-slate-500">{complaint.dueDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const Field = ({ label, value, onChange, placeholder = '' }) => (
  <label>
    <span className="label">{label}</span>
    <input className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
  </label>
);

const Info = ({ label, value }) => (
  <div className="mt-4">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
  </div>
);

const StaffStat = ({ label, value, color }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    <span className={`mt-3 block h-1.5 rounded-full ${color}`} />
  </div>
);

const SimpleRows = ({ data = [], color = 'bg-brand-600' }) => {
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

const StaffAction = ({ to, label }) => (
  <Link to={to} className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100">
    {label}
  </Link>
);
