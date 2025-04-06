import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Pagination, Alert, Card, CardContent, Rating, Chip, Stack, Grid, Button } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import feedbackService, { Feedback } from '../services/feedbackService';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// Star rating component
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
};

// Category ratings display
const CategoryRatings: React.FC<{ categoryRatings?: Record<string, number> }> = ({ categoryRatings }) => {
  if (!categoryRatings || Object.keys(categoryRatings).length === 0) {
    return null;
  }

  const categories = {
    food: '🍽️ Food',
    service: '👨‍🍳 Service',
    ambience: '🏮 Ambience',
    cleanliness: '✨ Cleanliness',
    value: '💰 Value'
  };

  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {Object.entries(categoryRatings).map(([key, value]) => (
        value > 0 && (
          <div key={key} className="flex items-center text-sm">
            <span className="mr-2">{categories[key as keyof typeof categories] || key}:</span>
            <StarRating rating={value} />
          </div>
        )
      ))}
    </div>
  );
};

const FeedbackHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [apiCalled, setApiCalled] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  // Test API connection on component mount
  useEffect(() => {
    const testApi = async () => {
      try {
        setDebugInfo('Testing API connection...');
        const isAvailable = await feedbackService.testConnection();
        setApiAvailable(isAvailable);
        setDebugInfo(prev => `${prev}\nAPI connection test: ${isAvailable ? 'SUCCESS' : 'FAILED'}`);
      } catch (err) {
        console.error('Error testing API:', err);
        setApiAvailable(false);
        setDebugInfo(prev => `${prev}\nAPI connection test error: ${err}`);
      }
    };
    
    testApi();
  }, []);

  const fetchFeedback = useCallback(async () => {
    if (!currentUser) {
      console.error("No user found in auth context");
      setError("You must be logged in to view feedback history");
      setLoading(false);
      return;
    }
    
    if (apiAvailable === false) {
      setError("API endpoint is not available. Please try again later.");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setApiCalled(true);
      
      console.log("Fetching feedback for page:", page, "for user:", currentUser.id);
      
      setDebugInfo(prev => `${prev}\nStarted API call at ${new Date().toISOString()}`);
      
      const response = await feedbackService.getUserFeedbackHistory(page, 5);
      
      setDebugInfo(prev => `${prev}\nAPI responded at ${new Date().toISOString()}`);
      
      if (response.error) {
        console.error("Error in response:", response.error);
        setError(response.error);
        setFeedback([]);
        setDebugInfo(prev => `${prev}\nError: ${response.error}`);
      } else {
        console.log("Feedback received:", response.data);
        
        // Handle different response formats
        let feedbackData: Feedback[] = [];
        
        if (Array.isArray(response.data)) {
          feedbackData = response.data;
          setDebugInfo(prev => `${prev}\nReceived array data with ${feedbackData.length} items`);
        } else if (response.data && Array.isArray(response.data)) {
          feedbackData = response.data;
          setDebugInfo(prev => `${prev}\nReceived data.data array with ${feedbackData.length} items`);
        } else {
          setDebugInfo(prev => `${prev}\nUnknown data format: ${JSON.stringify(response).substring(0, 100)}...`);
        }
        
        setFeedback(feedbackData || []);
        setTotalPages(response.pagination?.pages || 1);
      }
    } catch (err: any) {
      console.error("Exception during fetch:", err);
      setError(err.message || 'Failed to load feedback history');
      setFeedback([]);
      setDebugInfo(prev => `${prev}\nException: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, currentUser, apiAvailable]);

  // Update the useEffect to depend on apiAvailable
  useEffect(() => {
    if (apiAvailable !== null) {
      fetchFeedback();
    }
  }, [fetchFeedback, apiAvailable]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  const handleRetry = () => {
    fetchFeedback();
  };

  if (loading && !apiCalled) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ my: 2 }}
        action={
          <Button color="inherit" size="small" onClick={handleRetry}>
            RETRY
          </Button>
        }
      >
        {error}
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Debug info: API called: {apiCalled ? 'Yes' : 'No'}, User: {currentUser?.id || 'Not logged in'}
        </Typography>
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.7)', maxHeight: '200px', overflow: 'auto' }}>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            {debugInfo}
          </Typography>
        </Box>
      </Alert>
    );
  }

  if (feedback.length === 0) {
    return (
      <Box sx={{ my: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          You haven't submitted any feedback yet.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {apiCalled ? 'No feedback found in your history.' : 'API not called properly.'}
        </Typography>
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Error: {error}
          </Typography>
        )}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', maxHeight: '200px', overflow: 'auto', maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            Debug Info:{'\n'}{debugInfo}
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          color="primary" 
          sx={{ mt: 2 }} 
          onClick={handleRetry}
        >
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Your Feedback History
      </Typography>
      
      {feedback.map((item) => (
        <Card key={item._id} sx={{ mb: 2, borderRadius: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Rating value={item.rating} readOnly precision={0.5} />
                  <Typography variant="body2" color="text.secondary">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </Typography>
                </Stack>
                
                {item.comment && (
                  <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
                    {item.comment}
                  </Typography>
                )}
                
                {item.tags && item.tags.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {item.tags.map((tag) => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        sx={{ mr: 0.5, mb: 0.5 }} 
                      />
                    ))}
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} sm={6}>
                {item.categoryRatings && Object.keys(item.categoryRatings).length > 0 && (
                  <Box sx={{ mt: { xs: 2, sm: 0 } }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Category Ratings
                    </Typography>
                    {Object.entries(item.categoryRatings).map(([category, rating]) => (
                      rating && (
                        <Box key={category} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ minWidth: 100, textTransform: 'capitalize' }}>
                            {category}:
                          </Typography>
                          <Rating value={rating} readOnly size="small" precision={0.5} />
                        </Box>
                      )
                    ))}
                  </Box>
                )}
                
                {item.hasResponse && item.staffResponse && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Response from Staff:
                    </Typography>
                    <Typography variant="body2">
                      {item.staffResponse.response}
                    </Typography>
                    {item.staffResponse.responseDate && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {formatDistanceToNow(new Date(item.staffResponse.responseDate), { addSuffix: true })}
                      </Typography>
                    )}
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
      
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary" 
          />
        </Box>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
};

export default FeedbackHistory; 