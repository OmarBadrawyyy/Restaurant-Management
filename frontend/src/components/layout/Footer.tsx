import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white shadow py-4">
      <div className="container mx-auto px-4">
        <p className="text-center text-gray-600 text-sm">
          © {new Date().getFullYear()} Restaurant Management System. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
