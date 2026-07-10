import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { api } from '../../api/client.js';
import { BrandLogo } from '../../components/BrandLogo.jsx';
import { errorMessage } from '../../context/ToastContext.jsx';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
    } catch (err) {
      setError(errorMessage(err, 'Could not send reset link'));
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <form onSubmit={submit} className="panel w-full max-w-md p-6">
        <BrandLogo />
        <h1 className="mt-8 text-2xl font-bold text-slate-950">Forgot Password</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your email to generate a demo reset link.</p>
        <label className="mt-6 block">
          <span className="label">Email</span>
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        {message && <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
        <button className="btn-primary mt-6 w-full"><MailCheck size={17} />Send Reset Link</button>
        <Link to="/login" className="mt-4 block text-center text-sm font-semibold text-brand-600">Back to login</Link>
      </form>
    </main>
  );
};

export const VerifyOtp = () => (
  <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
    <div className="panel w-full max-w-md p-6">
      <BrandLogo />
      <h1 className="mt-8 text-2xl font-bold text-slate-950">OTP Verification</h1>
      <p className="mt-1 text-sm text-slate-500">Use OTP code 123456 for demo verification.</p>
      <div className="mt-6 grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, index) => <input key={index} className="input text-center text-lg font-bold" maxLength={1} defaultValue={index === 0 ? '1' : ''} />)}
      </div>
      <Link to="/login" className="btn-primary mt-6 w-full">Verify OTP</Link>
    </div>
  </main>
);

