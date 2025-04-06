import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { refreshCsrfToken } from '../services/menuService';

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

const CustomerIssuesManager: React.FC = () => {
  const [issues, setIssues] = useState<CustomerIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<CustomerIssue | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch customer issues on component mount
  useEffect(() => {
    fetchIssues();
  }, []);

  // Filter issues based on search term and filters
  const filteredIssues = issues.filter(issue => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      issue.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.description && issue.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (issue.comment && issue.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    
    // Priority filter
    const matchesPriority = priorityFilter === 'all' || issue.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/manager/customer-issues', {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Handle both nested and direct data formats
      const issuesData = Array.isArray(response.data) ? response.data :
                        Array.isArray(response.data.data) ? response.data.data :
                        [];
      
      console.log('Fetched issues:', issuesData);
      setIssues(issuesData);
    } catch (error: any) {
      console.error('Error fetching issues:', error);
      setError(error.response?.data?.message || 'Failed to fetch customer issues');
      toast.error(error.response?.data?.message || 'Failed to fetch customer issues');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (issueId: string, note: string) => {
    try {
      const response = await axios.post(`/api/manager/customer-issues/${issueId}/notes`, {
        note,
        timestamp: new Date().toISOString()
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.status === 'success') {
        toast.success('Note added successfully');
        await fetchIssues(); // Refresh the issues list
      }
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error(error.response?.data?.message || 'Failed to add note');
    }
  };

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const response = await axios.patch(`/api/manager/customer-issues/${issueId}/status`, {
        status: newStatus
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.status === 'success') {
        toast.success(`Status updated to ${newStatus}`);
        await fetchIssues(); // Refresh the issues list
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !responseText.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await axios.post(`/api/manager/customer-issues/${selectedIssue.id}/notes`, {
        content: responseText,
        note: responseText
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': await refreshCsrfToken()
        }
      });
      
      if (response.data) {
        const updatedIssue = response.data;
        
        if (!updatedIssue.staffResponse) {
          const newNote = {
            id: uuidv4(),
            responder: 'staff',
            responderName: 'Manager',
            response: responseText,
            responseDate: new Date().toISOString()
          };
          
          const manuallyUpdatedIssue = {
            ...selectedIssue,
            status: 'in-progress',
            staffResponse: [
              ...(selectedIssue.staffResponse || []),
              newNote
            ]
          };
          
          setIssues(prevIssues => 
            prevIssues.map(issue => 
              issue.id === selectedIssue.id ? manuallyUpdatedIssue : issue
            )
          );
          
          setSelectedIssue(manuallyUpdatedIssue);
        } else {
          setIssues(prevIssues => 
            prevIssues.map(issue => 
              issue.id === selectedIssue.id ? updatedIssue : issue
            )
          );
          
          setSelectedIssue(updatedIssue);
        }
        
        setResponseText('');
        
        toast.success('Response submitted successfully');
      }
    } catch (err: any) {
      console.error('Failed to add response:', err);
      toast.error(err.response?.data?.message || 'Failed to submit response. Please try again.');
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error('You do not have permission to respond to this issue or your session has expired.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to get CSS class for status badge
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get CSS class for priority badge
  const getPriorityClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Issues</h1>
              <p className="text-gray-500 text-sm mt-1">Manage and respond to customer feedback</p>
            </div>
            <button 
              onClick={fetchIssues}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Issues List */}
            <div className="flex flex-col h-[calc(100vh-240px)]">
              <div className="space-y-4 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, or content"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Priorities</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto rounded-lg">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No issues found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredIssues.map(issue => (
                      <div 
                        key={issue.id}
                        className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md
                          ${selectedIssue?.id === issue.id 
                            ? 'border-blue-200 bg-blue-50 ring-2 ring-blue-500 ring-opacity-50' 
                            : 'border-gray-200 bg-white hover:border-blue-200'}`}
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium text-gray-900">{issue.userName}</div>
                            <div className="text-gray-500 text-sm">{issue.userEmail}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusClass(issue.status)}`}>
                              {issue.status}
                            </span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityClass(issue.priority)}`}>
                              {issue.priority}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 line-clamp-2 mb-2">
                          {issue.comment || issue.description || 'No description'}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(issue.createdAt).toLocaleDateString()}
                          {issue.staffResponse && issue.staffResponse.length > 0 && (
                            <span className="ml-3 flex items-center text-blue-600">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                              {issue.staffResponse.length} {issue.staffResponse.length === 1 ? 'response' : 'responses'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Issue Details */}
            <div className="bg-white rounded-lg border border-gray-200 h-[calc(100vh-240px)] overflow-y-auto">
              {selectedIssue ? (
                <div className="p-6">
                  <div className="border-b border-gray-200 pb-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedIssue.userName}</h2>
                        <p className="text-gray-600 mt-1">{selectedIssue.userEmail}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusClass(selectedIssue.status)}`}>
                          {selectedIssue.status}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityClass(selectedIssue.priority)}`}>
                          {selectedIssue.priority}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">Issue Details</h3>
                      <p className="text-gray-700">
                        {selectedIssue.comment || selectedIssue.description || 'No description provided'}
                      </p>
                      {selectedIssue.rating !== undefined && (
                        <div className="mt-3 flex items-center">
                          <span className="text-sm text-gray-700 mr-2">Rating:</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, index) => (
                              <svg
                                key={index}
                                className={`w-4 h-4 ${index < selectedIssue.rating! ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 text-sm text-gray-500 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Submitted on {new Date(selectedIssue.createdAt).toLocaleDateString()} at {new Date(selectedIssue.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Responses</h3>
                    <div className="space-y-4 mb-6">
                      {selectedIssue.staffResponse && selectedIssue.staffResponse.length > 0 ? (
                        selectedIssue.staffResponse.map(note => (
                          <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium text-gray-900">{note.responderName}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(note.responseDate).toLocaleDateString()}
                              </div>
                            </div>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.response}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <p>No responses yet</p>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSubmitResponse}>
                      <div className="relative">
                        <textarea
                          className="w-full p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={4}
                          placeholder="Type your response here..."
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          disabled={submitting}
                        ></textarea>
                        <div className="absolute bottom-2 right-2">
                          <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={submitting || !responseText.trim()}
                          >
                            {submitting ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Submit Response
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-lg font-medium">Select an issue to view details</p>
                  <p className="mt-1">Choose from the list on the left to view and respond to customer issues</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerIssuesManager; 