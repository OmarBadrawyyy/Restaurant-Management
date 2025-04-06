// Import CSRF config first to ensure it's initialized at the very start
import './services/axiosCsrfConfig';
import axios from 'axios';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Import global styles
import './styles/globals.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MuiThemeWrapper from './components/MuiThemeWrapper';
import authUtils from './utils/authUtils';

// Initialize authentication utilities
authUtils.initialize();

// Create a QueryClient instance with improved options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnMount: true,
    },
  },
});

// Fetch CSRF token on app initialization
const fetchCsrfToken = async () => {
  try {
    console.log('Fetching CSRF token during app initialization');
    const response = await axios.get('/api/csrf-token');
    if (response.data?.csrfToken) {
      console.log('Successfully fetched CSRF token at app start');
    }
  } catch (error) {
    console.error('Error fetching initial CSRF token:', error);
  }
};

// Execute the token fetch
fetchCsrfToken();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MuiThemeWrapper>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MuiThemeWrapper>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
); 