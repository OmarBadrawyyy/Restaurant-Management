import React from 'react';
import { Link } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href: string }[];
  fullWidth?: boolean;
  backLink?: { label: string; href: string };
  className?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  fullWidth = false,
  backLink,
  className,
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-gray-100 pb-12 ${className || ''}`}>
      <div className="bg-white/70 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className={`${fullWidth ? 'container-fluid px-4' : 'container'} mx-auto py-6`}>
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-3" aria-label="Breadcrumbs">
              <ol className="flex text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && (
                      <li className="mx-2 text-gray-400 select-none">/</li>
                    )}
                    <li>
                      <Link 
                        to={crumb.href} 
                        className={`transition-colors duration-200 hover:text-blue-600 ${
                          index === breadcrumbs.length - 1 
                            ? 'text-gray-800 font-medium' 
                            : 'text-gray-600'
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
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200 group"
              >
                <svg 
                  className="mr-1.5 h-4 w-4 transform transition-transform duration-200 group-hover:-translate-x-1" 
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
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
              {subtitle && (
                <p className="mt-1.5 text-gray-600 text-sm sm:text-base max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="mt-4 sm:mt-0 flex-shrink-0 flex flex-wrap items-center gap-3 sm:gap-4 sm:flex-nowrap">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`${fullWidth ? 'container-fluid px-4' : 'container'} mx-auto pt-6`}>
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout; 