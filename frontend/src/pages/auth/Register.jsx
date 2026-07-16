import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '../../components/LanguageSwitcher.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';
import { kacyiruDefaults, kacyiruLocation, villagesForCell } from '../../data/kacyiruLocations.js';

// A citizen account stands for a real resident of the sector, so registration asks for the
// identity and the address up front: the National ID is what ties a complaint to a person,
// and the cell and village are what tell an office where the problem actually is.
const initial = {
  fullName: '',
  email: '',
  phone: '',
  nationalId: '',
  password: '',
  ...kacyiruDefaults,
  preferredLanguage: 'Kinyarwanda'
};

const NATIONAL_ID_DIGITS = 16;
const digitsOf = (value) => String(value || '').replace(/\D/g, '');
// Shown back in the 4-digit groups printed on the card, which is how a citizen reads it
// while typing. Only the digits are submitted.
const formatNationalId = (value) => digitsOf(value).slice(0, NATIONAL_ID_DIGITS).replace(/(.{4})/g, '$1 ').trim();

export const Register = () => {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const update = (field, value) => setForm((current) => {
    // Villages belong to one cell, so changing the cell must not leave the old village behind.
    if (field === 'cell') return { ...current, cell: value, village: villagesForCell(value)[0] || '' };
    return { ...current, [field]: value };
  });

  const idDigits = digitsOf(form.nationalId);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (idDigits.length !== NATIONAL_ID_DIGITS) {
      setError(`The National ID must be ${NATIONAL_ID_DIGITS} digits.`);
      return;
    }
    setSaving(true);
    try {
      const user = await register({ ...form, nationalId: idDigits });
      toast.success(`Welcome, ${user.fullName}. Your citizen account is ready.`);
      navigate('/app/submit-complaint');
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'));
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
        <h1 className="auth-title">Create citizen account</h1>
        <p className="auth-sub">Fill in your details, then you can submit a complaint straight away.</p>

        <div className="field">
          <label className="label" htmlFor="reg-name">Full name</label>
          <input id="reg-name" className="input" value={form.fullName} required onChange={(event) => update('fullName', event.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="reg-email">Email</label>
          <input id="reg-email" className="input" type="email" value={form.email} required onChange={(event) => update('email', event.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="reg-phone">Phone</label>
          <input id="reg-phone" className="input" value={form.phone} required placeholder="+250 7…" onChange={(event) => update('phone', event.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="reg-id">National ID</label>
          <input
            id="reg-id"
            className="input"
            inputMode="numeric"
            value={formatNationalId(form.nationalId)}
            required
            placeholder="1199 8012 3456 7890"
            onChange={(event) => update('nationalId', digitsOf(event.target.value))}
          />
          <small className="hint">{idDigits.length} of {NATIONAL_ID_DIGITS} digits</small>
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-sector">Sector</label>
          <select id="reg-sector" className="input" value={form.sector} required onChange={(event) => update('sector', event.target.value)}>
            <option value={kacyiruLocation.sector}>{kacyiruLocation.sector}</option>
          </select>
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label className="label" htmlFor="reg-cell">Cell</label>
            <select id="reg-cell" className="input" value={form.cell} required onChange={(event) => update('cell', event.target.value)}>
              {kacyiruLocation.cells.map((cell) => <option key={cell.name}>{cell.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="reg-village">Village</label>
            <select id="reg-village" className="input" value={form.village} required onChange={(event) => update('village', event.target.value)}>
              {villagesForCell(form.cell).map((village) => <option key={village}>{village}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="reg-password">Password</label>
          <input id="reg-password" className="input" type="password" value={form.password} required onChange={(event) => update('password', event.target.value)} />
          <small className="hint">At least 6 characters.</small>
        </div>

        <small className="hint" style={{ marginTop: 12 }}>Case study area: Kacyiru Sector, Gasabo District.</small>
        {error && <p className="err">{error}</p>}

        <button className="btn block lg" style={{ marginTop: 16 }} disabled={saving}>
          {saving ? 'Creating account…' : 'Register'}
        </button>

        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
          <Link to="/login" style={{ color: 'var(--sky-700)' }}>Already have an account? Login</Link>
        </p>
      </form>
    </main>
  );
};
