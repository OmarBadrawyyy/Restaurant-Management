import { useMutation, useQueryClient } from '@tanstack/react-query';
import menuService, { MenuItem } from '../services/menuService';

interface MenuItemInput {
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  ingredients?: string[];
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergens?: string[];
  };
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  isAvailable: boolean;
  isFeatured?: boolean;
  discountPercentage?: number;
}

/**
 * A hook for managing menu operations like create, update, delete, and toggle availability
 */
const useMenuOperations = () => {
  const queryClient = useQueryClient();
  
  // Create a new menu item
  const createMenuItemMutation = useMutation({
    mutationFn: (menuItem: Partial<MenuItem>) => menuService.createMenuItem(menuItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });
  
  // Update a menu item
  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) => 
      menuService.updateMenuItem({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });
  
  // Delete a menu item
  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: string) => menuService.deleteMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });
  
  // Toggle menu item availability
  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) => 
      menuService.updateMenuItem({ id, data: { isAvailable: !isAvailable } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });
  
  return {
    createMenuItem: createMenuItemMutation.mutate,
    isCreating: createMenuItemMutation.isPending,
    createError: createMenuItemMutation.error,
    
    updateMenuItem: updateMenuItemMutation.mutate,
    isUpdating: updateMenuItemMutation.isPending,
    updateError: updateMenuItemMutation.error,
    
    deleteMenuItem: deleteMenuItemMutation.mutate,
    isDeleting: deleteMenuItemMutation.isPending,
    deleteError: deleteMenuItemMutation.error,
    
    toggleAvailability: toggleAvailabilityMutation.mutate,
    isTogglingAvailability: toggleAvailabilityMutation.isPending,
    toggleError: toggleAvailabilityMutation.error,
  };
};

export default useMenuOperations; 