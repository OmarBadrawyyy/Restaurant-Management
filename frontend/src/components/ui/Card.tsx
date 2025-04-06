import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
  isHoverable?: boolean;
  elevation?: 'flat' | 'low' | 'medium' | 'high';
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  className = '',
  footer,
  headerAction,
  noPadding = false,
  isHoverable = false,
  elevation = 'low',
}) => {
  const elevationClasses = {
    flat: 'border border-gray-200',
    low: 'shadow-sm',
    medium: 'shadow-md',
    high: 'shadow-lg',
  };

  const hoverClass = isHoverable ? 'transition-all duration-200 hover:shadow-lg hover:-translate-y-1' : '';
  const paddingClass = noPadding ? '' : 'p-5';

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden ${elevationClasses[elevation]} ${hoverClass} ${className}`}
    >
      {(title || icon) && (
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            {icon && <div className="text-primary-600">{icon}</div>}
            <div>
              {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={paddingClass}>{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">{footer}</div>
      )}
    </div>
  );
};

export default Card; 