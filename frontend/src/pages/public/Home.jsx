import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle2, ClipboardList, ShieldCheck, Users } from 'lucide-react';
import { endpoints } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.jsx';

const roles = [
  {
    title: 'Citizens',
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
    items: ['Register and log in', 'Submit complaints and feedback', 'Track status', 'Receive responses', 'Rate resolution']
  },
  {
    title: 'Administrative Staff',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    items: ['Receive and review cases', 'Classify and assign complaints', 'Respond/update', 'Escalate issues', 'Prepare reports']
  },
  {
    title: 'Admin',
    tone: 'border-violet-200 bg-violet-50 text-violet-700',
    items: ['Secure login and logout', 'Manage users and roles', 'Manage categories and SLAs', 'Ensure system security', 'Monitor analytics']
  }
];

const routingSteps = [
  'Citizen submits complaint or feedback',
  'System records case and tracking number',
  'System checks complaint type, location and priority',
  'System assigns case to responsible office',
  'Officer reviews case and updates status',
  'Officer responds or requests more information',
  'Unresolved or overdue case is escalated',
  'Case is resolved, closed and citizen notified',
  'Citizen rates response; managers view reports'
];

export const Home = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    endpoints.publicSummary().then(setSummary).catch(() => setSummary({ totalComplaints: 0, resolved: 0, escalated: 0, averageSatisfaction: 0 }));
  }, []);

  if (!summary) {
    return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><LoadingState /></div>;
  }

  return (
    <div>
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid min-h-[520px] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
              <ShieldCheck size={15} />
              Smart Citizen Feedback and Complaint Management System
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl">
              Submit, route, resolve, and report citizen complaints in one simple system.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              SCFCMS follows the academic model for citizens, administrative staff, and admins with automatic routing, tracking, escalation, response, closure, and citizen satisfaction rating.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login" className="btn-primary">
                Open Dashboard
                <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="btn-secondary">Register Citizen</Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-soft">
            <h2 className="text-base font-bold text-slate-950">Live Complaint Summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <HomeStat label="Total Complaints" value={summary.totalComplaints} icon={ClipboardList} />
              <HomeStat label="Resolved" value={summary.resolved} icon={CheckCircle2} />
              <HomeStat label="Escalated" value={summary.escalated} icon={ShieldCheck} />
              <HomeStat label="Average Rating" value={`${summary.averageSatisfaction}/5`} icon={BarChart3} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {roles.map((role) => (
            <article key={role.title} className={`rounded-lg border p-5 ${role.tone}`}>
              <div className="flex items-center gap-2">
                <Users size={18} />
                <h2 className="text-lg font-bold">{role.title}</h2>
              </div>
              <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
                {role.items.map((item) => <li key={item}>- {item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-slate-950">Complaint Routing Model</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-9">
            {routingSteps.map((step, index) => (
              <div key={step} className="rounded-md border border-slate-200 bg-white p-3 text-center shadow-sm">
                <p className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">{index + 1}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const HomeStat = ({ label, value, icon: Icon }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <Icon className="text-blue-600" size={18} />
    </div>
    <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
  </div>
);
