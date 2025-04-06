import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  tooltip?: string;
  disabled?: boolean;
  ariaLabel: string;
  type?: 'button' | 'submit' | 'reset';
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  tooltip,
  disabled = false,
  ariaLabel,
  type = 'button',
}) => {
  // Variant styles
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500',
    info: 'bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-400',
    light: 'bg-gray-200 hover:bg-gray-300 text-gray-700 focus:ring-gray-400',
    dark: 'bg-gray-800 hover:bg-gray-900 text-white focus:ring-gray-600',
  };

  // Size styles
  const sizeStyles = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  // Icon sizes
  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  // Disabled style
  const disabledStyle = disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : 'hover:shadow-md active:shadow-inner';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyle} ${className}`}
      aria-label={ariaLabel}
      title={tooltip}
      tabIndex={0}
    >
      <span className={iconSizes[size]}>
        {icon}
      </span>
    </button>
  );
};

export default IconButton; 