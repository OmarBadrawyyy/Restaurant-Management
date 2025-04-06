import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

interface Table {
  _id: string;
  tableNumber: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  section: 'indoor' | 'outdoor' | 'balcony' | 'private';
  isActive: boolean;
  currentOrder?: {
    orderNumber: string;
    status: string;
  };
  currentReservation?: {
    reservationNumber: string;
    status: string;
  };
  notes: string;
}

interface TableFormData {
  tableNumber: number;
  capacity: number;
  section: string;
  notes: string;
}

const TableManagement: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState<TableFormData>({
    tableNumber: 0,
    capacity: 1,
    section: 'indoor',
    notes: ''
  });
  const [filterSection, setFilterSection] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 30000);
    return () => clearInterval(interval);
  }, [filterSection, filterStatus]);

  const fetchTables = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSection !== 'all') params.append('section', filterSection);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await axios.get('/api/tables', { params });
      if (Array.isArray(response.data)) {
        setTables(response.data);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setTables(response.data.data);
      } else {
        console.error('Unexpected data format:', response.data);
        toast.error('Error loading tables: Invalid data format');
      }
    } catch (error: any) {
      console.error('Error fetching tables:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTable) {
        // Validate the data before sending
        if (!formData.capacity || formData.capacity <= 0) {
          toast.error('Capacity must be a positive number');
          return;
        }

        if (!formData.section) {
          toast.error('Section is required');
          return;
        }

        // Update existing table
        const response = await axios.put(`/api/tables/${selectedTable.tableNumber}`, {
          capacity: parseInt(formData.capacity.toString(), 10),
          section: formData.section,
          notes: formData.notes || ''
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });

        if (response.data?.status === 'success') {
          toast.success(response.data.message);
          await fetchTables(); // Refresh the table list
          handleCloseModal();
        } else {
          throw new Error(response.data?.message || 'Failed to update table');
        }
      } else {
        // Create new table
        if (!formData.tableNumber || formData.tableNumber <= 0) {
          toast.error('Table number must be a positive number');
          return;
        }

        const response = await axios.post('/api/tables', {
          tableNumber: parseInt(formData.tableNumber.toString(), 10),
          capacity: parseInt(formData.capacity.toString(), 10),
          section: formData.section,
          notes: formData.notes || ''
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });

        if (response.data?.status === 'success') {
          toast.success(response.data.message);
          await fetchTables();
          handleCloseModal();
        } else {
          throw new Error(response.data?.message || 'Failed to create table');
        }
      }
    } catch (error: any) {
      console.error('Error submitting table:', error);
      const errorMessage = error.response?.data?.message || 'Operation failed';
      
      switch (error.response?.status) {
        case 400:
          toast.error(errorMessage);
          break;
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          toast.error('Table not found');
          break;
        case 409:
          toast.error('Table number already exists');
          break;
        default:
          toast.error('Failed to save table. Please try again.');
      }
    }
  };

  const handleDeleteClick = (table: Table) => {
    if (!table || !table.tableNumber) {
        toast.error('Invalid table selection');
        return;
    }

    // Check if table has current order
    if (table.currentOrder) {
        toast.error('Cannot delete table with active order');
        return;
    }

    // Check if table has current reservation
    if (table.currentReservation) {
        toast.error('Cannot delete table with active reservation');
        return;
    }

    // Warn if table is not available
    if (table.status !== 'available') {
        toast.warn(`Warning: Table ${table.tableNumber} is currently ${table.status}`);
    }

    setSelectedTable(table);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTable) return;
    
    setDeleteLoading(true);
    try {
      // Ensure table number is a valid positive integer
      const tableNumber = Math.floor(Number(selectedTable.tableNumber));
      
      if (isNaN(tableNumber) || tableNumber <= 0) {
        toast.error('Invalid table number');
        setDeleteLoading(false);
        return;
      }

      const response = await axios.delete(`/api/tables/${tableNumber}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      if (response.data?.status === 'success') {
        toast.success(response.data.message);
        setTables(prevTables => prevTables.filter(t => t.tableNumber !== tableNumber));
        setShowDeleteModal(false);
        setSelectedTable(null);
      } else {
        throw new Error(response.data?.message || 'Failed to delete table');
      }
    } catch (error: any) {
      console.error('Error deleting table:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete table';
      
      switch (error.response?.status) {
        case 400:
          if (errorMessage.includes('future reservations')) {
            toast.error('Cannot delete table with future reservations');
          } else if (errorMessage.includes('active order')) {
            toast.error('Cannot delete table with active order');
          } else {
            toast.error(errorMessage);
          }
          break;
        case 401:
          toast.error('Please log in to delete tables');
          break;
        case 403:
          toast.error('You do not have permission to delete tables');
          break;
        case 404:
          toast.error('Table not found');
          break;
        default:
          toast.error(errorMessage);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: string) => {
    try {
        setUpdateLoading(true);
        // First find the table in our local state
        const table = tables.find(t => t._id === tableId);
        if (!table) {
            toast.error('Table not found');
            return;
        }

        // Update the backend using the correct endpoint for status updates
        const response = await axios.patch(`/api/tables/${tableId}/status`, {
            status: newStatus
        });
        
        if (response.data) {
            // Update local state
            setTables(prevTables => 
                prevTables.map(t => 
                    t._id === tableId 
                        ? { ...t, status: newStatus as Table['status'] }
                        : t
                )
            );
            toast.success(`Table ${table.tableNumber} status updated to ${newStatus}`);
        }
    } catch (error: any) {
        console.error('Error updating table status:', error);
        toast.error(error.response?.data?.message || 'Failed to update table status');
        // Refresh tables to ensure we're in sync with backend
        fetchTables();
    } finally {
        setUpdateLoading(false);
    }
  };

  const handleEdit = (table: Table) => {
    setSelectedTable(table);
    setFormData({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      section: table.section,
      notes: table.notes || ''
    });
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedTable(null);
    setFormData({
      tableNumber: 0,
      capacity: 1,
      section: 'indoor',
      notes: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-red-100 text-red-800';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800';
      case 'maintenance':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Table Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Add New Table
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All Sections</option>
          <option value="indoor">Indoor</option>
          <option value="outdoor">Outdoor</option>
          <option value="balcony">Balcony</option>
          <option value="private">Private</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables.map((table) => (
            <div
              key={table._id}
              className="bg-white rounded-lg shadow-md p-6 relative hover:shadow-lg transition-shadow"
            >
              <div className="absolute top-4 right-4 space-x-2">
                <button
                  onClick={() => handleEdit(table)}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors"
                  aria-label="Edit table"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteClick(table)}
                  className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                  aria-label="Delete table"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <h3 className="text-lg font-semibold mb-2">Table {table.tableNumber}</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Capacity: {table.capacity}</p>
                <p className="text-sm text-gray-600">Section: {table.section}</p>
                <div className="flex items-center relative">
                  <span className="text-sm text-gray-600 mr-2">Status:</span>
                  <select
                    value={table.status}
                    onChange={(e) => handleStatusChange(table._id, e.target.value)}
                    disabled={updateLoading}
                    className={`block w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${getStatusColor(table.status)}`}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  {updateLoading && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                {table.currentOrder && (
                  <p className="text-sm text-gray-600">
                    Current Order: {table.currentOrder.orderNumber}
                  </p>
                )}
                {table.currentReservation && (
                  <p className="text-sm text-gray-600">
                    Reserved: {table.currentReservation.reservationNumber}
                  </p>
                )}
                {table.notes && (
                  <p className="text-sm text-gray-600 mt-2">Notes: {table.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Table {selectedTable.tableNumber}</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete this table? This action cannot be undone.
                {selectedTable.status !== 'available' && (
                  <span className="block mt-2 text-red-600">
                    Warning: This table is currently {selectedTable.status}.
                  </span>
                )}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    'Delete Table'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {showEditModal ? 'Edit Table' : 'Add New Table'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Table Number</label>
                <input
                  type="number"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                  required
                  min="1"
                  disabled={showEditModal}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Section</label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="balcony">Balcony</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {showEditModal ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;