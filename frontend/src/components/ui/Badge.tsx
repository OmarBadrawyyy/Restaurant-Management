import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = false,
  className = '',
  icon,
}) => {
  // Variant styles
  const variantStyles = {
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-cyan-100 text-cyan-800',
    light: 'bg-gray-200 text-gray-700',
    dark: 'bg-gray-700 text-white',
  };

  // Size styles
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  // Border radius styles
  const radiusStyle = rounded ? 'rounded-full' : 'rounded';

  // Icon size based on badge size
  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <span
      className={`inline-flex items-center font-medium ${sizeStyles[size]} ${variantStyles[variant]} ${radiusStyle} ${className}`}
    >
      {icon && (
        <span className={`${iconSize[size]} mr-1 -ml-0.5`}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge; 