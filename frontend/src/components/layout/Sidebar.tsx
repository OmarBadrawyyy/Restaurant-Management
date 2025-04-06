import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar: React.FC = () => {
  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-xl font-semibold">Restaurant Management</h2>
      </div>
      
      <nav>
        <ul className="space-y-2">
          <li>
            <Link to="/" className="block py-2 px-4 rounded hover:bg-gray-700">Dashboard</Link>
          </li>
          {/* Add more navigation items here */}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
