import React from 'react';
import { Link, To } from 'react-router-dom';

interface BaseButtonProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'ghost' | 'link';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

interface ButtonProps extends BaseButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  href?: never;
  to?: never;
}

interface LinkButtonProps extends BaseButtonProps {
  href: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  to?: never;
}

interface RouterLinkButtonProps extends BaseButtonProps {
  to: To;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  href?: never;
}

type CombinedButtonProps = ButtonProps | LinkButtonProps | RouterLinkButtonProps;

const Button = (props: CombinedButtonProps) => {
  const {
    children,
    className = '',
    disabled = false,
    size = 'md',
    variant = 'primary',
    fullWidth = false,
    isLoading = false,
    leftIcon,
    rightIcon,
    type = 'button',
  } = props;

  // Shared classes
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-md
    focus:outline-none focus:ring-2 focus:ring-offset-2
    transition-colors duration-200 ease-in-out
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}
  `;

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500',
    info: 'bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-400',
    light: 'bg-gray-200 hover:bg-gray-300 text-gray-700 focus:ring-gray-400',
    dark: 'bg-gray-800 hover:bg-gray-900 text-white focus:ring-gray-600',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-300',
    link: 'bg-transparent text-blue-600 hover:text-blue-800 hover:underline p-0 h-auto focus:ring-0',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  const contentElement = (
    <>
      {isLoading && (
        <svg 
          className="animate-spin -ml-1 mr-2 h-4 w-4" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          ></circle>
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </>
  );

  // Render as button
  if ('onClick' in props && !('href' in props) && !('to' in props)) {
    const { onClick } = props as ButtonProps;
    return (
      <button
        type={type}
        className={classes}
        disabled={disabled || isLoading}
        onClick={onClick}
        aria-disabled={disabled || isLoading}
      >
        {contentElement}
      </button>
    );
  }

  // Render as router Link
  if ('to' in props) {
    const { to, onClick } = props as RouterLinkButtonProps;
    return (
      <Link
        to={to}
        className={classes}
        onClick={onClick}
        tabIndex={disabled ? -1 : undefined}
        aria-disabled={disabled}
      >
        {contentElement}
      </Link>
    );
  }

  // Render as anchor
  if ('href' in props) {
    const { href, onClick } = props as LinkButtonProps;
    return (
      <a
        href={href}
        className={classes}
        onClick={onClick}
        tabIndex={disabled ? -1 : undefined}
        aria-disabled={disabled}
        rel="noopener noreferrer"
        target="_blank"
      >
        {contentElement}
      </a>
    );
  }

  // Fallback
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
    >
      {contentElement}
    </button>
  );
};

export default Button; 