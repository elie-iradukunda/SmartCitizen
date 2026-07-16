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
      <div className="toast-wrap">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={`toast ${toast.type}`}
            aria-label="Dismiss notification"
          >
            <span aria-hidden="true">{toast.type === 'error' ? '⚠' : toast.type === 'info' ? 'ℹ' : '✓'}</span>
            {toast.message}
          </button>
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
