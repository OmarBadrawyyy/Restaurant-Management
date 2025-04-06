import React from 'react';
import DashboardLayout from '../components/ui/DashboardLayout';
import AdminReservationManagement from '../components/AdminReservationManagement';

const AdminReservations: React.FC = () => {
  return (
    <DashboardLayout
      title="Reservation Management"
      subtitle="Manage and track all restaurant reservations"
    >
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <AdminReservationManagement />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminReservations; 