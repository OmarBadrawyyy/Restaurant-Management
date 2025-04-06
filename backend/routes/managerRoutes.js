import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { 
  getAllCustomerIssues, 
  getCustomerIssueById,
  addIssueNote,
  updateIssueStatus
} from '../Controllers/customerIssuesController.js';

const router = express.Router();

// Customer Issues Routes
router.get('/customer-issues', protect, authorize('admin', 'manager'), getAllCustomerIssues);
router.get('/customer-issues/:issueId', protect, authorize('admin', 'manager'), getCustomerIssueById);
router.post('/customer-issues/:issueId/notes', protect, authorize('admin', 'manager'), addIssueNote);
router.patch('/customer-issues/:issueId/status', protect, authorize('admin', 'manager'), updateIssueStatus);

export default router; 