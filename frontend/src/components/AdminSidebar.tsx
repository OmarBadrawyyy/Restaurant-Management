import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminSidebar: React.FC = () => {
  const baseClasses = 'flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700';
  const activeClass = 'bg-gray-100 dark:bg-gray-700';

  return (
    <aside className="w-64 bg-white p-6 space-y-6">
      <h2 className="text-xl font-semibold">Admin</h2>
      <nav className="space-y-2">
        <NavLink to="/admin/orders" className={({ isActive }) => `${baseClasses} ${isActive ? activeClass : ''}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Orders</span>
        </NavLink>

        <NavLink to="/admin/tables" className={({ isActive }) => `${baseClasses} ${isActive ? activeClass : ''}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Tables</span>
        </NavLink>

        <NavLink to="/admin/analytics" className={({ isActive }) => `${baseClasses} ${isActive ? activeClass : ''}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9a6 6 0 110 12 6 6 0 010-12z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a9 9 0 1118 0v-3a5.972 5.972 0 01-2.184 4.184A5.928 5.928 0 0118 15h-3z" />
          </svg>
          <span>Analytics</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default AdminSidebar; 