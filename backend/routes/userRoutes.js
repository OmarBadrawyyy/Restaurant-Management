import express from 'express';
import {
    getUsers,
    getUserById,
    deleteUser,
    toggleUserStatus,
    updateUserRole
} from '../Controllers/userController.js';
import { protect, isAdmin } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validationMiddleware.js';
import { userSchemas } from '../schemas/validationSchemas.js';

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (with filtering and pagination)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, username or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [all, customer, staff, manager, admin]
 *         description: Filter by user role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *         description: Filter by user status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/', protect, isAdmin, getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.get('/:id', protect, isAdmin, getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Invalid user ID or cannot delete last admin
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized or cannot delete own account
 *       404:
 *         description: User not found
 */
router.delete('/:id', protect, isAdmin, deleteUser);

/**
 * @swagger
 * /api/users/{id}/toggle-status:
 *   patch:
 *     summary: Toggle user active status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User status toggled successfully
 *       400:
 *         description: Invalid user ID or cannot deactivate last admin
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized or cannot change own status
 *       404:
 *         description: User not found
 */
router.patch('/:id/toggle-status', protect, isAdmin, toggleUserStatus);

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     summary: Update user role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [customer, staff, manager, admin]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Invalid user ID, invalid role, or cannot demote last admin
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized or cannot change own role
 *       404:
 *         description: User not found
 */
router.patch('/:id/role', protect, isAdmin, updateUserRole);

export default router;
