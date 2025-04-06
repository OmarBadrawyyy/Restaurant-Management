import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import analyticsService, { FeedbackAnalytics } from '../services/analyticsService';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

// Add error display component with retry functionality
const ErrorDisplay: React.FC<{ 
  error: any; 
  onRetry: () => void;
}> = ({ error, onRetry }) => {
  // Determine if this is a timeout error
  const isTimeout = error?.response?.status === 504 || 
                    (error?.response?.data?.error === 'TIMEOUT_ERROR');
  
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow" role="alert">
      <h3 className="font-bold text-lg mb-2">Error Loading Data</h3>
      <p className="mb-3">{error?.response?.data?.message || error?.message || 'Failed to load feedback data. Please try again later.'}</p>
      
      <button 
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        Try Again
      </button>
      
      {isTimeout && (
        <p className="text-sm mt-3 text-red-600">
          Our system is experiencing high load. Please try again in a few moments.
        </p>
      )}
    </div>
  );
};

// Component to visualize rating distribution
const RatingDistribution: React.FC<{ distribution: {
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
}}> = ({ distribution }) => {
  const total = distribution.fiveStar + distribution.fourStar + distribution.threeStar + 
                distribution.twoStar + distribution.oneStar;
  
  // Function to calculate percentage width
  const calculateWidth = (count: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };
  
  return (
    <div className="space-y-4">
      {/* 5 star */}
      <div className="flex items-center">
        <div className="flex-shrink-0 w-20 text-sm">5 stars</div>
        <div className="flex-grow bg-gray-200 rounded-full h-4 mr-2">
          <div 
            className="bg-yellow-400 h-4 rounded-full" 
            style={{ width: `${calculateWidth(distribution.fiveStar)}%` }}
          ></div>
        </div>
        <div className="flex-shrink-0 w-16 text-sm text-right">
          {distribution.fiveStar} ({calculateWidth(distribution.fiveStar)}%)
        </div>
      </div>
      
      {/* 4 star */}
      <div className="flex items-center">
        <div className="flex-shrink-0 w-20 text-sm">4 stars</div>
        <div className="flex-grow bg-gray-200 rounded-full h-4 mr-2">
          <div 
            className="bg-yellow-400 h-4 rounded-full" 
            style={{ width: `${calculateWidth(distribution.fourStar)}%` }}
          ></div>
        </div>
        <div className="flex-shrink-0 w-16 text-sm text-right">
          {distribution.fourStar} ({calculateWidth(distribution.fourStar)}%)
        </div>
      </div>
      
      {/* 3 star */}
      <div className="flex items-center">
        <div className="flex-shrink-0 w-20 text-sm">3 stars</div>
        <div className="flex-grow bg-gray-200 rounded-full h-4 mr-2">
          <div 
            className="bg-yellow-400 h-4 rounded-full" 
            style={{ width: `${calculateWidth(distribution.threeStar)}%` }}
          ></div>
        </div>
        <div className="flex-shrink-0 w-16 text-sm text-right">
          {distribution.threeStar} ({calculateWidth(distribution.threeStar)}%)
        </div>
      </div>
      
      {/* 2 star */}
      <div className="flex items-center">
        <div className="flex-shrink-0 w-20 text-sm">2 stars</div>
        <div className="flex-grow bg-gray-200 rounded-full h-4 mr-2">
          <div 
            className="bg-yellow-400 h-4 rounded-full" 
            style={{ width: `${calculateWidth(distribution.twoStar)}%` }}
          ></div>
        </div>
        <div className="flex-shrink-0 w-16 text-sm text-right">
          {distribution.twoStar} ({calculateWidth(distribution.twoStar)}%)
        </div>
      </div>
      
      {/* 1 star */}
      <div className="flex items-center">
        <div className="flex-shrink-0 w-20 text-sm">1 star</div>
        <div className="flex-grow bg-gray-200 rounded-full h-4 mr-2">
          <div 
            className="bg-yellow-400 h-4 rounded-full" 
            style={{ width: `${calculateWidth(distribution.oneStar)}%` }}
          ></div>
        </div>
        <div className="flex-shrink-0 w-16 text-sm text-right">
          {distribution.oneStar} ({calculateWidth(distribution.oneStar)}%)
        </div>
      </div>
    </div>
  );
};

// Sentiment breakdown visualization
const SentimentBreakdown: React.FC<{ 
  sentiments: { 
    positive?: number; 
    neutral?: number; 
    negative?: number; 
  } 
}> = ({ sentiments }) => {
  const total = (sentiments.positive || 0) + (sentiments.neutral || 0) + (sentiments.negative || 0);
  if (total === 0) return <p className="text-gray-500">No sentiment data available.</p>;
  
  // Calculate percentages
  const positivePercent = Math.round(((sentiments.positive || 0) / total) * 100);
  const neutralPercent = Math.round(((sentiments.neutral || 0) / total) * 100);
  const negativePercent = Math.round(((sentiments.negative || 0) / total) * 100);
  
  return (
    <div className="space-y-4">
      <div className="flex h-8 rounded-lg overflow-hidden">
        <div 
          className="bg-green-500 text-white flex items-center justify-center"
          style={{ width: `${positivePercent}%` }}
        >
          {positivePercent > 10 ? `${positivePercent}%` : ''}
        </div>
        <div 
          className="bg-gray-400 text-white flex items-center justify-center"
          style={{ width: `${neutralPercent}%` }}
        >
          {neutralPercent > 10 ? `${neutralPercent}%` : ''}
        </div>
        <div 
          className="bg-red-500 text-white flex items-center justify-center"
          style={{ width: `${negativePercent}%` }}
        >
          {negativePercent > 10 ? `${negativePercent}%` : ''}
        </div>
      </div>
      
      <div className="flex justify-between text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span>Positive ({sentiments.positive || 0})</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
          <span>Neutral ({sentiments.neutral || 0})</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span>Negative ({sentiments.negative || 0})</span>
        </div>
      </div>
    </div>
  );
};

// Category rating visualization
const CategoryRatings: React.FC<{ ratings: {
  food: number;
  service: number;
  ambience: number;
  cleanliness: number;
  value: number;
}}> = ({ ratings }) => {
  // Function to convert rating to stars
  const ratingToStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className={i < Math.round(rating) ? "text-yellow-400" : "text-gray-300"}>★</span>
    ));
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="font-medium">Food</span>
        <div className="flex items-center">
          <div className="text-lg mr-2">{ratingToStars(ratings.food)}</div>
          <span className="text-sm text-gray-600">({ratings.food.toFixed(1)})</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="font-medium">Service</span>
        <div className="flex items-center">
          <div className="text-lg mr-2">{ratingToStars(ratings.service)}</div>
          <span className="text-sm text-gray-600">({ratings.service.toFixed(1)})</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="font-medium">Ambience</span>
        <div className="flex items-center">
          <div className="text-lg mr-2">{ratingToStars(ratings.ambience)}</div>
          <span className="text-sm text-gray-600">({ratings.ambience.toFixed(1)})</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="font-medium">Cleanliness</span>
        <div className="flex items-center">
          <div className="text-lg mr-2">{ratingToStars(ratings.cleanliness)}</div>
          <span className="text-sm text-gray-600">({ratings.cleanliness.toFixed(1)})</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="font-medium">Value</span>
        <div className="flex items-center">
          <div className="text-lg mr-2">{ratingToStars(ratings.value)}</div>
          <span className="text-sm text-gray-600">({ratings.value.toFixed(1)})</span>
        </div>
      </div>
    </div>
  );
};

const FeedbackAnalyticsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [feedbackData, setFeedbackData] = useState<FeedbackAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Simplified version - similar to InventoryAnalyticsPage
  useEffect(() => {
    const fetchFeedbackData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Add a small delay if this is a retry to prevent hammering the server
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Using a default 30-day range
        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        
        const data = await analyticsService.getFeedbackAnalytics(startDate, endDate);
        setFeedbackData(data);
      } catch (err: any) {
        console.error('Error fetching feedback analytics:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedbackData();
  }, [retryCount]);

  // Handler for retry button
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access the feedback analytics.</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Return to Home
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Feedback Analytics</h1>
          <p className="text-gray-600">Analyze customer feedback and sentiment</p>
        </div>
        
        <Link 
          to="/admin/analytics" 
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Back to Dashboard
        </Link>
      </div>
      
      {isLoading ? (
        <LoadingSpinner message="Loading feedback data..." />
      ) : error ? (
        <ErrorDisplay error={error} onRetry={handleRetry} />
      ) : feedbackData ? (
        <>
          {/* Feedback Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Average Rating</h2>
              <div className="flex items-center">
                <p className="text-3xl font-bold mr-2">{feedbackData.summary.averageRating.toFixed(1)}</p>
                <div className="text-xl text-yellow-400">
                  {Array(5).fill(0).map((_, i) => (
                    <span key={i} className={i < Math.round(feedbackData.summary.averageRating) ? "text-yellow-400" : "text-gray-300"}>★</span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(feedbackData.period.start), 'MMM d, yyyy')} - {format(new Date(feedbackData.period.end), 'MMM d, yyyy')}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Reviews</h2>
              <p className="text-3xl font-bold">{feedbackData.summary.totalReviews}</p>
              <p className="text-sm text-gray-500 mt-1">
                For selected period
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Sentiment</h2>
              <div className="flex items-center space-x-4">
                {feedbackData.sentimentBreakdown && (
                  <>
                    <div className="flex flex-col items-center">
                      <span className="text-green-500 text-xl">😊</span>
                      <span className="text-lg font-semibold">{feedbackData.sentimentBreakdown.positive || 0}</span>
                      <span className="text-xs text-gray-500">Positive</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-500 text-xl">😐</span>
                      <span className="text-lg font-semibold">{feedbackData.sentimentBreakdown.neutral || 0}</span>
                      <span className="text-xs text-gray-500">Neutral</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-red-500 text-xl">😞</span>
                      <span className="text-lg font-semibold">{feedbackData.sentimentBreakdown.negative || 0}</span>
                      <span className="text-xs text-gray-500">Negative</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Rating Distribution and Sentiment Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Rating Distribution</h2>
              {feedbackData.summary.ratingDistribution && (
                <RatingDistribution distribution={feedbackData.summary.ratingDistribution} />
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Sentiment Breakdown</h2>
              {feedbackData.sentimentBreakdown && (
                <SentimentBreakdown sentiments={feedbackData.sentimentBreakdown} />
              )}
            </div>
          </div>
          
          {/* Category Ratings and Common Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Category Ratings</h2>
              {feedbackData.categoryRatings && (
                <CategoryRatings ratings={feedbackData.categoryRatings} />
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Common Feedback Tags</h2>
              {feedbackData.commonTags && feedbackData.commonTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {feedbackData.commonTags.map((tag, index) => (
                    <div 
                      key={index} 
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                      style={{ 
                        fontSize: `${Math.max(0.8, Math.min(1.5, 0.8 + (tag.count / Math.max(...feedbackData.commonTags.map(t => t.count))) * 0.7))}rem` 
                      }}
                    >
                      {tag._id} ({tag.count})
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No common tags found for this period.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p>No feedback data available.</p>
        </div>
      )}
    </div>
  );
};

export default FeedbackAnalyticsPage; 