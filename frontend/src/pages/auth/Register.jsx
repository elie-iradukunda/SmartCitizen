import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';

const initial = {
  fullName: '',
  email: '',
  phone: '',
  gender: '',
  province: '',
  district: '',
  sector: '',
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

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6"><BrandLogo /></div>
        <form onSubmit={submit} className="panel p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-950">Create Citizen Account</h1>
          <p className="mt-1 text-sm text-slate-500">Register to submit complaints or feedback, track status, receive responses, and rate resolution.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Full Name" value={form.fullName} onChange={(value) => update('fullName', value)} required />
            <Field label="Email" type="email" value={form.email} onChange={(value) => update('email', value)} required />
            <Field label="Phone" value={form.phone} onChange={(value) => update('phone', value)} />
            <label>
              <span className="label">Gender</span>
              <select className="input" value={form.gender} onChange={(event) => update('gender', event.target.value)}>
                <option value="">Select gender</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </label>
            <Field label="Province" value={form.province} onChange={(value) => update('province', value)} />
            <Field label="District" value={form.district} onChange={(value) => update('district', value)} />
            <Field label="Sector" value={form.sector} onChange={(value) => update('sector', value)} />
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

const Field = ({ label, type = 'text', value, onChange, required = false }) => (
  <label>
    <span className="label">{label}{required && <span className="text-red-500"> *</span>}</span>
    <input className="input" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
  </label>
);
