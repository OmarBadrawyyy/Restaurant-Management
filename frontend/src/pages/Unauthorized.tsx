import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="text-red-500 mb-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-16 w-16 mx-auto" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Unauthorized Access</h1>
        
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. This area requires elevated privileges.
        </p>

        {currentUser ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              You are currently logged in as: <span className="font-medium">{currentUser.email}</span>
              <br />
              Role: <span className="font-medium capitalize">{currentUser.role}</span>
            </p>
            
            <div className="flex flex-col gap-3">
              <Link 
                to="/dashboard" 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
              
              <Link 
                to="/profile" 
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                View Your Profile
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Please log in to access the content you're authorized to view.
            </p>
            
            <Link 
              to="/login" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Log In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unauthorized;
