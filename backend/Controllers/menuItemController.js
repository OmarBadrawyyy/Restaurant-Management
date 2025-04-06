import { menuItemModel } from '../schemas/menuItemSchema.js';
import { menuModel } from '../schemas/menuSchema.js';
import mongoose from 'mongoose';
import logger from '../config/logger.js';

// Helper function for error handling
const handleError = (res, error, operation) => {
  console.error(`Error in menuItemController.${operation}:`, error);
  
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
  
  // Default server error
  return res.status(500).json({ 
    status: 'error', 
    message: 'An error occurred while processing your request' 
  });
};

/**
 * Create a new menu item
 * @route POST /api/menu-items
 */
export const createMenuItem = async (req, res) => {
  try {
    const menuItemData = req.body;
    
    // Verify category exists
    if (menuItemData.category) {
      const categoryExists = await menuModel.exists({ _id: menuItemData.category });
      if (!categoryExists) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Category not found. Please select a valid category.' 
        });
      }
    }
    
    const newMenuItem = new menuItemModel(menuItemData);
    await newMenuItem.save();
    
    // Populate category before sending response
    await newMenuItem.populate('category', 'name');
    
    res.status(201).json({
      status: 'success',
      data: newMenuItem
    });
  } catch (error) {
    handleError(res, error, 'createMenuItem');
  }
};

/**
 * Get all menu items
 * @route GET /api/menu-items
 */
export const getAllMenuItems = async (req, res) => {
  try {
    const { 
      category, 
      isAvailable,
      isFeatured, 
      isVegetarian, 
      isVegan,
      isGlutenFree,
      minPrice,
      maxPrice,
      sort = '-createdAt',
      limit = 50
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (category) filter.category = category;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
    if (isVegetarian !== undefined) filter.isVegetarian = isVegetarian === 'true';
    if (isVegan !== undefined) filter.isVegan = isVegan === 'true';
    if (isGlutenFree !== undefined) filter.isGlutenFree = isGlutenFree === 'true';
    
    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }
    
    // Execute query with population of category
    const menuItems = await menuItemModel.find(filter)
      .populate('category', 'name')
      .sort(sort)
      .limit(Number(limit));
    
    res.status(200).json(menuItems);
  } catch (error) {
    handleError(res, error, 'getAllMenuItems');
  }
};

/**
 * Get a single menu item by ID
 * @route GET /api/menu-items/:id
 */
export const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
    }
    
    const menuItem = await menuItemModel.findById(id).populate('category', 'name');
    
    if (!menuItem) {
      return res.status(404).json({ status: 'error', message: 'Menu item not found' });
    }
    
    res.status(200).json({
      status: 'success',
      data: menuItem
    });
  } catch (error) {
    handleError(res, error, 'getMenuItemById');
  }
};

/**
 * Update a menu item
 * @route PUT /api/menu-items/:id
 */
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
    }
    
    // Verify category exists if being updated
    if (updateData.category) {
      const categoryExists = await menuModel.exists({ _id: updateData.category });
      if (!categoryExists) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Category not found. Please select a valid category.' 
        });
      }
    }
    
    const menuItem = await menuItemModel.findById(id);
    
    if (!menuItem) {
      return res.status(404).json({ status: 'error', message: 'Menu item not found' });
    }
    
    const updatedMenuItem = await menuItemModel.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true,
        runValidators: true
      }
    ).populate('category', 'name');
    
    res.status(200).json({
      status: 'success',
      data: updatedMenuItem
    });
  } catch (error) {
    handleError(res, error, 'updateMenuItem');
  }
};

/**
 * Delete a menu item
 * @route DELETE /api/menu-items/:id
 */
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
    }
    
    const menuItem = await menuItemModel.findById(id);
    
    if (!menuItem) {
      return res.status(404).json({ status: 'error', message: 'Menu item not found' });
    }
    
    await menuItemModel.findByIdAndDelete(id);
    
    res.status(200).json({
      status: 'success',
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    handleError(res, error, 'deleteMenuItem');
  }
};

/**
 * Get menu items by category
 * @route GET /api/menu-items/category/:categoryId
 */
export const getMenuItemsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid category ID format' });
    }
    
    // Verify category exists
    const categoryExists = await menuModel.exists({ _id: categoryId });
    if (!categoryExists) {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }
    
    const menuItems = await menuItemModel.find({ 
      category: categoryId,
      isAvailable: true 
    }).populate('category', 'name');
    
    res.status(200).json(menuItems);
  } catch (error) {
    handleError(res, error, 'getMenuItemsByCategory');
  }
};

/**
 * Get featured menu items
 * @route GET /api/menu-items/featured
 */
export const getFeaturedItems = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const featuredItems = await menuItemModel.find({ 
      isFeatured: true,
      isAvailable: true 
    })
    .sort('-updatedAt')
    .limit(Number(limit))
    .populate('category', 'name');
    
    res.status(200).json(featuredItems);
  } catch (error) {
    handleError(res, error, 'getFeaturedItems');
  }
};

