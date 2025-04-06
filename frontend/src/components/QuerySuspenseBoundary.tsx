import React, { Suspense, ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './ui/LoadingSpinner';

interface QuerySuspenseBoundaryProps {
  children: ReactNode;
  loadingMessage?: string;
  errorFallback?: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * A component that combines ErrorBoundary and Suspense for React Query
 * Use this to wrap components that use React Query with suspense enabled
 */
const QuerySuspenseBoundary: React.FC<QuerySuspenseBoundaryProps> = ({
  children,
  loadingMessage = 'Loading data...',
  errorFallback,
  loadingFallback
}) => {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={loadingFallback || <LoadingSpinner message={loadingMessage} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default QuerySuspenseBoundary; 