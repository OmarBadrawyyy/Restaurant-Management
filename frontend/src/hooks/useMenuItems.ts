import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import menuService, { MenuItem, Category } from '../services/menuService';
import { toast } from 'react-hot-toast';

/**
 * Hook for managing menu items
 */
export const useMenuItems = () => {
  const queryClient = useQueryClient();
  
  // Get all menu items
  const { 
    data: menuItems = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['menuItems'],
    queryFn: menuService.getAllMenuItems,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create menu item mutation
  const createMenuItemMutation = useMutation({
    mutationFn: (menuItemData: Partial<MenuItem>) => menuService.createMenuItem(menuItemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to create item: ${error.response?.data?.message || error.message}`);
    }
  });

  // Update menu item mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) => 
      menuService.updateMenuItem({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update item: ${error.response?.data?.message || error.message}`);
    }
  });

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: string) => menuService.deleteMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete item: ${error.response?.data?.message || error.message}`);
    }
  });

  // Get featured menu items
  const { 
    data: featuredItems = [],
    isLoading: isLoadingFeatured 
  } = useQuery({
    queryKey: ['menuItems', 'featured'],
    queryFn: menuService.getFeaturedItems,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get special offers
  const { 
    data: specialOffers = [],
    isLoading: isLoadingSpecials 
  } = useQuery({
    queryKey: ['menuItems', 'specialOffers'],
    queryFn: menuService.getSpecialOffers,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

/**
 * Hook for fetching a specific menu item by ID
 */
export const useMenuItemById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['menuItems', id],
    queryFn: () => (id ? menuService.getMenuItemById(id) : Promise.resolve(null)),
    enabled: !!id,
  });
};

/**
 * Hook for managing categories
 */
export const useCategories = () => {
  const queryClient = useQueryClient();
  
  // Get all categories
  const { 
    data: categories = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['categories'],
    queryFn: menuService.getAllCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (categoryData: Partial<Category>) => menuService.createCategory(categoryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create category: ${error.response?.data?.message || error.message}`);
    }
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => 
      menuService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update category: ${error.response?.data?.message || error.message}`);
    }
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => menuService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete category: ${error.response?.data?.message || error.message}`);
    }
  });

  return {
    categories,
    isLoading,
    error,
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
};

/**
 * Hook for fetching menu items by category
 */
export const useMenuItemsByCategory = (categoryId: string) => {
  return useQuery({
    queryKey: ['menuItems', 'category', categoryId],
    queryFn: () => menuService.getMenuItemsByCategory(categoryId),
    enabled: !!categoryId,
  });
};

export default useMenuItems; 