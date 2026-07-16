import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { endpoints } from '../../api/client.js';
import { Badge, Timeline, formatDate, formatDateTime } from '../../components/Ui.jsx';
import { LanguageSwitcher } from '../../components/LanguageSwitcher.jsx';
import { roleHome } from '../../data/navigation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';

const demoAccounts = [
  { role: 'citizen', email: 'jean@smartcitizen.rw', label: 'Citizen', icon: '👤', tint: '#e0f2fe' },
  { role: 'staff', email: 'staff@smartcitizen.rw', label: 'Administrative Staff', icon: '🏛️', tint: '#e0f2fe' },
  { role: 'admin', email: 'admin@smartcitizen.rw', label: 'Admin', icon: '🛡️', tint: '#ede9fe' }
];

export const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  if (user) return <Navigate to={roleHome[user.role] || '/app/submit-complaint'} replace />;

  const signIn = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.fullName}.`);
      navigate(roleHome[user.role] || '/app/complaints');
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.email.trim()) return setError('Enter your email address.');
    if (!form.password) return setError('Enter your password.');
    return signIn(form.email.trim(), form.password);
  };

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div className="logo-mark sky-grad" aria-hidden="true">SC</div>
          <LanguageSwitcher />
        </div>
        <h1 className="auth-title">Smart Citizen</h1>
        <p className="auth-sub">Citizen complaint portal · Kacyiru Sector, Gasabo District</p>

        <form onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="input"
              type="email"
              value={form.email}
              placeholder="name@smartcitizen.rw"
              onChange={(event) => { setForm({ ...form, email: event.target.value }); setError(''); }}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="input"
              type="password"
              value={form.password}
              placeholder="••••••••"
              onChange={(event) => { setForm({ ...form, password: event.target.value }); setError(''); }}
            />
          </div>
          {error && <p className="err">{error}</p>}
          <button className="btn block lg" style={{ marginTop: 18 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="demo">
          <p className="demo-h">Demo accounts (click to sign in)</p>
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              type="button"
              className="chip"
              disabled={loading}
              onClick={() => signIn(account.email, 'password')}
            >
              <span className="chip-ico" style={{ background: account.tint }} aria-hidden="true">{account.icon}</span>
              <span>
                <span className="chip-t">{account.label}</span>
                <span className="chip-e">{account.email}</span>
              </span>
            </button>
          ))}
          <small className="hint">All demo accounts use the password: password</small>
        </div>

        <PublicTracker />
        <AnonymousReport />

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, fontWeight: 600 }}>
          <Link to="/forgot-password" style={{ color: 'var(--sky-700)' }}>Forgot password?</Link>
          <Link to="/register" style={{ color: 'var(--muted)' }}>Create citizen account</Link>
        </div>
      </div>
    </main>
  );
};

// Anyone holding a tracking number can see where their case is without signing in.
export const PublicTracker = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [result, setResult] = useState(undefined);
  const [loading, setLoading] = useState(false);

  const track = async () => {
    const value = trackingNumber.trim();
    if (!value) return;
    setLoading(true);
    try {
      setResult(await endpoints.trackComplaint(value));
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="track-box">
      <p className="track-h"><span aria-hidden="true">🔎</span> Track a complaint without logging in</p>
      <div className="track-row">
        <input
          className="input"
          placeholder="SCF-2026-0001"
          value={trackingNumber}
          onChange={(event) => { setTrackingNumber(event.target.value); setResult(undefined); }}
          onKeyDown={(event) => event.key === 'Enter' && track()}
        />
        <button type="button" className="btn sm" onClick={track} disabled={loading}>Check</button>
      </div>
      {result === null && <p className="err">That tracking number was not found. Check how you typed it.</p>}
      {result && (
        <div className="track-res">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span className="scf">{result.trackingNumber}</span>
            <Badge value={result.status} />
          </div>
          <div className="meta" style={{ marginTop: 8 }}>
            <span><b>Office:</b> {result.assignedOffice}</span>
            <span><b>Due date:</b> {formatDate(result.dueDate)}</span>
          </div>
          {result.timeline?.length > 0 && (
            <Timeline items={result.timeline.map((step) => ({ title: step.label, when: formatDateTime(step.at) }))} />
          )}
        </div>
      )}
    </div>
  );
};

// Reporting misconduct should not require giving your name. No account, no login: the
// tracking number is the only thing the reporter walks away with.
export const AnonymousReport = () => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  const submit = async () => {
    if (!description.trim()) return setError('Describe what happened.');
    setSaving(true);
    setError('');
    try {
      setSubmitted(await endpoints.submitAnonymously({ description: description.trim() }));
      setDescription('');
    } catch (err) {
      setError(errorMessage(err, 'Could not send the report'));
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="track-box" style={{ background: 'linear-gradient(135deg, #ecfdf5, #fff)', borderColor: '#a7f3d0' }}>
        <p className="track-h"><span aria-hidden="true">✅</span> Your anonymous report was received.</p>
        <p className="scf" style={{ fontSize: 18, marginTop: 8 }}>{submitted.trackingNumber}</p>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>
          Write this number down. It is the only way to follow this case — your name was never recorded.
        </p>
        <div className="meta" style={{ marginTop: 6 }}>
          <span><b>Office:</b> {submitted.assignedOffice}</span>
          <span><b>Due date:</b> {formatDate(submitted.dueDate)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="track-box">
      <p className="track-h"><span aria-hidden="true">🕶️</span> Report without giving your name</p>
      {!open ? (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>
            For corruption or misconduct, when you would rather not be identified.
          </p>
          <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>
            Report anonymously
          </button>
        </>
      ) : (
        <>
          <textarea
            className="input"
            style={{ marginTop: 10, minHeight: 90 }}
            value={description}
            onChange={(event) => { setDescription(event.target.value); setError(''); }}
            placeholder="Say what happened. Do not include your name if you do not want to."
          />
          <small className="hint">The system picks the right office from what you wrote. Nothing about you is stored.</small>
          {error && <p className="err">{error}</p>}
          <div className="row-actions" style={{ marginTop: 10 }}>
            <button type="button" className="btn sm" disabled={saving} onClick={submit}>
              {saving ? 'Sending…' : 'Send report'}
            </button>
            <button type="button" className="btn ghost sm" onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
};
