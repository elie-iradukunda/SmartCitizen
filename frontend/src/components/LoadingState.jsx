export const LoadingState = ({ label = 'Loading data...' }) => (
  <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-200 bg-white">
    <div className="text-center">
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      <p className="mt-3 text-sm font-semibold text-slate-500">{label}</p>
    </div>
  </div>
);

