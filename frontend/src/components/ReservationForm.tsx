import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { FaUsers, FaChair } from 'react-icons/fa';
import { MdTableRestaurant } from 'react-icons/md';
import { IconBaseProps } from 'react-icons';

interface Table {
  _id: string;
  tableNumber: number;
  capacity: number;
  section: string;
  shape: string;
  features: string[];
  status: string;
  isActive: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  role: string;
}

interface ReservationFormProps {
  onSuccess?: () => void;
}

const ReservationForm: React.FC<ReservationFormProps> = ({ onSuccess }) => {
  const { currentUser } = useAuth();

  // Generate all possible time slots
  const timeSlots: string[] = [];
  for (let hour = 11; hour <= 22; hour++) {
    const formattedHour = hour.toString().padStart(2, '0');
    for (let minute of ['00', '30']) {
      timeSlots.push(`${formattedHour}:${minute}`);
    }
  }

  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [occasion, setOccasion] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(timeSlots);
  const [reservedTimeSlots, setReservedTimeSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false);
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(true);

  const occasions = ['birthday', 'anniversary', 'business', 'date', 'family', 'other'];

  // Create icon components to fix TypeScript issues
  const TableIcon = MdTableRestaurant as React.FC<IconBaseProps>;
  const ChairIcon = FaChair as React.FC<IconBaseProps>;
  const UsersIcon = FaUsers as React.FC<IconBaseProps>;

  // Fetch all tables on component mount
  useEffect(() => {
    const fetchTables = async () => {
      setIsLoadingTables(true);
      try {
        const response = await axios.get('/api/tables/available');
        const tables = response.data.data.filter(
          (table: Table) => table.status === 'available' && table.isActive
        );
        setTables(tables);
        if (tables.length === 0) {
          toast.error('No tables available at the moment');
        }
      } catch (error) {
        console.error('Error fetching tables:', error);
        toast.error('Error loading available tables');
        setTables([]);
      } finally {
        setIsLoadingTables(false);
      }
    };

    fetchTables();
    
    // Auto-fill contact phone from current user
    if (currentUser?.phoneNumber) {
      setContactPhone(currentUser.phoneNumber);
    }
  }, [currentUser]);

  // Add effect to update phone if user changes
  useEffect(() => {
    if (currentUser?.phoneNumber) {
      setContactPhone(currentUser.phoneNumber);
    }
  }, [currentUser?.phoneNumber]);

  // Initialize by checking availability on component mount if table is selected
  useEffect(() => {
    if (selectedTable && date) {
      // Set all slots as reserved initially until we know which are available
      setReservedTimeSlots(timeSlots);
      checkTableAvailability(selectedTable, date);
    }
  }, [selectedTable, date]);

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setDate(newDate);
      setTime('');
      // Set all slots as reserved initially
      setReservedTimeSlots(timeSlots);
    }
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTable(tableId);
    setTime('');
    // Set all slots as reserved initially
    setReservedTimeSlots(timeSlots);
  };

  const checkTableAvailability = async (tableId: string, selectedDate: Date) => {
    if (!tableId || !selectedDate) return;

    setIsCheckingAvailability(true);
    try {
      // Format date properly to avoid timezone issues
      const formattedDate = new Date(selectedDate);
      formattedDate.setHours(12); // Set to noon to avoid timezone issues
      const dateString = formattedDate.toISOString().split('T')[0];
      
      // Initialize all time slots as reserved
      let initialReservedSlots = [...timeSlots];
      
      // Check each time slot's availability
      const availabilityPromises = timeSlots.map(slot => 
        axios.post('/api/bookings/check-availability', {
          date: dateString,
          time: slot,
          tableId
        })
      );

      const results = await Promise.all(availabilityPromises);
      
      // If a slot is available, remove it from the reserved slots
      const availableSlots: string[] = [];
      const reservedSlots: string[] = [];
      
      results.forEach((result, index) => {
        const slot = timeSlots[index];
        if (result.data.data.available === true) {
          availableSlots.push(slot);
        } else {
          reservedSlots.push(slot);
        }
      });

      console.log('Reserved slots:', reservedSlots);
      setReservedTimeSlots(reservedSlots);
      
      if (availableSlots.length === 0) {
        toast.error('No time slots available for this table on the selected date');
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Error checking table availability');
      setReservedTimeSlots([]);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !time) {
      toast.error('Please select both table and time');
      return;
    }

    setIsLoading(true);
    try {
      // Format the time to ensure it matches the backend expectation
      const formattedTime = time.padStart(5, '0'); // Ensure format is "HH:mm"
      
      // Format date properly to avoid timezone issues
      const formattedDate = new Date(date);
      formattedDate.setHours(12); // Set to noon to avoid timezone issues
      const dateString = formattedDate.toISOString().split('T')[0];

      const response = await axios.post('/api/bookings/reserve', {
        tableId: selectedTable,
        date: dateString,
        time: formattedTime,
        guestCount,
        specialRequests,
        occasion,
        contactPhone,
        source: 'website'
      });

      if (response.data.status === 'success') {
        toast.success('Reservation created successfully!');
        if (onSuccess) onSuccess();
        
        // Reset form
        setDate(new Date());
        setTime('');
        setGuestCount(2);
        setSpecialRequests('');
        setOccasion('');
        setContactPhone('');
        setSelectedTable('');
        setAvailableTimeSlots(timeSlots);
      } else {
        toast.error(response.data.message || 'Error creating reservation');
      }
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      toast.error(error.response?.data?.message || 'Error creating reservation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Make a Reservation</h2>
        
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="w-full absolute top-1/2 h-0.5 bg-gray-200"></div>
            <div className="relative z-10 flex justify-between w-full">
              <div className={`flex flex-col items-center ${!selectedTable ? 'text-blue-600' : 'text-green-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!selectedTable ? 'bg-blue-600' : 'bg-green-600'} text-white mb-2`}>
                  1
                </div>
                <span className="text-sm font-medium">Select Table</span>
              </div>
              <div className={`flex flex-col items-center ${selectedTable && !time ? 'text-blue-600' : time ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedTable && !time ? 'bg-blue-600' : time ? 'bg-green-600' : 'bg-gray-200'} text-white mb-2`}>
                  2
                </div>
                <span className="text-sm font-medium">Choose Time</span>
              </div>
              <div className={`flex flex-col items-center ${time ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${time ? 'bg-blue-600' : 'bg-gray-200'} text-white mb-2`}>
                  3
                </div>
                <span className="text-sm font-medium">Details</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Table Selection */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Select Your Table</h3>
            {isLoadingTables ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tables.map((table) => (
                  <button
                    key={table._id}
                    type="button"
                    onClick={() => handleTableSelect(table._id)}
                    className={`relative group transition-all duration-300 ${
                      selectedTable === table._id
                        ? 'ring-2 ring-blue-500 scale-105'
                        : 'hover:scale-105'
                    }`}
                  >
                    <div className={`
                      relative overflow-hidden rounded-lg shadow-md
                      ${selectedTable === table._id ? 'bg-blue-50' : 'bg-white'}
                      transition-colors duration-300
                    `}>
                      {/* Table visualization components */}
                      <div className={`
                        px-4 py-3 border-b
                        ${selectedTable === table._id ? 'bg-blue-100 border-blue-200' : 'bg-gray-50 border-gray-100'}
                      `}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <TableIcon size={20} className={`${selectedTable === table._id ? 'text-blue-600' : 'text-gray-600'}`} />
                            <span className="font-semibold text-gray-800">Table {table.tableNumber}</span>
                          </div>
                          <span className={`
                            px-3 py-1 rounded-full text-sm font-medium
                            ${selectedTable === table._id ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'}
                          `}>
                            {table.section}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="relative w-full aspect-[4/3] mb-4">
                          <div className={`
                            absolute inset-0 border-4 rounded-lg flex items-center justify-center
                            ${selectedTable === table._id ? 'border-blue-300' : 'border-gray-200'}
                          `}>
                            <div className="grid grid-cols-2 gap-2 p-2">
                              {[...Array(Math.min(table.capacity, 8))].map((_, i) => (
                                <div key={i} className="flex items-center justify-center">
                                  <ChairIcon size={16} className={`
                                    transform rotate-0
                                    ${selectedTable === table._id ? 'text-blue-500' : 'text-gray-400'}
                                  `} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <UsersIcon size={16} className={`${selectedTable === table._id ? 'text-blue-500' : 'text-gray-500'}`} />
                              <span className="text-gray-600">Capacity</span>
                            </div>
                            <span className="font-medium text-gray-800">{table.capacity} Guests</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Date and Time Selection */}
          {selectedTable && (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">2. Choose Date & Time</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      value={date}
                      onChange={handleDateChange}
                      minDate={new Date()}
                      format="MM/dd/yyyy"
                      slotProps={{
                        textField: {
                          variant: "outlined",
                          fullWidth: true,
                          error: false
                        }
                      }}
                    />
                  </LocalizationProvider>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Slots {!selectedTable && "(Select a table to check availability)"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {isCheckingAvailability ? (
                      <div className="col-span-3 flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      timeSlots.map((slot) => {
                        const isReserved = reservedTimeSlots.includes(slot);
                        const canSelect = selectedTable && !isReserved;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => canSelect && setTime(slot)}
                            disabled={!canSelect}
                            className={`
                              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                              ${time === slot ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-700' : 
                                isReserved ? 'bg-red-200 text-red-700 border border-red-300 cursor-not-allowed' :
                                !selectedTable ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed' :
                                'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
                              }
                            `}
                            title={
                              !selectedTable ? "Select a table first" :
                              isReserved ? "This time slot is not available" :
                              "Select this time slot"
                            }
                          >
                            {slot}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Additional Details */}
          {selectedTable && time && (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">3. Enter Additional Details</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Guests
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Occasion (Optional)
                    </label>
                    <select
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select occasion</option>
                      {occasions.map((occ) => (
                        <option key={occ} value={occ}>
                          {occ.charAt(0).toUpperCase() + occ.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 text-lg font-medium"
                >
                  {isLoading ? 'Creating...' : 'Confirm Reservation'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </LocalizationProvider>
  );
};

export default ReservationForm; 