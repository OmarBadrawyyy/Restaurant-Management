import React, { useState } from 'react';
import { CardInfo, validateCreditCard } from '../services/paymentService';

interface CreditCardFormProps {
  onSubmit: (cardInfo: CardInfo) => void;
  isLoading: boolean;
}

const CreditCardForm: React.FC<CreditCardFormProps> = ({ onSubmit, isLoading }) => {
  const [cardInfo, setCardInfo] = useState<CardInfo>({
    cardNumber: '',
    cardholderName: '',
    expMonth: '',
    expYear: '',
    cvc: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCardInfo(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const validation = validateCreditCard(cardInfo);
    if (!validation.isValid) {
      setErrors({ general: validation.message || 'Invalid card information' });
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(cardInfo);
    }
  };

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const value = month.toString().padStart(2, '0');
    return (
      <option key={value} value={value}>
        {value}
      </option>
    );
  });

  // Generate year options (current year + 10 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const year = currentYear + i;
    const value = (year % 100).toString().padStart(2, '0');
    return (
      <option key={value} value={value}>
        {year}
      </option>
    );
  });

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.general}
        </div>
      )}
      
      <div>
        <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-1">
          Cardholder Name
        </label>
        <input
          type="text"
          id="cardholderName"
          name="cardholderName"
          value={cardInfo.cardholderName}
          onChange={handleChange}
          className="w-full p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Name on card"
          required
        />
      </div>
      
      <div>
        <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Card Number
        </label>
        <input
          type="text"
          id="cardNumber"
          name="cardNumber"
          value={cardInfo.cardNumber}
          onChange={handleChange}
          className="w-full p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          required
        />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <label htmlFor="expMonth" className="block text-sm font-medium text-gray-700 mb-1">
            Month
          </label>
          <select
            id="expMonth"
            name="expMonth"
            value={cardInfo.expMonth}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="" disabled>MM</option>
            {monthOptions}
          </select>
        </div>
        
        <div className="col-span-1">
          <label htmlFor="expYear" className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <select
            id="expYear"
            name="expYear"
            value={cardInfo.expYear}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="" disabled>YY</option>
            {yearOptions}
          </select>
        </div>
        
        <div className="col-span-1">
          <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-1">
            CVC
          </label>
          <input
            type="text"
            id="cvc"
            name="cvc"
            value={cardInfo.cvc}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="123"
            maxLength={4}
            required
          />
        </div>
      </div>
      
      <div className="mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </form>
  );
};

export default CreditCardForm; 