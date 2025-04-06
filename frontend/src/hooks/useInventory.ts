import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import inventoryService, { 
  InventoryCategory, 
  InventoryItem, 
  StockUpdateRequest 
} from '../services/inventoryService';

// Custom hook for getting all inventory items
export const useInventoryItems = () => {
  const { data: inventoryItems, isLoading, error } = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryService.getAllItems,
  });

  return {
    inventoryItems,
    isLoading,
    error,
  };
};

// Custom hook for getting inventory item by ID
export const useInventoryItemById = (id: string) => {
  return useQuery({
    queryKey: ['inventory', id],
    queryFn: () => inventoryService.getItemById(id),
    enabled: !!id,
  });
};

// Custom hook for getting inventory items by category
export const useInventoryItemsByCategory = (category: InventoryCategory) => {
  return useQuery({
    queryKey: ['inventory', 'category', category],
    queryFn: () => inventoryService.getItemsByCategory(category),
    enabled: !!category,
  });
};

// Custom hook for getting low stock items
export const useLowStockItems = () => {
  return useQuery({
    queryKey: ['inventory', 'lowStock'],
    queryFn: inventoryService.getLowStockItems,
  });
};

// Custom hook for getting items that need reordering
export const useReorderItems = () => {
  return useQuery({
    queryKey: ['inventory', 'reorder'],
    queryFn: inventoryService.getReorderItems,
  });
};

// Custom hook for getting inventory statistics
export const useInventoryStats = () => {
  return useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: inventoryService.getInventoryStats,
  });
};

// Custom hook for inventory operations (admin only)
export const useInventoryOperations = () => {
  const queryClient = useQueryClient();

  // Create inventory item mutation
  const createItemMutation = useMutation({
    mutationFn: (itemData: Partial<InventoryItem>) => inventoryService.createItem(itemData),
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'category', newItem.category] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stats'] });
    },
  });

  // Update inventory item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) => 
      inventoryService.updateItem(id, data),
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', updatedItem.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'category', updatedItem.category] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stats'] });
    },
  });

  // Delete inventory item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => inventoryService.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stats'] });
    },
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: ({ id, updateData }: { id: string; updateData: StockUpdateRequest }) => 
      inventoryService.updateStock(id, updateData),
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', updatedItem.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'lowStock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'reorder'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stats'] });
    },
  });

  return {
    createItem: createItemMutation.mutate,
    isCreating: createItemMutation.isPending,
    createError: createItemMutation.error,
    
    updateItem: updateItemMutation.mutate,
    isUpdating: updateItemMutation.isPending,
    updateError: updateItemMutation.error,
    
    deleteItem: deleteItemMutation.mutate,
    isDeleting: deleteItemMutation.isPending,
    deleteError: deleteItemMutation.error,
    
    updateStock: updateStockMutation.mutate,
    isUpdatingStock: updateStockMutation.isPending,
    updateStockError: updateStockMutation.error,
  };
};

export default useInventoryOperations; 