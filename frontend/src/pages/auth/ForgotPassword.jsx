import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { endpoints } from '../../api/client.js';
import { LanguageSwitcher } from '../../components/LanguageSwitcher.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      setSent(await endpoints.forgotPassword(email));
    } catch (err) {
      setError(errorMessage(err, 'Could not send the reset link'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="auth-wrap">
      <form onSubmit={submit} className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div className="logo-mark sky-grad" aria-hidden="true">SC</div>
          <LanguageSwitcher />
        </div>
        <h1 className="auth-title">Forgot password</h1>
        <p className="auth-sub">Enter your email and we will generate a reset link that works once and expires.</p>

        <div className="field">
          <label className="label" htmlFor="reset-email">Email</label>
          <input id="reset-email" className="input" type="email" value={email} required onChange={(event) => setEmail(event.target.value)} />
        </div>

        {error && <p className="err">{error}</p>}

        <button className="btn block lg" style={{ marginTop: 16 }} disabled={saving}>
          {saving ? 'Sending…' : 'Send reset link'}
        </button>

        {sent && (
          <div className="track-box">
            <p className="track-h"><span aria-hidden="true">📩</span> {sent.message}</p>
            {sent.resetLink && (
              <>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>
                  There is no mail server in this prototype, so the link is shown here. It expires in 30 minutes and can be used once.
                </p>
                <Link className="btn sm" style={{ marginTop: 10 }} to={sent.resetLink}>Open the reset link</Link>
              </>
            )}
          </div>
        )}

        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
          <Link to="/login" style={{ color: 'var(--sky-700)' }}>Back to login</Link>
        </p>
      </form>
    </main>
  );
};

export const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const email = params.get('email') || '';
  const token = params.get('token') || '';

  const submit = async (event) => {
    event.preventDefault();
    if (password !== confirm) return setError('The two passwords are not the same.');
    setError('');
    setSaving(true);
    try {
      const result = await endpoints.resetPassword({ email, token, password });
      toast.success(result.message);
      navigate('/login');
    } catch (err) {
      setError(errorMessage(err, 'Could not change your password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="auth-wrap">
      <form onSubmit={submit} className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div className="logo-mark sky-grad" aria-hidden="true">SC</div>
          <LanguageSwitcher />
        </div>
        <h1 className="auth-title">Choose a new password</h1>
        <p className="auth-sub">{email || 'Open this page from the reset link you were given.'}</p>

        <div className="field">
          <label className="label" htmlFor="new-password">New password</label>
          <input
            id="new-password"
            className="input"
            type="password"
            value={password}
            required
            minLength={6}
            onChange={(event) => { setPassword(event.target.value); setError(''); }}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="confirm-password">Repeat the password</label>
          <input
            id="confirm-password"
            className="input"
            type="password"
            value={confirm}
            required
            onChange={(event) => { setConfirm(event.target.value); setError(''); }}
          />
        </div>

        <small className="hint" style={{ marginTop: 10 }}>At least 6 characters.</small>
        {error && <p className="err">{error}</p>}

        <button className="btn block lg" style={{ marginTop: 16 }} disabled={saving || !token || !email}>
          {saving ? 'Saving…' : 'Change my password'}
        </button>

        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
          <Link to="/login" style={{ color: 'var(--sky-700)' }}>Back to login</Link>
        </p>
      </form>
    </main>
  );
};
