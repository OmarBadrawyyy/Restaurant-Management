import axios from 'axios';

const API_URL = '/api/inventory';

export type InventoryCategory = 'ingredient' | 'beverage' | 'supplies' | 'equipment';
export type StockActionType = 'restock' | 'usage' | 'adjustment' | 'waste';

export interface StockHistoryItem {
  id: string;
  date: string;
  quantity: number;
  type: StockActionType;
  user: string;
  note?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  currentStock: number;
  unit: string;
  minStockLevel: number;
  reorderPoint: number;
  costPerUnit: number;
  supplier?: string;
  supplierContact?: string;
  location?: string;
  expiryDate?: string;
  lastRestockDate?: string;
  stockHistory: StockHistoryItem[];
  isActive: boolean;
  menuItemsUsing?: string[];
  isLowStock?: boolean;
  needsReorder?: boolean;
  daysUntilExpiry?: number;
  totalValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockUpdateRequest {
  quantity: number;
  type: StockActionType;
  note?: string;
}

// Get all inventory items
const getAllItems = async (): Promise<InventoryItem[]> => {
  const response = await axios.get(API_URL);
  return response.data.inventoryItems;
};

// Get inventory item by ID
const getItemById = async (id: string): Promise<InventoryItem> => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data.inventoryItem;
};

// Get inventory items by category
const getItemsByCategory = async (category: InventoryCategory): Promise<InventoryItem[]> => {
  const response = await axios.get(`${API_URL}/category/${category}`);
  return response.data.inventoryItems;
};

// Create new inventory item (admin only)
const createItem = async (itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
  const response = await axios.post(API_URL, itemData);
  return response.data.inventoryItem;
};

// Update inventory item (admin only)
const updateItem = async (id: string, itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
  const response = await axios.put(`${API_URL}/${id}`, itemData);
  return response.data.inventoryItem;
};

// Delete inventory item (admin only)
const deleteItem = async (id: string): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

// Update inventory stock
const updateStock = async (id: string, updateData: StockUpdateRequest): Promise<InventoryItem> => {
  const response = await axios.post(`${API_URL}/${id}/stock`, updateData);
  return response.data.inventoryItem;
};

// Get low stock items
const getLowStockItems = async (): Promise<InventoryItem[]> => {
  const response = await axios.get(`${API_URL}/low-stock`);
  return response.data.inventoryItems;
};

// Get items that need reordering
const getReorderItems = async (): Promise<InventoryItem[]> => {
  const response = await axios.get(`${API_URL}/reorder`);
  return response.data.inventoryItems;
};

// Get inventory statistics
const getInventoryStats = async (): Promise<{
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  reorderCount: number;
  categoryCounts: Record<InventoryCategory, number>;
}> => {
  const response = await axios.get(`${API_URL}/stats`);
  return response.data.stats;
};

const inventoryService = {
  getAllItems,
  getItemById,
  getItemsByCategory,
  createItem,
  updateItem,
  deleteItem,
  updateStock,
  getLowStockItems,
  getReorderItems,
  getInventoryStats
};

export default inventoryService; 