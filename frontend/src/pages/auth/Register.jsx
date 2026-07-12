import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo.jsx';
import { LanguageSwitcher } from '../../components/LanguageSwitcher.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';
import { kacyiruDefaults, kacyiruLocation, villagesForCell } from '../../data/kacyiruLocations.js';

const initial = {
  fullName: '',
  email: '',
  phone: '',
  nationalId: '',
  gender: '',
  ...kacyiruDefaults,
  address: '',
  preferredLanguage: 'Kinyarwanda',
  password: ''
};

export const Register = () => {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const user = await register(form);
      toast.success(`Welcome, ${user.fullName}. Your citizen account is ready.`);
      navigate('/app/dashboard');
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'));
    }
  };

  const update = (field, value) => setForm((current) => {
    if (field === 'cell') {
      return { ...current, cell: value, village: villagesForCell(value)[0] || '' };
    }
    return { ...current, [field]: value };
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <BrandLogo />
          <LanguageSwitcher />
        </div>
        <form onSubmit={submit} className="panel p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-950">Create Citizen Account</h1>
          <p className="mt-1 text-sm text-slate-500">Register to submit complaints or feedback, track status, receive responses, and rate resolution.</p>
          <p className="mt-2 rounded-md bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">Case study area: Gasabo District - Kacyiru Sector. Choose your cell and village so the office knows where the issue is.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Full Name" value={form.fullName} onChange={(value) => update('fullName', value)} required />
            <Field label="Email" type="email" value={form.email} onChange={(value) => update('email', value)} required />
            <Field label="Phone" value={form.phone} onChange={(value) => update('phone', value)} />
            <Field label="National ID / Citizen ID" value={form.nationalId} onChange={(value) => update('nationalId', value)} />
            <label>
              <span className="label">Gender</span>
              <select className="input" value={form.gender} onChange={(event) => update('gender', event.target.value)}>
                <option value="">Select gender</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </label>
            <Field label="Province" value={form.province} readOnly />
            <Field label="District" value={form.district} readOnly />
            <Field label="Sector" value={form.sector} readOnly />
            <label>
              <span className="label">Cell</span>
              <select className="input" value={form.cell} onChange={(event) => update('cell', event.target.value)} required>
                {kacyiruLocation.cells.map((cell) => <option key={cell.name}>{cell.name}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Village</span>
              <select className="input" value={form.village} onChange={(event) => update('village', event.target.value)} required>
                {villagesForCell(form.cell).map((village) => <option key={village}>{village}</option>)}
              </select>
            </label>
            <Field label="Address / Street" value={form.address} onChange={(value) => update('address', value)} />
            <label>
              <span className="label">Preferred Language</span>
              <select className="input" value={form.preferredLanguage} onChange={(event) => update('preferredLanguage', event.target.value)}>
                <option>Kinyarwanda</option>
                <option>English</option>
              </select>
            </label>
            <Field label="Password" type="password" value={form.password} onChange={(value) => update('password', value)} required />
          </div>
          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link to="/login" className="text-sm font-semibold text-slate-600">Already have an account?</Link>
            <button className="btn-primary"><UserPlus size={17} />Register</button>
          </div>
        </form>
      </div>
    </main>
  );
};

const Field = ({ label, type = 'text', value, onChange = () => {}, required = false, readOnly = false }) => (
  <label>
    <span className="label">{label}{required && <span className="text-red-500"> *</span>}</span>
    <input className="input" type={type} value={value} required={required} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
  </label>
);
