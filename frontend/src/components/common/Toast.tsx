import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          let bg = 'bg-[#172B4D] text-white';
          let icon = 'info';
          if (t.type === 'success') {
            bg = 'bg-[#065F46] text-white border border-emerald-400/30';
            icon = 'check_circle';
          } else if (t.type === 'error') {
            bg = 'bg-[#991B1B] text-white border border-red-400/30';
            icon = 'error';
          } else if (t.type === 'warning') {
            bg = 'bg-[#92400E] text-white border border-amber-400/30';
            icon = 'warning';
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto px-4 py-3 rounded shadow-lg flex items-center gap-2.5 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[280px] max-w-md ${bg}`}
            >
              <span className="material-symbols-outlined text-[18px] shrink-0">{icon}</span>
              <span className="flex-1">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
