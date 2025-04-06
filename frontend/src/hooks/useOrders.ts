import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import orderService, { 
  Order, 
  OrderStatus, 
  CreateOrderRequest, 
  OrderFilters, 
  UpdateOrderStatusRequest
} from '../services/orderService';
import { useAuth } from '../context/AuthContext';

/**
 * Order status constants for consistent usage
 */
export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'completed',
  'cancelled'
];

/**
 * Hook for admin to fetch all orders with optional filters
 */
export const useAllOrders = (status?: OrderStatus, filters?: Omit<OrderFilters, 'status'>) => {
  const { currentUser } = useAuth();
  
  return useQuery({
    queryKey: ['orders', 'all', status, filters],
    queryFn: async () => {
      try {
        const data = await orderService.getAllOrders({ 
          status, 
          ...filters 
        });
        // Return empty array if data is undefined
        return data || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        throw new Error('Failed to fetch all orders');
      }
    },
    enabled: !!currentUser && ['admin', 'manager', 'staff'].includes(currentUser.role),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2, // 2 minutes
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Prevent refetching on window focus
  });
};

/**
 * Hook for customer to fetch their own orders
 */
export const useUserOrders = (status?: OrderStatus, filters?: Omit<OrderFilters, 'status'>) => {
  const { currentUser } = useAuth();
  
  const result = useQuery({
    queryKey: ['orders', 'user', currentUser?.id, status, filters],
    queryFn: () => orderService.getUserOrders({ 
      status, 
      ...filters 
    }),
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Return 'orders' field for backward compatibility
  return {
    ...result,
    orders: result.data
  };
};

/**
 * Hook to fetch a specific order by ID
 */
export const useOrderById = (id?: string) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => orderService.getOrderById(id!),
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook for tracking an order in real-time
 */
export const useOrderTracking = (id?: string) => {
  return useQuery({
    queryKey: ['orders', 'tracking', id],
    queryFn: () => orderService.trackOrder(id!),
    enabled: !!id,
    refetchInterval: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook for customer order operations (create, cancel)
 */
export const useOrders = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  // Create a new order
  const createOrderMutation = useMutation({
    mutationFn: (orderData: CreateOrderRequest) => orderService.createOrder(orderData),
    onSuccess: (newOrder: Order) => {
      console.log('Order created successfully:', newOrder);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['orders', 'user', currentUser?.id] });
      
      // Add the new order to the cache
      queryClient.setQueryData(['orders', newOrder.id], newOrder);
    }
  });
  
  // Cancel an order
  const cancelOrderMutation = useMutation({
    mutationFn: (id: string) => orderService.cancelOrder(id),
    onSuccess: (updatedOrder: Order) => {
      // Update the specific order in cache
      queryClient.setQueryData(['orders', updatedOrder.id], updatedOrder);
      
      // Invalidate user orders list to reflect the cancellation
      queryClient.invalidateQueries({ queryKey: ['orders', 'user', currentUser?.id] });
    }
  });
  
  return {
    createOrder: createOrderMutation.mutate,
    isCreatingOrder: createOrderMutation.isPending,
    createOrderError: createOrderMutation.error,
    
    cancelOrder: cancelOrderMutation.mutate,
    isCancellingOrder: cancelOrderMutation.isPending,
    cancelOrderError: cancelOrderMutation.error,
  };
};

/**
 * Hook for admin order operations (update status, delete)
 */
export const useOrderOperations = () => {
  const queryClient = useQueryClient();
  
  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: (params: UpdateOrderStatusRequest) => orderService.updateOrderStatus(params),
    onSuccess: (updatedOrder: Order) => {
      // Update the specific order in cache
      queryClient.setQueryData(['orders', updatedOrder.id], updatedOrder);
      
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: ['orders', 'all'] });
      
      // Update the order in any lists it might be part of
      ORDER_STATUSES.forEach(status => {
        queryClient.invalidateQueries({ queryKey: ['orders', 'all', status] });
      });
    }
  });
  
  // Delete an order
  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => orderService.deleteOrder(id),
    onSuccess: (_, deletedId) => {
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      // Remove the deleted order from cache
      queryClient.removeQueries({ queryKey: ['orders', deletedId] });
      
      // Update the cached lists by filtering out the deleted order
      ORDER_STATUSES.forEach(status => {
        queryClient.setQueryData<Order[]>(['orders', 'all', status], (oldOrders) => {
          if (!oldOrders) return undefined;
          return oldOrders.filter(order => order.id !== deletedId);
        });
      });
      
      // Update the all orders list
      queryClient.setQueryData<Order[]>(['orders', 'all'], (oldOrders) => {
        if (!oldOrders) return undefined;
        return oldOrders.filter(order => order.id !== deletedId);
      });
    }
  });
  
  return {
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateStatusError: updateStatusMutation.error,
    
    deleteOrder: deleteOrderMutation.mutate,
    isDeletingOrder: deleteOrderMutation.isPending,
    deleteOrderError: deleteOrderMutation.error,
  };
};

export default useOrders; 