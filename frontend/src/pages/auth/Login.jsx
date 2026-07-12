import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo.jsx';
import { LanguageSwitcher } from '../../components/LanguageSwitcher.jsx';
import { roleHome } from '../../data/navigation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';

const demoAccounts = [
  { role: 'citizen', email: 'jean@smartcitizen.rw', label: 'Citizen' },
  { role: 'staff', email: 'staff@smartcitizen.rw', label: 'Administrative Staff' },
  { role: 'admin', email: 'admin@smartcitizen.rw', label: 'Admin' }
];

export const Login = () => {
  const [form, setForm] = useState({ email: 'jean@smartcitizen.rw', password: 'password' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.fullName}.`);
      navigate(roleHome[user.role] || '/app/dashboard');
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const useDemo = (account) => {
    setForm({ email: account.email, password: 'password' });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden bg-slate-950 p-8 text-white lg:block">
          <BrandLogo />
          <div className="mt-20 max-w-sm">
            <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold">
              <ShieldCheck size={16} />
              Secure complaint management access
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight">Enter your workspace and keep citizen complaints moving.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              The system uses three academic roles: Citizen, Administrative Staff, and Admin.
            </p>
          </div>
        </section>
        <section className="p-6 sm:p-8">
          <div className="lg:hidden"><BrandLogo /></div>
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>
          <h1 className="mt-8 text-2xl font-bold text-slate-950 lg:mt-0">Login</h1>
          <p className="mt-1 text-sm text-slate-500">Use demo password <span className="font-bold">password</span>.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {demoAccounts.map((account) => (
              <button key={account.email} type="button" onClick={() => useDemo(account)} className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50">
                {account.label}
                <span className="block truncate text-xs font-medium text-slate-400">{account.email}</span>
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <label>
              <span className="label">Email</span>
              <input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              <span className="label">Password</span>
              <input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </label>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
            <button className="btn-primary" disabled={loading}>
              <LogIn size={17} />
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link to="/forgot-password" className="font-semibold text-brand-600">Forgot password?</Link>
            <Link to="/register" className="font-semibold text-slate-600">Create account</Link>
          </div>
        </section>
      </div>
    </main>
  );
};
