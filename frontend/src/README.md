# Restaurant Management Frontend

## Shared Hooks and Components

This document outlines the shared hooks and components created to centralize common functionalities across the application.

### Analytics Hooks and Components

#### `useAnalytics.ts`

A collection of custom hooks for analytics data fetching and state management:

- `useAnalytics<T>`: Generic hook for handling analytics data with common functionality:
  - Date range selection and filtering
  - Loading states
  - Error handling
  - Retry functionality
  - Mock data loading

- Specialized hooks:
  - `useSalesAnalytics`: For sales analytics data
  - `useMenuItemsAnalytics`: For menu item popularity analytics
  - `useCustomerAnalytics`: For customer analytics
  - `useFeedbackAnalytics`: For feedback analytics
  - `useInventoryAnalytics`: For inventory analytics (without date range)

- Utility functions:
  - `formatCurrency`: For formatting currency values consistently

#### `AnalyticsComponents.tsx`

Reusable UI components for analytics pages:

- `ErrorDisplay`: Error display component with retry, reduce date range, and mock data options
- `DateRangeWarning`: Warning component for large date ranges
- `DateRangeSelector`: Date range input component with quick preset options
- `AnalyticsHeader`: Header component with title and back button
- `AnalyticsAuthorization`: Authorization wrapper for analytics pages
- `AnalyticsLoading`: Loading indicator for analytics data
- `AnalyticsEmptyState`: Empty state display for no data scenarios

### Menu Management Hooks

#### `useMenu.ts`

A collection of custom hooks for menu-related operations:

- `useMenuItems`: Complete hook for menu item operations:
  - Fetching all menu items
  - Creating menu items
  - Updating menu items
  - Deleting menu items
  - Toggling item availability
  - Toggling featured status

- Additional menu hooks:
  - `useMenuItem`: For individual menu item fetching
  - `useMenuItemsByCategory`: For fetching items by category
  - `useFeaturedMenuItems`: For fetching featured menu items
  - `useCategories`: For category management operations

- Optimistic updates utility:
  - `optimisticUpdates`: Helper functions for optimistic UI updates

## Usage Examples

### Analytics Example

```tsx
import { useCustomerAnalytics } from '../hooks/useAnalytics';
import { 
  AnalyticsHeader, 
  DateRangeSelector, 
  ErrorDisplay 
} from '../components/AnalyticsComponents';

const CustomerAnalyticsPage = () => {
  const { 
    data, 
    isLoading, 
    error, 
    dateRange,
    handleDateChange,
    handleRetry,
    setLastMonth
  } = useCustomerAnalytics();
  
  return (
    <>
      <AnalyticsHeader title="Customer Analytics" />
      <DateRangeSelector
        dateRange={dateRange}
        onDateChange={handleDateChange}
        onSetLastMonth={setLastMonth}
        {/* other props */}
      />
      {/* render data or error state */}
    </>
  );
};
```

### Menu Management Example

```tsx
import { useMenuItems, useCategories } from '../hooks/useMenu';

const MenuManagement = () => {
  const { 
    menuItems, 
    isLoading, 
    createMenuItem, 
    updateMenuItem,
    toggleAvailability 
  } = useMenuItems();
  
  const { categories } = useCategories();
  
  const handleToggleAvailable = (id, currentValue) => {
    toggleAvailability({ id, isAvailable: currentValue });
  };
  
  // Your component code
};
```

## Benefits

1. **Reduced Code Duplication**: Common patterns and UI elements are centralized
2. **Consistent Error Handling**: Standardized approach to handling errors
3. **Improved User Experience**: Unified UX for loading states, error messages, and retry flows
4. **Maintainability**: Easier to maintain and update shared functionality
5. **Type Safety**: Strong TypeScript typing throughout the shared code 