import React, { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'w-96'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9995] overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0B2340]/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className={`relative ${width} max-w-full bg-white border-l border-[#D9E1EA] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200`}>
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[#D9E1EA] bg-[#F8FAFC] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#172B4D]">{title}</h3>
              {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#64748B] hover:text-[#172B4D] hover:bg-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 text-[#334155]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-3.5 border-t border-[#D9E1EA] bg-[#F8FAFC] flex items-center gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
