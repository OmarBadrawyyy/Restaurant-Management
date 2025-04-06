import { QueryClient } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      // Increase stale time to reduce refetches
      staleTime: 10 * 60 * 1000, // 10 minutes (was 5)
      retry: (failureCount, error) => {
        // Don't retry on 429 Too Many Requests
        if (error instanceof Error && 
            (error.message.includes('429') || 
             error.message.toLowerCase().includes('too many requests'))) {
          return false;
        }
        // Only retry 2 times max (was 3)
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => {
        // Improved exponential backoff: 2s, 4s, 8s, etc.
        return Math.min(2000 * 2 ** attemptIndex, 30000);
      },
      // Increased cache time
      gcTime: 15 * 60 * 1000, // 15 minutes (was 10)
      // Add a small delay between queries to prevent flooding the server
      networkMode: 'always'
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on 429 Too Many Requests
        if (error instanceof Error && 
            (error.message.includes('429') || 
             error.message.toLowerCase().includes('too many requests'))) {
          return false;
        }
        // Only retry once for mutations
        return failureCount < 1;
      },
      retryDelay: 2000, // Increased delay for mutations (was 1000)
      networkMode: 'always'
    }
  },
});

export default queryClient; 