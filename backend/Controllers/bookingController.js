import { bookingModel } from '../schemas/bookingSchema.js';
import { tableModel } from '../schemas/tableSchema.js';
import { userModel } from '../schemas/userSchema.js';

export const reserveTable = async (req, res) => {
    try {
        const { tableId, date, time, guestCount, specialRequests, occasion, duration, source, contactPhone, contactEmail, notes } = req.body;
        const userId = req.user._id;

        if (!tableId || !date || !time || !guestCount) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Required fields missing: tableId, date, time, and guestCount are required.' 
            });
        }

        const existingTable = await tableModel.findById(tableId);
        if (!existingTable) {
            return res.status(404).json({ 
                status: 'error',
                message: "Table not found."
            });
        }

        // Check if table is available
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const [hours, minutes] = time.split(':').map(Number);
        const bookingDateTime = new Date(date);
        bookingDateTime.setHours(hours, minutes, 0, 0);

        // Check existing bookings
        const existingBooking = await bookingModel.findOne({
            tableId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            time,
            status: { $in: ['pending', 'confirmed', 'seated'] }
        });

        if (existingBooking) {
            return res.status(400).json({ 
                status: 'error',
                message: "Table is already reserved for this date and time."
            });
        }

        // Check if table can accommodate guests
        if (guestCount > existingTable.capacity) {
            return res.status(400).json({ 
                status: 'error',
                message: `Table can only accommodate ${existingTable.capacity} guests.`
            });
        }

        const bookingData = {
            tableId,
            userId,
            date,
            time,
            guestCount,
            status: 'confirmed',
            statusHistory: [{ status: 'confirmed', note: 'Automatically confirmed on creation' }]
        };

        // Add optional fields if provided
        if (specialRequests) bookingData.specialRequests = specialRequests;
        if (occasion) bookingData.occasion = occasion;
        if (duration) bookingData.duration = duration;
        if (source) bookingData.source = source;
        if (contactPhone) bookingData.contactPhone = contactPhone;
        if (contactEmail) bookingData.contactEmail = contactEmail;
        if (notes) bookingData.notes = notes;

        const newBooking = new bookingModel(bookingData);
        await newBooking.save();

        return res.status(201).json({
            status: 'success',
            message: 'Booking confirmed successfully',
            data: {
                booking: newBooking
            }
        });

    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            error: error.message 
        });
    }
};

export const deleteBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!bookingId) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Booking ID is required.' 
            });
        }

        const deletedBooking = await bookingModel.findByIdAndDelete(bookingId);

        if (!deletedBooking) {
            return res.status(404).json({ 
                status: 'error',
                message: 'Booking not found.' 
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Booking deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            error: error.message 
        });
    }
};

export const editBooking = async (req, res) => {
    try {
        const { bookingId, date, time, guestCount, specialRequests, occasion, status } = req.body;
        const userId = req.user._id;

        if (!bookingId) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Booking ID is required.' 
            });
        }

        const existingBooking = await bookingModel.findById(bookingId);

        if (!existingBooking) {
            return res.status(404).json({ 
                status: 'error',
                message: 'Booking not found.' 
            });
        }

        // Check if user owns the booking or is admin/manager
        if (existingBooking.userId.toString() !== userId.toString() && 
            req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ 
                status: 'error',
                message: 'You are not authorized to edit this booking.' 
            });
        }

        // Update fields if provided
        if (date) existingBooking.date = date;
        if (time) existingBooking.time = time;
        if (guestCount) existingBooking.guestCount = guestCount;
        if (specialRequests) existingBooking.specialRequests = specialRequests;
        if (occasion) existingBooking.occasion = occasion;
        
        // If status change, add to history
        if (status && status !== existingBooking.status) {
            existingBooking.status = status;
            existingBooking.statusHistory.push({
                status,
                timestamp: new Date(),
                note: 'Status updated by ' + (req.user.role === 'admin' ? 'admin' : req.user.role === 'manager' ? 'manager' : 'user')
            });
        }

        await existingBooking.save();

        return res.status(200).json({
            status: 'success',
            message: 'Booking updated successfully',
            data: {
                booking: existingBooking
            }
        });

    } catch (error) {
        console.error('Error editing booking:', error);
        return res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            error: error.message 
        });
    }
};

export const cancelAllReservations = async (req, res) => {
    try {
        const { date } = req.body;

        if (!date) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Date is required.' 
            });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await bookingModel.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
            status: { $in: ['pending', 'confirmed'] }
        });

        if (bookings.length === 0) {
            return res.status(404).json({ 
                status: 'error',
                message: 'No active bookings found for the specified date.' 
            });
        }

        // Update all bookings to cancelled
        for (const booking of bookings) {
            booking.status = 'cancelled';
            booking.statusHistory.push({
                status: 'cancelled',
                timestamp: new Date(),
                note: `Cancelled by ${req.user.role}`
            });
            await booking.save();
        }

        return res.status(200).json({
            status: 'success',
            message: `All reservations for ${date} have been cancelled successfully.`,
            data: {
                count: bookings.length
            }
        });

    } catch (error) {
        console.error('Error cancelling all reservations:', error);
        return res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            error: error.message 
        });
    }
};

export const getAllBookings = async (req, res) => {
    try {
        const { status, date, tableId, userId } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (tableId) filter.tableId = tableId;
        if (userId) filter.userId = userId;
        
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            filter.date = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        const bookings = await bookingModel.find(filter)
            .populate('tableId', 'tableNumber capacity location')
            .populate('userId', 'name email');

        return res.status(200).json({
            status: 'success',
            results: bookings.length,
            data: {
                bookings
            }
        });

    } catch (error) {
        console.error('Error fetching bookings:', error);
        return res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            error: error.message 
        });
    }
};

export const getUserBookings = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const bookings = await bookingModel.find({ userId })
            .populate('tableId', 'tableNumber capacity location')
            .sort({ date: 1, time: 1 });

        return res.status(200).json({
            status: 'success',
            results: bookings.length,
            data: {
                bookings
            }
        });

    } catch (error) {
        console.error('Error fetching user bookings:', error);
        return res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            error: error.message 
        });
    }
};

export const checkAvailabilityByDate = async (req, res) => {
    try {
        const { date, time, guestCount } = req.body;

        if (!date || !time) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Date and time are required.' 
            });
        }

        // Find tables that can accommodate guest count
        const query = {};
        if (guestCount) {
            query.capacity = { $gte: guestCount };
        }

        const tables = await tableModel.find(query);
        
        if (tables.length === 0) {
            return res.status(404).json({ 
                status: 'error',
                message: 'No suitable tables found.' 
            });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Find existing bookings for that date
        const existingBookings = await bookingModel.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            time,
            status: { $in: ['pending', 'confirmed', 'seated'] }
        });

        // Get IDs of booked tables
        const bookedTableIds = existingBookings.map(booking => booking.tableId.toString());
        
        // Filter available tables
        const availableTables = tables.filter(table => 
            !bookedTableIds.includes(table._id.toString())
        );

        return res.status(200).json({
            status: 'success',
            data: {
                available: availableTables.length > 0,
                availableTables
            }
        });

    } catch (error) {
        console.error('Error checking availability:', error);
        return res.status(500).json({ 
            status: 'error',
            message: 'Internal server error',
            error: error.message 
        });
    }
};
