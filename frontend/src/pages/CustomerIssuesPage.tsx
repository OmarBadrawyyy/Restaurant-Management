import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';

// Types
interface IssueNote {
  id: string;
  responder: string;
  responderName: string;
  response: string;
  responseDate: string;
}

interface CustomerIssue {
  id: string;
  feedbackId?: string;
  userName: string;
  userEmail: string;
  description?: string;
  comment?: string;
  rating?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  category?: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt?: string;
  staffResponse?: IssueNote[];
  isPublic?: boolean;
}

const CustomerIssuesPage: React.FC = () => {
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [issues, setIssues] = useState<CustomerIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<CustomerIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [responseText, setResponseText] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Fetch issues
  useEffect(() => {
    fetchIssues();
  }, []);

  // Replace the filterIssues function and useEffect with useMemo
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Search filter
      const matchesSearch = !searchTerm || 
        issue.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (issue.comment?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
      
      // Priority filter
      const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [issues, searchTerm, statusFilter, priorityFilter]);

  // Add useEffect to update selectedIssue when filteredIssues changes
  useEffect(() => {
    // If the currently selected issue is no longer in filtered results, clear selection
    if (selectedIssue && !filteredIssues.some(issue => issue.id === selectedIssue.id)) {
      setSelectedIssue(null);
    }
  }, [filteredIssues, selectedIssue]);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      
      const response = await axios.get('/api/admin/customer-issues', {
        headers,
        withCredentials: true
      });
      
      console.log('Raw data from API:', response.data);
      
      // Handle both array and object response formats
      const issuesData = Array.isArray(response.data) ? response.data : 
                        response.data.data ? response.data.data :
                        response.data.issues ? response.data.issues : [];
      
      // Transform and validate data
      const processedIssues = issuesData.map((item: any) => {
        // Check for comments in multiple possible locations
        const comment = item.feedback?.comment || item.comment || item.description || '';
        
        // Extract rating from feedback if available, or directly from item
        const rating = item.feedback?.rating || item.rating || 0;
        
        // Extract sentiment from feedback or directly from item
        const sentiment = item.feedback?.sentiment || item.sentiment || 'neutral';
        
        // Extract or determine category
        let category = item.category || item.feedback?.category || '';
        
        // Check for staff responses in multiple possible locations
        let staffResponses = item.staffResponse || item.staffResponses || item.feedback?.staffResponse || [];
        if (!Array.isArray(staffResponses)) {
          staffResponses = [staffResponses].filter(Boolean);
        }
        
        // Map staff responses to our format
        const staffResponse = staffResponses.map((resp: any) => ({
          id: resp._id || resp.id || uuidv4(),
          responder: resp.responder || '',
          responderName: resp.responderName || 'Staff',
          response: resp.response || resp.content || '',
          responseDate: resp.responseDate || resp.createdAt || new Date().toISOString()
        }));
        
        const userName = item.userName || item.user?.name || item.feedback?.user?.name || 'Customer';
        const userEmail = item.userEmail || item.user?.email || item.feedback?.user?.email || 'No email provided';
        
        return {
          id: item._id || item.id,
          feedbackId: item.feedback?._id || item.feedbackId,
          userName,
          userEmail,
          description: item.description || '',
          comment,
          rating,
          sentiment,
          category,
          status: item.status || (item.isResolved ? 'resolved' : 'pending'),
          priority: item.priority || 'medium',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
          staffResponse: staffResponse.length > 0 ? staffResponse : undefined,
          isPublic: item.isPublic !== undefined ? item.isPublic : true
        };
      });
      
      console.log('Processed issues:', processedIssues);
      setIssues(processedIssues);
    } catch (err: any) {
      console.error('Failed to fetch customer issues:', err);
      // More detailed error logging
      console.log('Error response:', err.response?.data);
      console.log('Error status:', err.response?.status);
      
      setError(err.response?.data?.message || 'Failed to load customer issues');
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error('Authentication issue. Please refresh the page or log in again if needed.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to load customer issues');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedIssue || loading) return;
    
    const toastId = toast.loading(`Updating status...`);
    
    try {
      const headers = getAuthHeaders();
      
      await axios.patch(
        `/api/admin/customer-issues/${selectedIssue.id}/status`,
        { status: newStatus },
        { 
          headers,
          withCredentials: true 
        }
      );
      
      const updatedIssue = {
        ...selectedIssue,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        isResolved: newStatus === 'resolved'
      };
      
      // Update the issues array
      setIssues(prev => prev.map(issue => 
        issue.id === selectedIssue.id ? updatedIssue : issue
      ));
      
      // Update selected issue
      setSelectedIssue(updatedIssue);
      
      toast.update(toastId, { 
        render: "Status updated successfully", 
        type: "success", 
        isLoading: false, 
        autoClose: 2000 
      });
    } catch (err: any) {
      console.error('Failed to update status:', err);
      
      // More detailed error logging
      console.log('Error response:', err.response?.data);
      console.log('Error status:', err.response?.status);
      
      // Don't immediately redirect on auth error, just show message
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.update(toastId, { 
          render: "Authentication issue. Please try refreshing the page first.", 
          type: "error", 
          isLoading: false, 
          autoClose: 5000 
        });
      } else {
        toast.update(toastId, { 
          render: err.response?.data?.message || "Failed to update status", 
          type: "error", 
          isLoading: false, 
          autoClose: 3000 
        });
      }
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedIssue || loading) return;
    
    const toastId = toast.loading(`Updating priority...`);
    
    try {
      const headers = getAuthHeaders();
      
      await axios.patch(
        `/api/admin/customer-issues/${selectedIssue.id}/priority`,
        { priority: newPriority },
        { 
          headers,
          withCredentials: true 
        }
      );
      
      const updatedIssue = {
        ...selectedIssue,
        priority: newPriority,
        updatedAt: new Date().toISOString()
      };
      
      // Update the issues array
      setIssues(prev => prev.map(issue => 
        issue.id === selectedIssue.id ? updatedIssue : issue
      ));
      
      // Update selected issue
      setSelectedIssue(updatedIssue);
      
      toast.update(toastId, { 
        render: "Priority updated successfully", 
        type: "success", 
        isLoading: false, 
        autoClose: 2000 
      });
    } catch (err: any) {
      console.error('Failed to update priority:', err);
      
      // More detailed error logging
      console.log('Error response:', err.response?.data);
      console.log('Error status:', err.response?.status);
      
      // Don't immediately redirect on auth error, just show message
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.update(toastId, { 
          render: "Authentication issue. Please try refreshing the page first.", 
          type: "error", 
          isLoading: false, 
          autoClose: 5000 
        });
      } else {
        toast.update(toastId, { 
          render: err.response?.data?.message || "Failed to update priority", 
          type: "error", 
          isLoading: false, 
          autoClose: 3000 
        });
      }
    }
  };

  const handleAddResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedIssue || !responseText.trim() || loading) return;
    
    const toastId = toast.loading("Adding staff response...");
    
    try {
      const headers = getAuthHeaders();
      
      await axios.post(
        `/api/admin/customer-issues/${selectedIssue.id}/notes`,
        { 
          content: responseText.trim()
        },
        { 
          headers,
          withCredentials: true 
        }
      );
      
      // Create a new IssueNote object
      const newNote: IssueNote = {
        id: uuidv4(),
        responder: 'admin',
        responderName: 'Staff Admin',
        response: responseText.trim(),
        responseDate: new Date().toISOString()
      };
      
      const updatedIssue: CustomerIssue = {
        ...selectedIssue,
        // Add the new note to the existing array or create a new array
        staffResponse: selectedIssue.staffResponse ? [...selectedIssue.staffResponse, newNote] : [newNote],
        updatedAt: new Date().toISOString()
      };
      
      // Update the issues array
      setIssues(prev => prev.map(issue => 
        issue.id === selectedIssue.id ? updatedIssue : issue
      ));
      
      // Update selected issue
      setSelectedIssue(updatedIssue);
      
      // Clear response text
      setResponseText('');
      
      toast.update(toastId, { 
        render: "Response added successfully", 
        type: "success", 
        isLoading: false, 
        autoClose: 2000 
      });
    } catch (err: any) {
      console.error('Failed to add response:', err);
      
      // More detailed error logging
      console.log('Error response:', err.response?.data);
      console.log('Error status:', err.response?.status);
      
      // Special case for dangerous content
      if (err.response?.data?.message?.includes('dangerous content')) {
        toast.update(toastId, { 
          render: "Your response contains disallowed content. Please avoid using script tags or event handlers.", 
          type: "error", 
          isLoading: false, 
          autoClose: 4000 
        });
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        toast.update(toastId, { 
          render: "Authentication issue. Please try refreshing the page first.", 
          type: "error", 
          isLoading: false, 
          autoClose: 5000 
        });
      } else {
        toast.update(toastId, { 
          render: err.response?.data?.message || "Failed to add response", 
          type: "error", 
          isLoading: false, 
          autoClose: 3000 
        });
      }
    }
  };

  const handleAddNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedIssue || !noteContent.trim()) {
      toast.error('No issue selected or note content is empty');
      return;
    }
    
    const loadingToast = toast.loading('Adding note...');
    
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/admin/customer-issues/${selectedIssue.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          content: noteContent.trim()
        })
      });
      
      if (response.status === 401) {
        toast.dismiss(loadingToast);
        toast.error('Session expired. Please log in again.');
        // Handle logout or redirect to login
        return;
      }
      
      if (response.status === 400) {
        const errorData = await response.json();
        toast.dismiss(loadingToast);
        toast.error(`Validation error: ${errorData.message || 'Invalid data'}`);
        return;
      }
      
      if (!response.ok) {
        toast.dismiss(loadingToast);
        toast.error('Failed to add note. Please try again.');
        return;
      }
      
      const data = await response.json();
      
      // Update the selected issue with the new note
      if (data.issue) {
        const updatedIssue = {
          ...selectedIssue,
          staffResponse: Array.isArray(data.issue.staffResponse) 
            ? data.issue.staffResponse 
            : selectedIssue.staffResponse 
              ? [...selectedIssue.staffResponse, data.issue.staffResponse as IssueNote]
              : [data.issue.staffResponse as IssueNote]
        };
        
        setSelectedIssue(updatedIssue);
        
        // Update the issue in the issues list
        setIssues(issues.map(issue => 
          issue.id === selectedIssue.id ? updatedIssue : issue
        ));
      }
      
      setNoteContent('');
      toast.dismiss(loadingToast);
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.dismiss(loadingToast);
      toast.error('An error occurred while adding the note');
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date format';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-800 bg-green-100';
      case 'in-progress': return 'text-blue-800 bg-blue-100';
      case 'pending': return 'text-yellow-800 bg-yellow-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-800 bg-red-100';
      case 'high': return 'text-orange-800 bg-orange-100';
      case 'medium': return 'text-yellow-800 bg-yellow-100';
      case 'low': return 'text-green-800 bg-green-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf-token');
      if (!response.ok) {
        throw new Error('Failed to get CSRF token');
      }
      const data = await response.json();
      return data.csrfToken;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  };

  // Add this function to check API connectivity
  const checkApiEndpoint = async () => {
    try {
      const response = await fetch('/api/admin/health-check', { 
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log('API endpoint health check successful');
        return true;
      } else {
        console.error('API endpoint health check failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('API endpoint health check error:', error);
      return false;
    }
  };

  // Add a refresh button that first checks API connectivity
  const handleRefresh = async () => {
    toast.info('Checking connection...');
    
    // First check if API is responsive
    const isApiAvailable = await checkApiEndpoint();
    
    if (isApiAvailable) {
      fetchIssues();
    } else {
      toast.error('Could not connect to server. Please check your connection and authentication.');
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Customer Issues</h1>
          <p className="text-gray-600 text-sm">Manage and respond to customer feedback</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Issues List */}
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, email, or content"
              className="w-full p-2 border border-gray-300 rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded">
            {loading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : issues.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No issues found</div>
            ) : (
              filteredIssues.map(issue => (
                <div 
                  key={issue.id}
                  className={`p-4 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 ${selectedIssue?.id === issue.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedIssue(issue)}
                >
                  <div className="flex justify-between mb-2">
                    <div>
                      <div className="font-medium">{issue.userName}</div>
                      <div className="text-gray-500 text-sm">{issue.userEmail}</div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${getStatusClass(issue.status)}`}>
                        {issue.status}
                      </span>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${getPriorityClass(issue.priority)}`}>
                          {issue.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {issue.rating !== undefined && issue.rating > 0 && (
                    <div className="flex items-center mb-2 text-xs">
                      <div className="flex mr-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg 
                            key={i}
                            className={`h-3 w-3 ${i < (issue.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      
                      {issue.sentiment && (
                        <span className={`mr-2 px-2 py-0.5 text-xs rounded ${
                          issue.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                          issue.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {issue.sentiment}
                        </span>
                      )}
                      
                      {issue.category && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded">
                          {issue.category}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-700 line-clamp-2 mb-2">
                    {issue.comment || 'No comment provided'}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <div>Created: {formatDate(issue.createdAt)}</div>
                    <div>{issue.staffResponse ? 'Has response' : 'No response'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Issue Details */}
        <div>
          {selectedIssue ? (
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Customer Feedback</h2>
                <div className="text-gray-500">
                  {selectedIssue.userName} ({selectedIssue.userEmail})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm mb-1">Status</label>
                  <select
                    value={selectedIssue.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`w-full p-2 border rounded ${getStatusClass(selectedIssue.status)}`}
                    disabled={loading}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Priority</label>
                  <select
                    value={selectedIssue.priority}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className={`w-full p-2 border rounded ${getPriorityClass(selectedIssue.priority)}`}
                    disabled={loading}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium mb-2">Customer Feedback:</h3>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  {/* Show rating if available */}
                  {selectedIssue.rating !== undefined && selectedIssue.rating > 0 && (
                    <div className="flex items-center mb-3">
                      <span className="mr-2 text-sm">Rating:</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg 
                            key={i}
                            className={`h-5 w-5 ${i < (selectedIssue.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show sentiment badge if available */}
                  {selectedIssue.sentiment && (
                    <div className="mb-3">
                      <span className="mr-2 text-sm">Sentiment:</span>
                      <span className={`px-2 py-1 text-xs rounded inline-block ${
                        selectedIssue.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                        selectedIssue.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedIssue.sentiment.charAt(0).toUpperCase() + selectedIssue.sentiment.slice(1)}
                      </span>
                    </div>
                  )}
                  
                  {/* Show category if available */}
                  {selectedIssue.category && (
                    <div className="mb-3">
                      <span className="mr-2 text-sm">Category:</span>
                      <span className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded inline-block">
                        {selectedIssue.category.charAt(0).toUpperCase() + selectedIssue.category.slice(1)}
                      </span>
                    </div>
                  )}
                  
                  {/* Show comment content */}
                  <div className="mt-2">
                    <div className="text-sm font-medium mb-1">Comment:</div>
                    {selectedIssue.comment ? (
                      <p className="whitespace-pre-line">{selectedIssue.comment}</p>
                    ) : selectedIssue.description ? (
                      <p className="whitespace-pre-line">{selectedIssue.description}</p>
                    ) : (
                      <p className="text-gray-500 italic">No comment provided</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <div>Created: {formatDate(selectedIssue.createdAt)}</div>
                  <div>Updated: {formatDate(selectedIssue.updatedAt)}</div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium mb-2">Staff Response:</h3>
                {selectedIssue.staffResponse && selectedIssue.staffResponse.length > 0 ? (
                  <div>
                    {selectedIssue.staffResponse.map((note, index) => (
                      <div key={note.id} className={`p-3 mb-2 ${index === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'} rounded`}>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="font-medium">{note.responderName}</span>
                          <span>{formatDate(note.responseDate)}</span>
                        </div>
                        <p className="whitespace-pre-line">{note.response}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                    No staff response has been added yet.
                  </div>
                )}
              </div>

              {selectedIssue.status !== 'resolved' && (
                <div>
                  <h3 className="font-medium mb-2">Add Response:</h3>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Enter your response to the customer..."
                    className="w-full p-2 border border-gray-300 rounded mb-2"
                    rows={4}
                  />
                  <div className="text-right">
                    <button
                      onClick={handleAddResponse}
                      disabled={!responseText.trim() || loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      Add Response
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded p-4 text-center flex flex-col items-center justify-center" style={{ minHeight: '300px' }}>
              <div className="text-gray-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-1">No Issue Selected</h3>
              <p className="text-gray-500">Select an issue from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerIssuesPage; 