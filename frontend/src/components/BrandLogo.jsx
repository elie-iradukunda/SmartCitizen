import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const BrandLogo = ({ compact = false, dark = false }) => (
  <Link to="/" className="flex items-center gap-2">
    <span className={`grid h-9 w-9 place-items-center rounded-lg border shadow-sm ${dark ? 'border-white/10 bg-white text-brand-600' : 'border-brand-100 bg-white text-brand-600'}`}>
      <Sparkles size={19} />
    </span>
    {!compact && (
      <span className="leading-tight">
        <span className={`block text-sm font-bold ${dark ? 'text-white' : 'text-slate-950'}`}>Smart Citizen</span>
        <span className={`block text-[11px] font-medium ${dark ? 'text-slate-300' : 'text-slate-500'}`}>Feedback & Complaint System</span>
      </span>
    )}
  </Link>
);
