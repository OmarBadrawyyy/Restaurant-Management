import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CustomerIssueItem = ({ 
  issue, 
  isSelected, 
  onSelect, 
  onIssueUpdated 
}) => {
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };
  
  // Function to get CSRF token from cookies
  const getCSRFToken = async () => {
    try {
      console.log('Obtaining CSRF token...');
      
      // Try to get token from cookie first
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN' || name === '_csrf') {
          const token = decodeURIComponent(value);
          console.log('CSRF token found in cookies');
          axios.defaults.headers.common['X-CSRF-Token'] = token;
          return token;
        }
      }
      
      // If token not in cookies, try to fetch a new one
      console.log('No CSRF token in cookies, fetching from API...');
      try {
        const response = await axios.get('/api/csrf-token', { 
          withCredentials: true,
          timeout: 5000
        });
        
        if (response.data?.csrfToken) {
          console.log('CSRF token obtained from API');
          axios.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
          return response.data.csrfToken;
        }
      } catch (apiError) {
        console.error('Error fetching CSRF token from API:', apiError);
        
        // Try auth endpoint as fallback
        try {
          const authResponse = await axios.get('/api/auth/csrf-token', { 
            withCredentials: true,
            timeout: 5000
          });
          
          if (authResponse.data?.csrfToken) {
            console.log('CSRF token obtained from auth API');
            axios.defaults.headers.common['X-CSRF-Token'] = authResponse.data.csrfToken;
            return authResponse.data.csrfToken;
          }
        } catch (authApiError) {
          console.error('Error fetching CSRF token from auth API:', authApiError);
        }
      }
      
      console.warn('Failed to obtain CSRF token');
      return null;
    } catch (error) {
      console.error('Error in getCSRFToken:', error);
      return null;
    }
  };

  const handleStatusChange = async (e) => {
    if (isUpdating) return;

    e.stopPropagation(); // Prevent row selection
    const newStatus = e.target.value;
    
    // Show loading toast
    const toastId = toast.loading(`Updating status to ${newStatus}...`);
    setIsUpdating(true);
    
    try {
      // Get a fresh CSRF token
      const csrfToken = await getCSRFToken();
      
      // Get auth headers
      const authHeaders = getAuthHeaders();
      
      // Make the API request with CSRF token
      const response = await axios.patch(
        `/api/admin/customer-issues/${issue.id}/status`, 
        { status: newStatus },
        {
          withCredentials: true,
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
          }
        }
      );
      
      console.log('Status update response:', response.data);
      
      // Extract the updated issue from the response
      const updatedIssue = response.data.issue || response.data;
      
      // Call the parent's update function
      if (updatedIssue) {
        onIssueUpdated(updatedIssue);
      } else {
        // Fallback if API doesn't return updated issue
        onIssueUpdated({
          ...issue,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Update toast to success
      toast.update(toastId, { 
        render: response.data.message || `Status updated to ${newStatus}`, 
        type: "success", 
        isLoading: false, 
        autoClose: 2000
      });
    } catch (error) {
      console.error('Error updating issue status:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        toast.update(toastId, {
          render: 'Session expired. Please log in again.',
          type: "error",
          isLoading: false,
          autoClose: 3000
        });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.update(toastId, { 
          render: error.response?.data?.message || 'Failed to update status', 
          type: "error", 
          isLoading: false, 
          autoClose: 3000
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (e) => {
    if (isUpdating) return;

    e.stopPropagation(); // Prevent row selection
    const newPriority = e.target.value;
    
    // Show loading toast
    const toastId = toast.loading(`Updating priority to ${newPriority}...`);
    setIsUpdating(true);
    
    try {
      // Get a fresh CSRF token
      const csrfToken = await getCSRFToken();
      
      // Get auth headers
      const authHeaders = getAuthHeaders();
      
      // Make the API request with CSRF token
      const response = await axios.patch(
        `/api/admin/customer-issues/${issue.id}/priority`, 
        { priority: newPriority },
        {
          withCredentials: true,
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
          }
        }
      );
      
      console.log('Priority update response:', response.data);
      
      // Extract the updated issue from the response
      const updatedIssue = response.data.issue || response.data;
      
      // Call the parent's update function
      if (updatedIssue) {
        onIssueUpdated(updatedIssue);
      } else {
        // Fallback if API doesn't return updated issue
        onIssueUpdated({
          ...issue,
          priority: newPriority,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Update toast to success
      toast.update(toastId, { 
        render: response.data.message || `Priority updated to ${newPriority}`, 
        type: "success", 
        isLoading: false, 
        autoClose: 2000
      });
    } catch (error) {
      console.error('Error updating issue priority:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        toast.update(toastId, {
          render: 'Session expired. Please log in again.',
          type: "error",
          isLoading: false,
          autoClose: 3000
        });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.update(toastId, { 
          render: error.response?.data?.message || 'Failed to update priority', 
          type: "error", 
          isLoading: false, 
          autoClose: 3000
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if issue has a response
  const hasResponse = issue.notes && issue.notes.length > 0;

  return (
    <div 
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-50' : ''}`}
      onClick={() => onSelect(issue)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-gray-900">{issue.feedbackType || issue.issueType}</h3>
          <p className="text-sm text-gray-500">{issue.userName} ({issue.userEmail})</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative inline-block text-left">
            <select
              value={issue.status}
              onChange={handleStatusChange}
              onClick={(e) => e.stopPropagation()} // Prevent row selection
              className={`text-xs rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 appearance-none pr-6 ${getStatusBadgeClass(issue.status)}`}
              aria-label="Change issue status"
              style={{ minWidth: '88px' }}
              disabled={isUpdating}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5">
              <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <div className="relative inline-block text-left">
            <select
              value={issue.priority}
              onChange={handlePriorityChange}
              onClick={(e) => e.stopPropagation()} // Prevent row selection
              className={`text-xs rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 appearance-none pr-6 ${getPriorityBadgeClass(issue.priority)}`}
              aria-label="Change issue priority"
              style={{ minWidth: '80px' }}
              disabled={isUpdating}
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5">
              <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-700 line-clamp-2">{issue.description}</p>
      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
        <span>Created: {formatDate(issue.createdAt)}</span>
        <span>{hasResponse ? "Has response" : "No response"}</span>
      </div>
    </div>
  );
};

export default CustomerIssueItem; 