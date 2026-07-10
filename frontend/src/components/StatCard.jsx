import { ArrowUpRight } from 'lucide-react';

export const StatCard = ({ label, value, change, icon: Icon, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    rose: 'bg-rose-50 text-rose-600'
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        {Icon && (
          <span className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone] || tones.blue}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      {change && (
        <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <ArrowUpRight size={14} />
          {change}
        </p>
      )}
    </div>
  );
};

