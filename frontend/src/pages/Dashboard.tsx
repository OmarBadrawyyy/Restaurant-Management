import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // If user has manager role, redirect to manager dashboard
    if (currentUser?.role === 'manager') {
      navigate('/manager/dashboard');
    }
  }, [currentUser, navigate]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Main content area */}
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-lg">Welcome to the Restaurant Management System!</p>
          <p className="mt-4">This dashboard will be expanded with statistics and management options.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
