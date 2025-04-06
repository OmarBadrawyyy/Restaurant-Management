import React from 'react';
import FeedbackForm from '../components/FeedbackForm';
import { useAuth } from '../hooks/useAuth';

const Feedback: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Feedback</h1>
      
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-gray-700">
            We value your opinion! Please take a moment to share your feedback about your recent experience with us. 
            Your insights help us improve our service and provide you with an even better dining experience.
          </p>
        </div>
        
        <FeedbackForm />
      </div>
    </div>
  );
};

export default Feedback; 