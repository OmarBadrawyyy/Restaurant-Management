import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

// Temporary inline implementations to bypass import issues
// Email validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Username validation
const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

// Password validation
const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Input field component to reduce repetition
const InputFieldComponent = ({ 
  id, 
  name, 
  label, 
  type, 
  value, 
  onChange, 
  onBlur, 
  error, 
  required, 
  autoComplete, 
  placeholder 
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  error: string;
  required: boolean;
  autoComplete: string;
  placeholder: string;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${id}-error` : undefined}
    />
    {error && (
      <p id={`${id}-error`} className="mt-1 text-sm text-red-500">
        {error}
      </p>
    )}
  </div>
);

// Get validation errors helper
const getValidationErrors = (field: string, value: string, formData?: any): string => {
  switch (field) {
    case 'username':
      if (!value) return 'Username is required';
      if (value.length < 3) return 'Username must be at least 3 characters';
      if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
      return '';
    case 'email':
      if (!value) return 'Email is required';
      if (!isValidEmail(value)) return 'Please enter a valid email address';
      return '';
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Password must be at least 6 characters';
      return '';
    case 'confirmPassword':
      if (!value) return 'Please confirm your password';
      if (formData && value !== formData.password) return 'Passwords do not match';
      return '';
    default:
      return '';
  }
};

const Register: React.FC = () => {
  console.log('Rendering Register component');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const { register, error, clearError, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Show any auth errors from context
    if (error) {
      console.log('Auth error from context:', error);
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate on change if field has been touched
    if (touched[name as keyof typeof touched]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const validateField = (name: string, value: string) => {
    let errorMessage = getValidationErrors(name, value, formData);
    
    // Special case for password confirmation
    if (name === 'confirmPassword' && value !== formData.password) {
      errorMessage = 'Passwords do not match';
    }
    
    setErrors(prev => ({ ...prev, [name]: errorMessage }));
    return !errorMessage;
  };

  const validateForm = (): boolean => {
    let isValid = true;
    
    const newErrors = {
      username: getValidationErrors('username', formData.username),
      email: getValidationErrors('email', formData.email),
      password: getValidationErrors('password', formData.password),
      confirmPassword: getValidationErrors('confirmPassword', formData.confirmPassword, formData),
    };
    
    // Set all fields as touched
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    
    // Check if we have any errors
    for (const key in newErrors) {
      if (newErrors[key as keyof typeof newErrors]) {
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    console.log('Form validation result:', isValid);
    
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Registration form submitted');
    
    if (!validateForm()) {
      console.log('Form validation failed');
      toast.error('Please fix the errors in the form');
      return;
    }
    
    try {
      console.log('Attempting registration for:', formData.email);
      
      // Prepare registration data (omit confirmPassword)
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      };
      
      await register(registrationData);
      console.log('Registration successful');
      toast.success('Registration successful! Welcome!');
      navigate('/');
    } catch (err: any) {
      console.error('Registration error in component:', err);
      // Error is handled in useAuth and displayed through the useEffect
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <InputFieldComponent
              id="username"
              name="username"
              label="Username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.username}
              required
              autoComplete="username"
              placeholder="johndoe123"
            />
            
            <InputFieldComponent
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              required
              autoComplete="email"
              placeholder="email@example.com"
            />
            
            <InputFieldComponent
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
            
            <InputFieldComponent
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 flex justify-center items-center px-4 py-2 rounded font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isLoading 
                  ? 'bg-blue-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
              }`}
            >
              {isLoading ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    ></circle>
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sign Up
                </>
              ) : 'Sign Up'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;