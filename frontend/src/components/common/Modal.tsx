import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'lg'
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

  let widthClass = 'max-w-lg';
  if (maxWidth === 'sm') widthClass = 'max-w-sm';
  if (maxWidth === 'md') widthClass = 'max-w-md';
  if (maxWidth === 'lg') widthClass = 'max-w-lg';
  if (maxWidth === 'xl') widthClass = 'max-w-xl';
  if (maxWidth === '2xl') widthClass = 'max-w-2xl';
  if (maxWidth === '4xl') widthClass = 'max-w-4xl';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0B2340]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className={`relative bg-white rounded-md border border-[#D9E1EA] shadow-2xl w-full ${widthClass} overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-150`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#D9E1EA] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-8 h-8 rounded bg-[#0B5CAB]/10 text-[#0B5CAB] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
              </div>
            )}
            <div>
              <h3 className="text-base font-semibold text-[#172B4D]">{title}</h3>
              {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#64748B] hover:text-[#172B4D] hover:bg-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 text-[#334155]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-[#D9E1EA] bg-[#F8FAFC] flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
