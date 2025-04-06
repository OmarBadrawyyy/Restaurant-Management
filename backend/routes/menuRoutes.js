import express from 'express';
import { 
  createMenu, 
  getAllMenus, 
  getMenuById, 
  updateMenu, 
  deleteMenu,
  getActiveMenus,
  getMenusByCategory
} from '../Controllers/menuController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Simple public routes
router.get('/active', getActiveMenus);
router.get('/category/:category', getMenusByCategory);
router.get('/', getAllMenus);
router.get('/id/:id', getMenuById);

// Protected routes with simpler middleware
router.use(protect);

// Admin/Manager only routes
router.post('/', restrictTo(['admin', 'manager']), createMenu);
router.put('/id/:id', restrictTo(['admin', 'manager']), updateMenu);
router.delete('/id/:id', restrictTo(['admin', 'manager']), deleteMenu);

export default router;
