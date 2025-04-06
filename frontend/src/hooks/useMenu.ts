import { useMutation, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import menuService, { Category, MenuItem } from '../services/menuService';

// Optimistic update utilities
const optimisticUpdates = {
  add: <T extends { id: string }>(
    queryClient: QueryClient, 
    queryKey: any[], 
    newItem: T
  ) => {
    // Snapshot previous items
    const previousItems = queryClient.getQueryData<T[]>(queryKey) || [];
    
    // Optimistically update
    queryClient.setQueryData<T[]>(queryKey, [...previousItems, newItem]);
    
    // Return functions to rollback
    return { 
      rollback: () => queryClient.setQueryData<T[]>(queryKey, previousItems),
      tempId: newItem.id 
    };
  },
  
  update: <T extends { id: string }>(
    queryClient: QueryClient, 
    queryKey: any[], 
    updatedItem: T
  ) => {
    // Snapshot previous items
    const previousItems = queryClient.getQueryData<T[]>(queryKey) || [];
    
    // Optimistically update
    queryClient.setQueryData<T[]>(queryKey, 
      previousItems.map(item => 
        item.id === updatedItem.id ? { ...item, ...updatedItem } : item
      )
    );
    
    // Return function to rollback
    return { rollback: () => queryClient.setQueryData<T[]>(queryKey, previousItems) };
  },
  
  remove: <T extends { id: string }>(
    queryClient: QueryClient, 
    queryKey: any[], 
    itemToRemove: T
  ) => {
    // Snapshot previous items
    const previousItems = queryClient.getQueryData<T[]>(queryKey) || [];
    
    // Optimistically update
    queryClient.setQueryData<T[]>(queryKey, 
      previousItems.filter(item => item.id !== itemToRemove.id)
    );
    
    // Return function to rollback
    return { rollback: () => queryClient.setQueryData<T[]>(queryKey, previousItems) };
  }
};

export const useCategories = () => {
  const queryClient = useQueryClient();

  // Get all categories
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: menuService.getAllCategories,
  });

  // Create category mutation (admin only)
  const createCategoryMutation = useMutation({
    mutationFn: (categoryData: Partial<Category>) => menuService.createCategory(categoryData),
    onMutate: async (newCategoryData) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      
      // Apply optimistic update
      const { rollback, tempId } = optimisticUpdates.add<Category>(
        queryClient, 
        ['categories'], 
        { ...newCategoryData, id: `temp-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Category
      );
      
      return { rollback, tempId };
    },
    onError: (err, newCategory, context) => {
      // Roll back the optimistic update if there's an error
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  // Update category mutation (admin only)
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => 
      menuService.updateCategory(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      
      // Apply optimistic update
      const { rollback } = optimisticUpdates.update<Category>(
        queryClient, 
        ['categories'], 
        { ...data, id, updatedAt: new Date().toISOString() } as Category
      );
      
      return { rollback };
    },
    onError: (err, variables, context) => {
      // Roll back the optimistic update if there's an error
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', updatedCategory.id] });
    },
  });

  // Delete category mutation (admin only)
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => menuService.deleteCategory(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      
      // Apply optimistic update - need to find the category first
      const categories = queryClient.getQueryData<Category[]>(['categories']) || [];
      const categoryToDelete = categories.find(cat => cat.id === id);
      
      if (!categoryToDelete) {
        return { rollback: () => {} };
      }
      
      const { rollback } = optimisticUpdates.remove<Category>(
        queryClient, 
        ['categories'], 
        categoryToDelete
      );
      
      return { rollback };
    },
    onError: (err, id, context) => {
      // Roll back the optimistic update if there's an error
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  return {
    categories,
    isLoading,
    error,
    createCategory: createCategoryMutation.mutate,
    isCreating: createCategoryMutation.isPending,
    createCategoryError: createCategoryMutation.error,
    updateCategory: updateCategoryMutation.mutate,
    isUpdating: updateCategoryMutation.isPending,
    updateCategoryError: updateCategoryMutation.error,
    deleteCategory: deleteCategoryMutation.mutate,
    isDeleting: deleteCategoryMutation.isPending,
    deleteCategoryError: deleteCategoryMutation.error,
  };
};

// Custom hook for getting a category by ID
export const useCategoryById = (id: string) => {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: () => menuService.getCategoryById(id),
    enabled: !!id,
  });
};

export const useMenuItems = () => {
  const queryClient = useQueryClient();

  // Get all menu items
  const { data: menuItems, isLoading, error } = useQuery({
    queryKey: ['menuItems'],
    queryFn: menuService.getAllMenuItems,
  });

  // Create menu item mutation (admin only)
  const createMenuItemMutation = useMutation({
    mutationFn: (itemData: Partial<MenuItem>) => menuService.createMenuItem(itemData),
    onMutate: async (newItemData) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['menuItems'] });
      
      // Apply optimistic update
      const { rollback, tempId } = optimisticUpdates.add<MenuItem>(
        queryClient, 
        ['menuItems'], 
        { 
          ...newItemData, 
          id: `temp-${Date.now()}`, 
          createdAt: new Date().toISOString(), 
          updatedAt: new Date().toISOString(),
          isAvailable: newItemData.isAvailable ?? true
        } as MenuItem
      );
      
      return { rollback, tempId };
    },
    onError: (err: any, newItem, context) => {
      // Roll back the optimistic update if there's an error
      if (context?.rollback) {
        context.rollback();
      }
      
      // Show error toast
      toast.error(err?.response?.data?.message || 'Failed to create menu item');
    },
    onSuccess: (newItem) => {
      toast.success('Menu item created successfully');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      if (typeof newItem.category === 'string') {
        queryClient.invalidateQueries({ queryKey: ['menuItems', 'category', newItem.category] });
      }
    },
  });

  // Update menu item mutation (admin only)
  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) => 
      menuService.updateMenuItem({ id, data }),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['menuItems'] });
      
      // Apply optimistic update
      const { rollback } = optimisticUpdates.update<MenuItem>(
        queryClient, 
        ['menuItems'], 
        { ...data, id, updatedAt: new Date().toISOString() } as MenuItem
      );
      
      return { rollback };
    },
    onError: (err: any, variables, context) => {
      // Roll back the optimistic update if there's an error
      if (context?.rollback) {
        context.rollback();
      }
      
      // Show error toast
      toast.error(err?.response?.data?.message || 'Failed to update menu item');
    },
    onSuccess: (updatedItem) => {
      toast.success('Menu item updated successfully');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems', updatedItem.id] });
      if (typeof updatedItem.category === 'string') {
        queryClient.invalidateQueries({ queryKey: ['menuItems', 'category', updatedItem.category] });
      }
    },
  });

  // Delete menu item mutation (admin only)
  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: string) => menuService.deleteMenuItem(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['menuItems'] });
      
      // Apply optimistic update - need to find the menu item first
      const items = queryClient.getQueryData<MenuItem[]>(['menuItems']) || [];
      const itemToDelete = items.find(item => item.id === id);
      
      if (!itemToDelete) {
        return { rollback: () => {} };
      }
      
      const { rollback } = optimisticUpdates.remove<MenuItem>(
        queryClient, 
        ['menuItems'], 
        itemToDelete
      );
      
      return { rollback };
    },
    onError: (err: any, id, context) => {
      // Roll back the optimistic update if there's an error
      if (context?.rollback) {
        context.rollback();
      }
      
      // Show error toast
      toast.error(err?.response?.data?.message || 'Failed to delete menu item');
    },
    onSuccess: (_, id) => {
      toast.success('Menu item deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });

  // Get featured menu items
  const { data: featuredItems, isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['menuItems', 'featured'],
    queryFn: menuService.getFeaturedItems,
  });

  // Get special offers
  const { data: specialOffers, isLoading: isLoadingSpecials } = useQuery({
    queryKey: ['menuItems', 'specialOffers'],
    queryFn: menuService.getSpecialOffers,
  });

  return {
    menuItems,
    isLoading,
    error,
    featuredItems,
    isLoadingFeatured,
    specialOffers,
    isLoadingSpecials,
    createMenuItem: createMenuItemMutation.mutate,
    isCreating: createMenuItemMutation.isPending,
    createError: createMenuItemMutation.error,
    updateMenuItem: updateMenuItemMutation.mutate,
    isUpdating: updateMenuItemMutation.isPending,
    updateError: updateMenuItemMutation.error,
    deleteMenuItem: deleteMenuItemMutation.mutate,
    isDeleting: deleteMenuItemMutation.isPending,
    deleteError: deleteMenuItemMutation.error,
  };
};

// Custom hook for getting a menu item by ID
export const useMenuItemById = (id: string) => {
  return useQuery({
    queryKey: ['menuItems', id],
    queryFn: () => menuService.getMenuItemById(id),
    enabled: !!id,
  });
};

// Custom hook for getting menu items by category
export const useMenuItemsByCategory = (categoryId: string) => {
  return useQuery({
    queryKey: ['menuItems', 'category', categoryId],
    queryFn: () => menuService.getMenuItemsByCategory(categoryId),
    enabled: !!categoryId,
  });
};

export default useMenuItems; 