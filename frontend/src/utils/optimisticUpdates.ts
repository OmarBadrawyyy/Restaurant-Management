import { QueryClient } from '@tanstack/react-query';

/**
 * Utility functions for handling optimistic updates with React Query
 */

/**
 * Generic function to handle optimistic array updates like adding items
 */
export function optimisticAdd<T extends { id?: string }>(
  queryClient: QueryClient,
  queryKey: unknown[],
  newItem: T,
  getId: (item: T) => string = (item) => item.id as string
) {
  // Get the current data
  const previousData = queryClient.getQueryData<T[]>(queryKey) || [];

  // Generate a temporary ID if not provided
  const tempItem = { ...newItem };
  if (!tempItem.id) {
    tempItem.id = `temp-${Date.now()}`;
  }

  // Optimistically update the UI
  queryClient.setQueryData(queryKey, [...previousData, tempItem]);

  // Return a rollback function in case the mutation fails
  return {
    rollback: () => {
      queryClient.setQueryData(queryKey, previousData);
    },
    tempId: tempItem.id
  };
}

/**
 * Generic function to handle optimistic array updates like updating items
 */
export function optimisticUpdate<T extends { id?: string }>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updatedItem: T,
  getId: (item: T) => string = (item) => item.id as string
) {
  // Get the current data
  const previousData = queryClient.getQueryData<T[]>(queryKey) || [];

  // Find the item to update
  const itemId = getId(updatedItem);
  
  // Optimistically update the UI
  queryClient.setQueryData(queryKey, 
    previousData.map(item => 
      getId(item) === itemId ? { ...item, ...updatedItem } : item
    )
  );

  // Return a rollback function in case the mutation fails
  return {
    rollback: () => {
      queryClient.setQueryData(queryKey, previousData);
    }
  };
}

/**
 * Generic function to handle optimistic array updates like removing items
 */
export function optimisticRemove<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  itemToRemove: T,
  getId: (item: T) => string = (item: any) => item.id
) {
  // Get the current data
  const previousData = queryClient.getQueryData<T[]>(queryKey) || [];

  // Find the item to remove
  const itemId = getId(itemToRemove);
  
  // Optimistically update the UI
  queryClient.setQueryData(queryKey, 
    previousData.filter(item => getId(item) !== itemId)
  );

  // Return a rollback function in case the mutation fails
  return {
    rollback: () => {
      queryClient.setQueryData(queryKey, previousData);
    }
  };
}

/**
 * Generic function to handle optimistic updates for a single item
 */
export function optimisticSingleUpdate<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updateFunction: (oldData: T) => T
) {
  // Get the current data
  const previousData = queryClient.getQueryData<T>(queryKey);

  if (!previousData) {
    return { rollback: () => {} };
  }

  // Apply the update function
  const newData = updateFunction(previousData);
  
  // Optimistically update the UI
  queryClient.setQueryData(queryKey, newData);

  // Return a rollback function in case the mutation fails
  return {
    rollback: () => {
      queryClient.setQueryData(queryKey, previousData);
    }
  };
}

const optimisticUpdates = {
  add: optimisticAdd,
  update: optimisticUpdate,
  remove: optimisticRemove,
  singleUpdate: optimisticSingleUpdate
};

export default optimisticUpdates; 