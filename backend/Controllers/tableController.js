import { tableModel } from '../schemas/tableSchema.js';
import { bookingModel } from '../schemas/bookingSchema.js';
import logger from '../config/logger.js';
import { sanitizeInput } from '../utils/sanitizer.js';

/**
 * Create a new table
 * @route POST /api/tables
 * @access Private - Admin/Manager only
 */
export const createTable = async (req, res) => {
    try {
        const { tableNumber, capacity, section, shape, features, minSpendRequired } = sanitizeInput(req.body);

        // Validate required fields
        if (!tableNumber || !capacity) {
            return res.status(400).json({ message: 'Table number and capacity are required' });
        }

        // Validate table number
        if (!Number.isInteger(Number(tableNumber)) || Number(tableNumber) <= 0) {
            return res.status(400).json({ message: 'Table number must be a positive integer' });
        }

        // Validate capacity
        if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
            return res.status(400).json({ message: 'Capacity must be a positive integer' });
        }

        // Check if the table number already exists
        const existingTable = await tableModel.findOne({ tableNumber });
        if (existingTable) {
            return res.status(409).json({ message: `Table number ${tableNumber} is already registered` });
        }

        // Create the new table with sanitized data
        const newTable = new tableModel({
            tableNumber,
            capacity,
            section: section || 'indoor',
            shape: shape || 'rectangular',
            features: features || [],
            minSpendRequired: minSpendRequired || 0
        });

        // Save with timeout protection
        const savedTable = await newTable.save({ maxTimeMS: 5000 });

        // Log the table creation
        logger.info(`Table ${tableNumber} created successfully`, {
            userId: req.user?._id,
            tableId: savedTable._id,
            tableNumber
        });

        // Return success response
        res.status(201).json({
            message: 'Table created successfully',
            table: savedTable
        });
    } catch (error) {
        logger.error(`Error creating table: ${error.message}`, {
            userId: req.user?._id,
            body: req.body,
            error: error.stack
        });

        // Handle specific validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Invalid table data',
                errors: Object.values(error.errors).map(e => e.message)
            });
        }

        res.status(500).json({ message: 'Failed to create table', error: error.message });
    }
};

/**
 * Remove a table
 * @route DELETE /api/tables/:tableNumber
 * @access Private - Admin/Manager only
 */
export const removeTable = async (req, res) => {
    try {
        const { tableNumber } = req.params;

        // Validate table number
        if (!tableNumber || isNaN(tableNumber)) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Invalid table number' 
            });
        }

        // Find the table first
        const table = await tableModel.findOne({ tableNumber });
        
        if (!table) {
            return res.status(404).json({ 
                status: 'error',
                message: 'Table not found' 
            });
        }

        // Check if table has active order
        if (table.currentOrder) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Cannot delete table with active order' 
            });
        }

        // Check for future reservations
        const existingBooking = await bookingModel.findOne({ 
            tableNumber,
            date: { $gte: new Date() }
        });
        
        if (existingBooking) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Table cannot be deleted because it has future reservations',
                bookingId: existingBooking._id
            });
        }

        // Delete the table
        await tableModel.findOneAndDelete({ tableNumber });

        // Log the successful deletion
        logger.info(`Table ${tableNumber} deleted successfully`, {
            userId: req.user?._id,
            tableNumber
        });

        // Return success response
        return res.status(200).json({
            status: 'success',
            message: `Table ${tableNumber} deleted successfully`
        });

    } catch (error) {
        logger.error(`Error deleting table: ${error.message}`, {
            userId: req.user?._id,
            params: req.params,
            error: error.stack
        });

        return res.status(500).json({ 
            status: 'error',
            message: 'Failed to delete table',
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
};

/**
 * Update table details
 * @route PUT /api/tables/:tableNumber
 * @access Private - Admin/Manager only
 */
export const updateTable = async (req, res) => {
    try {
        const { tableNumber } = req.params;
        const updates = sanitizeInput(req.body);
        
        // Convert tableNumber to number and validate
        const parsedTableNumber = parseInt(tableNumber, 10);
        if (isNaN(parsedTableNumber) || parsedTableNumber <= 0) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Invalid table number' 
            });
        }

        // Prevent updating tableNumber itself
        if (updates.tableNumber) {
            delete updates.tableNumber;
        }

        // Validate numeric fields
        if (updates.capacity && (!Number.isInteger(Number(updates.capacity)) || Number(updates.capacity) <= 0)) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Capacity must be a positive integer' 
            });
        }

        // Validate section
        if (updates.section && !['indoor', 'outdoor', 'balcony', 'private'].includes(updates.section)) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Invalid section value' 
            });
        }

        // Find and update the table
        const existingTable = await tableModel.findOne({ tableNumber: parsedTableNumber });
        if (!existingTable) {
            return res.status(404).json({ 
                status: 'error',
                message: 'Table not found' 
            });
        }

        // Update the table
        const updatedTable = await tableModel.findOneAndUpdate(
            { tableNumber: parsedTableNumber },
            updates,
            { 
                new: true,
                runValidators: true
            }
        );

        // Log the table update
        logger.info(`Table ${tableNumber} updated successfully`, {
            userId: req.user?._id,
            tableNumber: parsedTableNumber,
            updates: Object.keys(updates)
        });

        return res.status(200).json({ 
            status: 'success',
            message: 'Table updated successfully',
            table: updatedTable
        });
    } catch (error) {
        logger.error(`Error updating table: ${error.message}`, {
            userId: req.user?._id,
            params: req.params,
            body: req.body,
            error: error.stack
        });

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid table data',
                errors: Object.values(error.errors).map(e => e.message)
            });
        }

        return res.status(500).json({ 
            status: 'error',
            message: 'Failed to update table',
            error: process.env.NODE_ENV === 'production' ? undefined : error.message
        });
    }
};

/**
 * Get available tables with filtering
 * @route GET /api/tables/available
 * @access Public
 */
export const getAvailableTables = async (req, res) => {
    try {
        const { capacity, section, features } = sanitizeInput(req.query);
        
        // Build filters object
        const filters = {};
        
        if (capacity) {
            filters.minCapacity = Number(capacity);
        }
        
        if (section) {
            filters.section = section;
        }
        
        if (features) {
            filters.features = Array.isArray(features) ? features : [features];
        }
        
        // Use the static method with timeout protection
        const availableTables = await tableModel.findAvailableTables(filters, { timeout: 5000 });
        
        // Log the response for debugging
        logger.info(`Found ${availableTables.length} available tables`, {
            filters,
            tableIds: availableTables.map(t => t._id)
        });
        
        res.status(200).json({
            success: true,
            data: availableTables
        });
    } catch (error) {
        logger.error(`Error fetching available tables: ${error.message}`, {
            userId: req.user?._id,
            query: req.query,
            error: error.stack
        });

        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid parameter format' });
        }

        res.status(500).json({ message: 'Failed to fetch available tables', error: error.message });
    }
};

/**
 * Get all tables with optional filtering
 * @route GET /api/tables
 * @access Private - Admin/Manager only
 */
export const getAllTables = async (req, res) => {
    try {
        const { section, status } = sanitizeInput(req.query);
        const query = {};

        // Apply filters if provided
        if (section && section !== 'all') {
            query.section = section;
        }
        if (status && status !== 'all') {
            query.status = status;
        }

        // Fetch tables with timeout protection
        const tables = await tableModel.find(query)
            .sort({ tableNumber: 1 })
            .maxTimeMS(5000);

        // Log the fetch operation
        logger.info('Tables fetched successfully', {
            userId: req.user?._id,
            filters: { section, status },
            count: tables.length
        });

        res.status(200).json({
            message: 'Tables fetched successfully',
            data: tables
        });
    } catch (error) {
        logger.error(`Error fetching tables: ${error.message}`, {
            userId: req.user?._id,
            query: req.query,
            error: error.stack
        });

        res.status(500).json({ 
            message: 'Failed to fetch tables', 
            error: error.message 
        });
    }
};

/**
 * Get table by ID
 * @route GET /api/tables/:id
 * @access Private - Admin/Manager only
 */
export const getTableById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the table with timeout protection
        const table = await tableModel.findById(id).maxTimeMS(5000);

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        // Log the fetch operation
        logger.info(`Table ${table.tableNumber} fetched successfully`, {
            userId: req.user?._id,
            tableId: id
        });

        res.status(200).json({
            message: 'Table fetched successfully',
            data: table
        });
    } catch (error) {
        logger.error(`Error fetching table: ${error.message}`, {
            userId: req.user?._id,
            params: req.params,
            error: error.stack
        });

        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid table ID format' });
        }

        res.status(500).json({ 
            message: 'Failed to fetch table', 
            error: error.message 
        });
    }
};

/**
 * Update table status
 * @route PATCH /api/tables/:id/status
 * @access Private - Admin/Manager only
 */
export const updateTableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = sanitizeInput(req.body);

        // Validate status
        if (!status || !['available', 'occupied', 'reserved', 'maintenance'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // Find and update the table with timeout protection
        const updatedTable = await tableModel.findByIdAndUpdate(
            id,
            { status },
            { 
                new: true,
                runValidators: true,
                maxTimeMS: 5000
            }
        );

        if (!updatedTable) {
            return res.status(404).json({ message: 'Table not found' });
        }

        // Log the status update
        logger.info(`Table ${updatedTable.tableNumber} status updated to ${status}`, {
            userId: req.user?._id,
            tableId: id,
            oldStatus: updatedTable.status,
            newStatus: status
        });

        res.status(200).json({ 
            message: 'Table status updated successfully',
            table: updatedTable
        });
    } catch (error) {
        logger.error(`Error updating table status: ${error.message}`, {
            userId: req.user?._id,
            params: req.params,
            body: req.body,
            error: error.stack
        });

        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid table ID format' });
        }

        res.status(500).json({ message: 'Failed to update table status', error: error.message });
    }
};

export default {
    createTable,
    removeTable,
    updateTable,
    getAvailableTables,
    getAllTables,
    getTableById,
    updateTableStatus
};
