import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// Define category options for ratings
const CATEGORY_OPTIONS = [
  { id: 'food', label: 'Food Quality', icon: '🍽️' },
  { id: 'service', label: 'Service', icon: '👨‍🍳' },
  { id: 'ambience', label: 'Ambience', icon: '🏮' },
  { id: 'cleanliness', label: 'Cleanliness', icon: '✨' },
  { id: 'value', label: 'Value for Money', icon: '💰' },
];

// Define feedback tags
const FEEDBACK_TAGS = [
  'Excellent Food', 'Fast Service', 'Friendly Staff', 
  'Great Atmosphere', 'Clean Restaurant', 'Good Value',
  'Needs Improvement', 'Long Wait', 'Issue Resolved'
];

const FeedbackForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  // Form state
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categoryRatings, setCategoryRatings] = useState({
    food: 0,
    service: 0,
    ambience: 0,
    cleanliness: 0,
    value: 0
  });
  
  // Handle overall rating change
  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
  };
  
  // Handle category rating change
  const handleCategoryRatingChange = (category: string, value: number) => {
    setCategoryRatings(prev => ({
      ...prev,
      [category]: value
    }));
  };
  
  // Handle tag selection
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      if (selectedTags.length < 5) {
        setSelectedTags([...selectedTags, tag]);
      } else {
        toast.error('You can select up to 5 tags');
      }
    }
  };
  
  // Submit feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }
    
    setLoading(true);
    
    try {
      // Filter out any category ratings that are 0 (not rated)
      const filteredCategoryRatings = Object.entries(categoryRatings)
        .filter(([_, value]) => value > 0)
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});
      
      const feedbackData = {
        rating,
        comment,
        categoryRatings: filteredCategoryRatings,
        tags: selectedTags
      };
      
      console.log('Submitting feedback:', feedbackData);
      
      const response = await axios.post('/api/feedback', feedbackData, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      console.log('Feedback submitted successfully:', response.data);
      toast.success('Thank you for your feedback!');
      setFormSubmitted(true);
      
      // Reset form
      setRating(0);
      setComment('');
      setSelectedTags([]);
      setCategoryRatings({
        food: 0,
        service: 0,
        ambience: 0,
        cleanliness: 0,
        value: 0
      });
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };
  
  // Allow submitting another feedback after the first one
  const handleSubmitAnother = () => {
    setFormSubmitted(false);
  };
  
  // Render stars for rating selection
  const renderStars = (currentRating: number, onRatingChange: (rating: number) => void, hoverable = false) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => hoverable && setHoverRating(star)}
            onMouseLeave={() => hoverable && setHoverRating(0)}
            className="focus:outline-none transition-transform hover:scale-110"
            aria-label={`Rate ${star} stars`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-8 w-8 transition-colors duration-200 ${
                star <= (hoverable && hoverRating ? hoverRating : currentRating) 
                  ? 'text-yellow-400 drop-shadow-md' 
                  : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };
  
  if (formSubmitted) {
    return (
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6 p-4 rounded-full bg-green-100 inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-green-600 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Thank You for Your Feedback!</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          We appreciate you taking the time to share your thoughts with us.
          Your feedback helps us improve our service.
        </p>
        <button
          onClick={handleSubmitAnother}
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors transform hover:scale-105 duration-300 shadow-md"
        >
          Submit Another Feedback
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Share Your Feedback</h2>
      <p className="text-gray-500 mb-8">We value your opinion and would love to hear about your experience</p>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Overall Rating */}
        <div className="bg-blue-50 rounded-xl p-6">
          <label className="block text-lg font-medium text-gray-700 mb-3">
            Overall Experience
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {renderStars(rating, handleRatingChange, true)}
            <span className="text-sm font-medium px-4 py-2 rounded-full bg-white shadow-sm">
              {rating === 0 ? 'Select a rating' : `${rating} out of 5 stars`}
            </span>
          </div>
        </div>
        
        {/* Category Ratings */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Rate Specific Aspects (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CATEGORY_OPTIONS.map((category) => (
              <div key={category.id} className="flex flex-col bg-white p-4 rounded-lg shadow-sm">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                  <span className="text-xl">{category.icon}</span> {category.label}
                </label>
                <div className="flex space-x-1">
                  {renderStars(
                    categoryRatings[category.id as keyof typeof categoryRatings],
                    (value) => handleCategoryRatingChange(category.id, value)
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Comment */}
        <div className="bg-gray-50 rounded-xl p-6">
          <label htmlFor="comment" className="block text-lg font-medium text-gray-700 mb-3">
            Additional Comments
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            rows={4}
            placeholder="Share your experience with us..."
            maxLength={1000}
          />
          <div className="flex justify-end">
            <p className="text-sm text-gray-500 mt-2 bg-white px-3 py-1 rounded-full shadow-sm">
              {comment.length}/1000 characters
            </p>
          </div>
        </div>
        
        {/* Tags */}
        <div className="bg-gray-50 rounded-xl p-6">
          <label className="block text-lg font-medium text-gray-700 mb-3">
            Select Tags (Optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <p className="text-sm text-gray-500 mt-3 bg-white px-3 py-1 rounded-full shadow-sm">
              Selected: {selectedTags.length}/5 tags
            </p>
          </div>
        </div>
        
        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-all duration-300 
                     disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] shadow-md font-medium text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </span>
            ) : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm; 