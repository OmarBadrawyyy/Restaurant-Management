import React from 'react';
import { User } from '../services/userService';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { BiEnvelope, BiPhone } from 'react-icons/bi';

interface StaffCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onStatusChange: (userId: string, newStatus: string) => void;
  onResetPassword: (userId: string) => void;
}

const StaffCard: React.FC<StaffCardProps> = ({ 
  user, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onResetPassword 
}) => {
  // Determine status badge color
  const getStatusBadgeClass = (status?: string): string => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'onleave':
      case 'on leave':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-800 font-bold text-lg">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user.username}</h3>
            <p className="text-sm text-gray-500">{user.role}</p>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(user.status)}`}>
                {user.status || (user.isActive ? 'Active' : 'Inactive')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(user)}
            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition-colors"
            title="Edit staff member"
          >
            {FiEdit({ size: 16 })}
          </button>
          <button
            onClick={() => onDelete(user._id || user.id || '')}
            className="text-red-600 hover:bg-red-50 p-1.5 rounded-full transition-colors"
            title="Delete staff member"
          >
            {FiTrash2({ size: 16 })}
          </button>
        </div>
      </div>
      
      <div className="mt-3 border-t pt-3">
        <div className="grid grid-cols-1 gap-1">
          <div className="flex items-center text-sm text-gray-700">
            {BiEnvelope({ className: "mr-2 text-gray-500", size: 16 })}
            <span>{user.email}</span>
          </div>
          {user.phoneNumber && (
            <div className="flex items-center text-sm text-gray-700">
              {BiPhone({ className: "mr-2 text-gray-500", size: 16 })}
              <span>{user.phoneNumber}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-3 flex justify-between">
        <button
          onClick={() => onStatusChange(user._id || user.id || '', user.status === 'active' ? 'inactive' : 'active')}
          className={`px-3 py-1 text-xs rounded-md ${
            user.status === 'active' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-green-100 hover:bg-green-200 text-green-700'
          }`}
        >
          {user.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={() => onResetPassword(user._id || user.id || '')}
          className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md"
        >
          Reset Password
        </button>
      </div>
    </div>
  );
};

export default StaffCard; 