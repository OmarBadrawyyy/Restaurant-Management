import express from 'express';
import {
    reserveTable,
    deleteBooking,
    editBooking,
    cancelAllReservations,
    getAllBookings,
    getUserBookings,
    checkAvailabilityByDate
} from '../Controllers/bookingController.js';
import { protect, isAdmin } from '../middlewares/authMiddleware.js';
import { bookingLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Apply rate limiting to all booking routes
router.use(bookingLimiter);

/**
 * @swagger
 * /api/bookings/reserve:
 *   post:
 *     summary: Reserve a table
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableId
 *               - date
 *               - time
 *               - guestCount
 *             properties:
 *               tableId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               guestCount:
 *                 type: number
 *               specialRequests:
 *                 type: string
 *               occasion:
 *                 type: string
 *               duration:
 *                 type: number
 *     responses:
 *       201:
 *         description: Booking created successfully
 */
router.post('/reserve', protect, reserveTable);

/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   delete:
 *     summary: Delete a booking (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 */
router.delete('/:bookingId', protect, isAdmin, deleteBooking);

/**
 * @swagger
 * /api/bookings/edit:
 *   put:
 *     summary: Edit an existing booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *             properties:
 *               bookingId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *               guestCount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Booking updated successfully
 */
router.put('/edit', protect, editBooking);

/**
 * @swagger
 * /api/bookings/cancel-all:
 *   delete:
 *     summary: Cancel all reservations for a specific date (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: All reservations cancelled successfully
 */
router.delete('/cancel-all', protect, isAdmin, cancelAllReservations);

/**
 * @swagger
 * /api/bookings/all:
 *   get:
 *     summary: Get all bookings (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: tableId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of all bookings
 */
router.get('/all', protect, isAdmin, getAllBookings);

/**
 * @swagger
 * /api/bookings/my-bookings:
 *   get:
 *     summary: Get user's bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's bookings
 */
router.get('/my-bookings', protect, getUserBookings);

/**
 * @swagger
 * /api/bookings/check-availability:
 *   post:
 *     summary: Check availability of tables by date and time
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - time
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               guestCount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Availability status of tables
 */
router.post('/check-availability', protect, checkAvailabilityByDate);

export default router;
