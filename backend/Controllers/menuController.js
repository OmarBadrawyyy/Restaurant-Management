import { menuModel } from '../schemas/index.js';
import { menuItemModel } from '../schemas/menuItemSchema.js';
import mongoose from 'mongoose';

// Helper function for error handling
const handleError = (res, error, operation) => {
  console.error(`Error in menuController.${operation}:`, error);
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Validation failed',
      errors: Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {})
    });
  }
  
  // Handle cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({ 
      status: 'error', 
      message: `Invalid ${error.path}: ${error.value}`
    });
  }
  
  // Handle duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({ 
      status: 'error', 
      message: `Duplicate ${field}: ${error.keyValue[field]} already exists` 
    });
  }
  
  // Default server error
  return res.status(500).json({ 
    status: 'error', 
    message: 'An error occurred while processing your request' 
  });
};

// Get all menu categories
export const getAllMenus = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    // Build filter
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    const menus = await menuModel.find(filter).sort({ displayOrder: 1 });
    res.json(menus);
  } catch (error) {
    handleError(res, error, 'getAllMenus');
  }
};

// Get active menu categories
export const getActiveMenus = async (req, res) => {
  try {
    const menus = await menuModel.find({ isActive: true }).sort({ displayOrder: 1 });
    res.json(menus);
  } catch (error) {
    handleError(res, error, 'getActiveMenus');
  }
};

// Get single menu by ID
export const getMenuById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
    }
    
    const menu = await menuModel.findById(id);
    
    if (!menu) {
      return res.status(404).json({ status: 'error', message: 'Menu not found' });
    }
    
    res.json(menu);
  } catch (error) {
    handleError(res, error, 'getMenuById');
  }
};

// Create new menu category
export const createMenu = async (req, res) => {
  try {
    const { name, description, isActive, displayOrder, imageUrl } = req.body;
    
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    
    const newMenu = new menuModel({
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
      imageUrl: imageUrl || ''
    });
    
    await newMenu.save();
    
    res.status(201).json({ 
      status: 'success', 
      message: 'Menu created successfully', 
      menu: newMenu 
    });
  } catch (error) {
    handleError(res, error, 'createMenu');
  }
};

// Update menu category
export const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
    }
    
    const menu = await menuModel.findById(id);
    
    if (!menu) {
      return res.status(404).json({ status: 'error', message: 'Menu not found' });
    }
    
    const updatedMenu = await menuModel.findByIdAndUpdate(id, updates, { 
      new: true,
      runValidators: true
    });
    
    res.json({ 
      status: 'success', 
      message: 'Menu updated successfully', 
      menu: updatedMenu 
    });
  } catch (error) {
    handleError(res, error, 'updateMenu');
  }
};

// Delete menu category
export const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Delete menu category request for ID: ${id} by user: ${req.user.email} (${req.user.role})`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`Invalid ID format for menu category deletion: ${id}`);
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid ID format'
      });
    }
    
    // Check user permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      console.log(`Permission denied: User ${req.user.email} with role ${req.user.role} attempted to delete menu category ${id}`);
      return res.status(403).json({
        status: 'error',
        message: 'Permission denied. Admin or manager role required.'
      });
    }
    
    // Check if there are associated menu items
    const itemCount = await menuItemModel.countDocuments({ category: id });
    
    if (itemCount > 0) {
      console.log(`Cannot delete menu category ${id} due to ${itemCount} associated menu items`);
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete category with ${itemCount} associated menu items. Remove or reassign the items first.`
      });
    }
    
    // Find the category first to log what's being deleted
    const menuToDelete = await menuModel.findById(id);
    if (!menuToDelete) {
      console.log(`Menu category not found for deletion: ${id}`);
      return res.status(404).json({ 
        status: 'error', 
        message: 'Menu category not found' 
      });
    }
    
    console.log(`Deleting menu category: ${menuToDelete.name} (${id})`);
    
    // Delete the category
    const deletedMenu = await menuModel.findByIdAndDelete(id);
    
    console.log(`Menu category deleted successfully: ${menuToDelete.name} (${id})`);
    
    // Send success response
    res.json({ 
      status: 'success', 
      message: 'Menu category deleted successfully',
      deletedCategory: {
        id: deletedMenu._id,
        name: deletedMenu.name
      }
    });
  } catch (error) {
    console.error(`Error in deleteMenu controller for ID ${req.params.id}:`, error);
    handleError(res, error, 'deleteMenu');
  }
};

// 7. Get Menus by Category
export const getMenusByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const menus = await menuModel.find({ category }).populate('items');
    res.json(menus);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menus by category', error: error.message });
  }
};

