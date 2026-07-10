import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, ClipboardList, Inbox, PlusCircle, Search, Send, Star } from 'lucide-react';
import { endpoints } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';

const routingSteps = [
  'Citizen submits complaint or feedback',
  'System records case and tracking number',
  'System checks type, location and priority',
  'System assigns case to responsible office',
  'Officer reviews case and updates status',
  'Officer responds or requests more information',
  'Unresolved or overdue case is escalated',
  'Case is resolved, closed and citizen notified',
  'Citizen rates response; managers view reports'
];

export const CitizenDashboard = () => {
  const [loaded, setLoaded] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [ratingScore, setRatingScore] = useState(5);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      endpoints.myComplaints(),
      endpoints.complaintNotifications()
    ]).then(([complaintData, notificationData]) => {
      setComplaints(complaintData);
      setNotifications(notificationData);
      setLoaded(true);
    });
  }, []);

  const overview = useMemo(() => {
    const inProgressStatuses = ['Assigned', 'In Review', 'Waiting for Citizen', 'Escalated'];
    return {
      total: complaints.length,
      inProgress: complaints.filter((item) => inProgressStatuses.includes(item.status)).length,
      resolved: complaints.filter((item) => ['Resolved', 'Closed'].includes(item.status)).length,
      closed: complaints.filter((item) => item.status === 'Closed').length
    };
  }, [complaints]);

  const unratedResolved = complaints.find((item) => ['Resolved', 'Closed'].includes(item.status) && !item.satisfaction);

  const trackComplaint = (event) => {
    event.preventDefault();
    const cleanTracking = trackingNumber.trim();
    if (cleanTracking) navigate(`/app/complaints/${cleanTracking}`);
  };

  const rateResolution = async () => {
    if (!unratedResolved) return;
    try {
      const updated = await endpoints.rateComplaint(unratedResolved.trackingNumber, {
        score: ratingScore,
        comment: 'Rated from citizen dashboard'
      });
      setComplaints((items) => items.map((item) => (item.trackingNumber === updated.trackingNumber ? updated : item)));
      toast.success('Thank you, your rating was saved.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save rating'));
    }
  };

  if (!loaded) return <LoadingState />;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-blue-200 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-blue-600 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Citizen Dashboard</p>
            <h1 className="text-xl font-bold">Submit complaints, track status, receive responses, and rate resolution</h1>
          </div>
          <Link to="/app/submit-complaint" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-blue-700">
            <PlusCircle size={16} />
            Submit Complaint
          </Link>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">Quick Actions</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <ActionCard to="/app/submit-complaint" icon={Send} label="Submit Complaint" />
                <ActionCard to="/app/complaints" icon={Search} label="Track Complaint" />
                <ActionCard to="/app/submit-complaint" icon={ClipboardList} label="Give Feedback" />
                <ActionCard to="/app/complaints" icon={Inbox} label="My History" />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">My Complaints Overview</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <MiniStat label="Total Submitted" value={overview.total} color="bg-blue-600" />
                <MiniStat label="In Progress" value={overview.inProgress} color="bg-amber-500" />
                <MiniStat label="Resolved" value={overview.resolved} color="bg-emerald-600" />
                <MiniStat label="Closed" value={overview.closed} color="bg-slate-500" />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-950">Recent Complaints</h2>
                <Link to="/app/complaints" className="text-xs font-bold text-blue-600">View all</Link>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Tracking No.</th>
                      <th className="py-2 pr-3">Title</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Date Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {complaints.slice(0, 5).map((complaint) => (
                      <tr key={complaint.trackingNumber}>
                        <td className="py-2 pr-3 font-semibold text-slate-900">
                          <Link to={`/app/complaints/${complaint.trackingNumber}`} className="hover:text-blue-600">{complaint.trackingNumber}</Link>
                        </td>
                        <td className="max-w-[220px] truncate py-2 pr-3 text-slate-600">{complaint.description}</td>
                        <td className="py-2 pr-3"><StatusBadge value={complaint.status} /></td>
                        <td className="py-2 pr-3 text-slate-500">{new Date(complaint.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">Track My Complaint</h2>
              <form onSubmit={trackComplaint} className="mt-3 flex gap-2">
                <input className="input" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Example: SCF-2026-0001" />
                <button className="btn-primary bg-blue-600 hover:bg-blue-700">
                  <Search size={16} />
                  Track
                </button>
              </form>
            </section>

            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">Notifications</h2>
              <div className="mt-3 space-y-2">
                {notifications.slice(0, 3).map((notification) => (
                  <article key={notification.id} className="rounded-md bg-slate-50 p-3">
                    <div className="flex items-start gap-2">
                      <Bell className="mt-0.5 text-emerald-600" size={15} />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{notification.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{notification.message}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-950">Satisfaction Rating</h2>
              {unratedResolved ? (
                <div className="mt-3">
                  <p className="text-xs text-slate-500">Rate resolved case {unratedResolved.trackingNumber}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <select className="input max-w-32" value={ratingScore} onChange={(event) => setRatingScore(Number(event.target.value))}>
                      {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                    </select>
                    <button className="btn-primary bg-blue-600 hover:bg-blue-700" onClick={rateResolution} type="button">
                      <Star size={16} />
                      Submit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 size={17} />
                  No resolved case is waiting for rating.
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-sm font-bold text-slate-950">Complaint Routing Process</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-9">
          {routingSteps.map((step, index) => (
            <div key={step} className="rounded-md border border-blue-100 bg-blue-50 p-3 text-center">
              <p className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-bold text-blue-700 ring-1 ring-blue-200">{index + 1}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-700">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const ActionCard = ({ to, icon: Icon, label }) => (
  <Link to={to} className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center text-xs font-bold text-blue-700 hover:border-blue-300 hover:bg-blue-100">
    <Icon className="mx-auto mb-2" size={18} />
    {label}
  </Link>
);

const MiniStat = ({ label, value, color }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    <span className={`mt-2 block h-1.5 rounded-full ${color}`} />
  </div>
);
