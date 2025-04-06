import React, { useState } from 'react';
import { CardInfo, validateCreditCard } from '../services/paymentService';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (cardInfo: CardInfo) => void;
  amount: number;
  isLoading?: boolean;
}

const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  amount,
  isLoading = false
}) => {
  const [cardInfo, setCardInfo] = useState<CardInfo>({
    cardNumber: '',
    cardholderName: '',
    expMonth: '',
    expYear: '',
    cvc: ''
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [localLoading, setLocalLoading] = useState(false);

  // Format card number input with spaces
  const formatCardNumber = (value: string): string => {
    // Remove non-digit characters
    const digits = value.replace(/\D/g, '');
    // Limit to 16 digits
    const limitedDigits = digits.slice(0, 16);
    // Add a space after every 4 digits
    const formatted = limitedDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for card number formatting
    if (name === 'cardNumber') {
      const formattedValue = formatCardNumber(value);
      setCardInfo(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setCardInfo(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    // Individual field validation
    const newErrors: {[key: string]: string} = {};
    
    // Card number validation - remove spaces for validation
    const cleanCardNumber = cardInfo.cardNumber.replace(/\s/g, '');
    if (!cleanCardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cleanCardNumber.length !== 16) {
      newErrors.cardNumber = 'Card number must be exactly 16 digits';
    } else if (!/^\d+$/.test(cleanCardNumber)) {
      newErrors.cardNumber = 'Card number must contain only digits';
    }
    
    // Cardholder name validation
    if (!cardInfo.cardholderName) {
      newErrors.cardholderName = 'Name is required';
    } else if (cardInfo.cardholderName.length < 2) {
      newErrors.cardholderName = 'Please enter a valid name';
    }
    
    // Expiration month validation
    if (!cardInfo.expMonth) {
      newErrors.expMonth = 'Month is required';
    } else {
      const month = parseInt(cardInfo.expMonth, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        newErrors.expMonth = 'Invalid month (1-12)';
      }
    }
    
    // Expiration year validation
    if (!cardInfo.expYear) {
      newErrors.expYear = 'Year is required';
    } else {
      const currentYear = new Date().getFullYear() % 100; // Get last 2 digits
      const year = parseInt(cardInfo.expYear, 10);
      if (isNaN(year)) {
        newErrors.expYear = 'Invalid year';
      } else if (year < currentYear) {
        newErrors.expYear = 'Card expired';
      }
      
      // Check if card is expired (year is current but month is past)
      if (year === currentYear) {
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const month = parseInt(cardInfo.expMonth, 10);
        if (!isNaN(month) && month < currentMonth) {
          newErrors.expMonth = 'Card expired';
        }
      }
    }
    
    // CVC validation
    if (!cardInfo.cvc) {
      newErrors.cvc = 'CVC is required';
    } else if (!/^\d{3,4}$/.test(cardInfo.cvc)) {
      newErrors.cvc = 'CVC must be 3-4 digits';
    }
    
    // Set errors
    setErrors(newErrors);
    
    // Return true if no errors
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading || localLoading) return;
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      setLocalLoading(true);
      
      // Get clean card data (no spaces in card number)
      const cleanCardInfo = {
        ...cardInfo,
        cardNumber: cardInfo.cardNumber.replace(/\s/g, '')
      };
      
      // Submit card info
      await onSubmit(cleanCardInfo);
    } finally {
      setLocalLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Trick browser into centering modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Modal panel */}
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                  Payment Details
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    Total amount: ${amount.toFixed(2)}
                  </p>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          id="cardNumber"
                          name="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={cardInfo.cardNumber}
                          onChange={handleChange}
                          maxLength={23} // 16 digits + spaces
                          disabled={isLoading || localLoading}
                          className={`block w-full rounded-md ${
                            errors.cardNumber ? 'border-red-300' : 'border-gray-300'
                          } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                        />
                        {errors.cardNumber && (
                          <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          id="cardholderName"
                          name="cardholderName"
                          placeholder="John Doe"
                          value={cardInfo.cardholderName}
                          onChange={handleChange}
                          disabled={isLoading || localLoading}
                          className={`block w-full rounded-md ${
                            errors.cardholderName ? 'border-red-300' : 'border-gray-300'
                          } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                        />
                        {errors.cardholderName && (
                          <p className="mt-1 text-sm text-red-600">{errors.cardholderName}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="expMonth" className="block text-sm font-medium text-gray-700 mb-1">
                            Month
                          </label>
                          <input
                            type="text"
                            id="expMonth"
                            name="expMonth"
                            placeholder="MM"
                            maxLength={2}
                            value={cardInfo.expMonth}
                            onChange={handleChange}
                            disabled={isLoading || localLoading}
                            className={`block w-full rounded-md ${
                              errors.expMonth ? 'border-red-300' : 'border-gray-300'
                            } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                          />
                          {errors.expMonth && (
                            <p className="mt-1 text-sm text-red-600">{errors.expMonth}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="expYear" className="block text-sm font-medium text-gray-700 mb-1">
                            Year
                          </label>
                          <input
                            type="text"
                            id="expYear"
                            name="expYear"
                            placeholder="YY"
                            maxLength={2}
                            value={cardInfo.expYear}
                            onChange={handleChange}
                            disabled={isLoading || localLoading}
                            className={`block w-full rounded-md ${
                              errors.expYear ? 'border-red-300' : 'border-gray-300'
                            } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                          />
                          {errors.expYear && (
                            <p className="mt-1 text-sm text-red-600">{errors.expYear}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-1">
                            CVC
                          </label>
                          <input
                            type="text"
                            id="cvc"
                            name="cvc"
                            placeholder="123"
                            maxLength={4}
                            value={cardInfo.cvc}
                            onChange={handleChange}
                            disabled={isLoading || localLoading}
                            className={`block w-full rounded-md ${
                              errors.cvc ? 'border-red-300' : 'border-gray-300'
                            } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                          />
                          {errors.cvc && (
                            <p className="mt-1 text-sm text-red-600">{errors.cvc}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={isLoading || localLoading}
                        className={`inline-flex justify-center items-center w-full px-4 py-2 text-base font-medium text-white 
                          ${isLoading || localLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} 
                          border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 
                          focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm`}
                      >
                        {isLoading || localLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : 'Pay Now'}
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                        disabled={isLoading || localLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFormModal; 