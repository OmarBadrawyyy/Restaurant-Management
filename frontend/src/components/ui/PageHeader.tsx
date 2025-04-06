import React from 'react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  breadcrumbs?: { label: string; href: string }[];
  className?: string;
  backLink?: { label: string; href: string };
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  icon,
  breadcrumbs,
  className = '',
  backLink,
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3">
          <ol className="flex text-sm">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                {index > 0 && (
                  <li className="mx-2 text-gray-400">/</li>
                )}
                <li>
                  <Link 
                    to={crumb.href} 
                    className={`hover:text-blue-600 ${
                      index === breadcrumbs.length - 1 
                        ? 'text-gray-600 font-medium' 
                        : 'text-gray-500'
                    }`}
                  >
                    {crumb.label}
                  </Link>
                </li>
              </React.Fragment>
            ))}
          </ol>
        </nav>
      )}

      {/* Back link */}
      {backLink && (
        <div className="mb-4">
          <Link
            to={backLink.href}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <svg 
              className="mr-1 h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                clipRule="evenodd" 
              />
            </svg>
            {backLink.label}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          {icon && (
            <div className="mr-4 p-2.5 bg-blue-100 text-blue-600 rounded-lg">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-gray-600">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="mt-4 sm:mt-0 flex-shrink-0 flex flex-wrap gap-3 sm:flex-nowrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader; 