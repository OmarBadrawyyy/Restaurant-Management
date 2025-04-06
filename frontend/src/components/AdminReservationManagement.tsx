import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Reservation {
  _id: string;
  tableId: {
    _id: string;
    tableNumber: number;
    section: string;
    capacity: number;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
    phoneNumber: string;
  };
  date: string;
  time: string;
  guestCount: number;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  specialRequests?: string;
  occasion?: string;
  confirmationCode: string;
}

const AdminReservationManagement: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReservations();
  }, [selectedDate]);

  useEffect(() => {
    filterReservations();
  }, [reservations, statusFilter, searchQuery]);

  const fetchReservations = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      const response = await axios.get('/api/bookings/all', {
        params: {
          date: format(selectedDate, 'yyyy-MM-dd')
        }
      });
      setReservations(response.data.data.bookings);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load reservations');
    } finally {
      setIsLoading(false);
    }
  };

  const filterReservations = () => {
    let filtered = [...reservations];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(res => res.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(res =>
        res.userId.name.toLowerCase().includes(query) ||
        res.userId.email.toLowerCase().includes(query) ||
        res.confirmationCode.toLowerCase().includes(query) ||
        res.tableId.tableNumber.toString().includes(query)
      );
    }

    setFilteredReservations(filtered);
  };

  const handleStatusChange = async (reservationId: string, newStatus: Reservation['status']) => {
    try {
      await axios.put('/api/bookings/edit', {
        bookingId: reservationId,
        status: newStatus
      });
      toast.success('Reservation status updated successfully');
      fetchReservations();
    } catch (error) {
      console.error('Error updating reservation status:', error);
      toast.error('Failed to update reservation status');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'seated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-auto">
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Filter by date"
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              slotProps={{
                textField: {
                  variant: "outlined",
                  size: "small"
                }
              }}
            />
          </LocalizationProvider>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="seated">Seated</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>

          <input
            type="text"
            placeholder="Search by name, email, or confirmation code"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No reservations found for the selected criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReservations.map((reservation) => (
            <div
              key={reservation._id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Table {reservation.tableId.tableNumber}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {reservation.tableId.section} Section - {reservation.tableId.capacity} Seats
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(
                      reservation.status
                    )}`}
                  >
                    {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                  </span>
                  <select
                    value={reservation.status}
                    onChange={(e) => handleStatusChange(reservation._id, e.target.value as Reservation['status'])}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirm</option>
                    <option value="seated">Seat</option>
                    <option value="completed">Complete</option>
                    <option value="cancelled">Cancel</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Reservation Details</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Date:</span>{' '}
                      {new Date(reservation.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Time:</span> {reservation.time}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Guests:</span> {reservation.guestCount}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Confirmation Code:</span>{' '}
                      {reservation.confirmationCode}
                    </p>
                    {reservation.occasion && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Occasion:</span>{' '}
                        {reservation.occasion}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Guest Information</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Name:</span> {reservation.userId.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span> {reservation.userId.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {reservation.userId.phoneNumber}
                    </p>
                    {reservation.specialRequests && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Special Requests:</p>
                        <p className="text-sm text-gray-600 mt-1">{reservation.specialRequests}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReservationManagement; 