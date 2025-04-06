import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import ConfirmationModal from './ConfirmationModal';

interface Table {
  _id: string;
  tableNumber: number;
  capacity: number;
  isAvailableForReservation: boolean;
  occupationDuration?: number;
}

interface Reservation {
  _id: string;
  tableId: Table;  // Changed from string to Table interface
  date: string;
  time: string;
  guests: number;
  status: string;
  confirmationCode: string;
  occasion?: string;
}

const ReservationsList: React.FC = () => {
  const { currentUser } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, [currentUser]);

  const fetchReservations = async () => {
    try {
      const response = await axios.get('/api/bookings/my-bookings');
      // Ensure we're setting an array, even if empty
      setReservations(Array.isArray(response.data) ? response.data : 
                     response.data?.data?.bookings ? response.data.data.bookings : []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to fetch reservations');
      setReservations([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedReservation) return;

    try {
      await axios.put('/api/bookings/edit', {
        bookingId: selectedReservation._id,
        status: 'cancelled'
      });
      toast.success('Reservation cancelled successfully');
      setShowCancelModal(false);
      setSelectedReservation(null);
      fetchReservations();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel reservation');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900">My Reservations</h2>
      {!Array.isArray(reservations) || reservations.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No reservations found.</p>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div
              key={reservation._id}
              id={`reservation-${reservation._id}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Table {reservation.tableId.tableNumber}
                  </h3>
                  <p className="text-sm text-gray-500">Capacity: {reservation.tableId.capacity} guests</p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                    reservation.status
                  )}`}
                >
                  {reservation.status}
                </span>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date: {new Date(reservation.date).toLocaleDateString()}</p>
                  <p className="text-gray-500">Time: {reservation.time}</p>
                  <p className="text-gray-500">Guests: {reservation.guests}</p>
                </div>
                <div>
                  <p className="text-gray-500">Confirmation Code: {reservation.confirmationCode}</p>
                  {reservation.occasion && (
                    <p className="text-gray-500">Occasion: {reservation.occasion}</p>
                  )}
                </div>
              </div>

              {reservation.status !== 'cancelled' && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleCancelClick(reservation)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Cancel Reservation
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedReservation(null);
        }}
        onConfirm={handleCancelConfirm}
        title="Cancel Reservation"
        message={`Are you sure you want to cancel your reservation for Table ${selectedReservation?.tableId.tableNumber} on ${selectedReservation ? new Date(selectedReservation.date).toLocaleDateString() : ''} at ${selectedReservation?.time}?`}
        confirmText="Yes, Cancel Reservation"
        cancelText="No, Keep Reservation"
        type="danger"
      />
    </div>
  );
};

export default ReservationsList; 