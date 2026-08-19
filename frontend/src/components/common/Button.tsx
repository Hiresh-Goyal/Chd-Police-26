import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  let baseStyles = 'inline-flex items-center justify-center font-medium transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed select-none';

  let variantStyles = '';
  if (variant === 'primary') {
    variantStyles = 'bg-[#0B5CAB] hover:bg-[#084A8B] text-white shadow-sm';
  } else if (variant === 'secondary') {
    variantStyles = 'bg-white hover:bg-slate-50 text-[#172B4D] border border-[#D9E1EA] shadow-sm';
  } else if (variant === 'danger') {
    variantStyles = 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm';
  } else if (variant === 'outline') {
    variantStyles = 'border border-[#0B5CAB] text-[#0B5CAB] hover:bg-[#EFF6FF]';
  } else if (variant === 'ghost') {
    variantStyles = 'text-[#334155] hover:bg-slate-100 hover:text-[#0B5CAB]';
  }

  let sizeStyles = '';
  if (size === 'sm') {
    sizeStyles = 'text-xs px-2.5 py-1.5 gap-1.5';
  } else if (size === 'md') {
    sizeStyles = 'text-sm px-3.5 py-2 gap-2';
  } else if (size === 'lg') {
    sizeStyles = 'text-base px-5 py-2.5 gap-2.5';
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
      ) : icon ? (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
