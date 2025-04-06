import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  // This will be expanded later with user info, navigation, etc.
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="font-bold text-xl text-blue-600">Restaurant Management</Link>
          <nav>
            {/* Navigation items will be added here */}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
