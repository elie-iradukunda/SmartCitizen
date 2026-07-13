import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);
let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((type, message) => {
    const id = ++idCounter;
    setToasts((current) => [...current, { id, type, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const value = {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
    dismiss
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[90vw] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start justify-between gap-3 rounded-md border-l-4 bg-white p-3 text-sm shadow-soft ${
              toast.type === 'success' ? 'border-emerald-500' : toast.type === 'error' ? 'border-red-500' : 'border-blue-500'
            }`}
          >
            <p className="font-semibold text-slate-800">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export const errorMessage = (err, fallback = 'Something went wrong') => {
  if (err?.code === 'ECONNABORTED') {
    return 'Upload took too long. Use a file under 100 MB, keep the page open, or paste a public evidence link.';
  }
  if (!err?.response && err?.message === 'Network Error') {
    return 'Upload did not complete. Check your connection, use a smaller file, or paste a public evidence link.';
  }
  return err?.response?.data?.message || fallback;
};
