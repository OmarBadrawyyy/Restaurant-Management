import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useForm from '../../utils/useForm';
import validationSchemas from '../../utils/validationSchemas';
import { useAuth } from '../../hooks/useAuth';
import { LoginData } from '../../services/authService';

interface LoginFormProps {
  redirectTo?: string;
  onLoginSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  redirectTo = '/dashboard',
  onLoginSuccess
}) => {
  const navigate = useNavigate();
  const { login, error } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isValid
  } = useForm({
    initialValues: {
      email: '',
      password: ''
    },
    validationRules: validationSchemas.auth.login,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        await login(values.email, values.password);
        
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate(redirectTo);
        }
      } catch (error) {
        // Error is handled by the useAuth hook
        console.error('Login failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Show auth error if any */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            touched.email && errors.email ? 'border-red-500' : ''
          }`}
        />
        {touched.email && errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            touched.password && errors.password ? 'border-red-500' : ''
          }`}
        />
        {touched.password && errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
        )}
      </div>

      {/* Forgot password link */}
      <div className="flex items-center justify-end">
        <div className="text-sm">
          <a href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
            Forgot your password?
          </a>
        </div>
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isSubmitting || !isValid
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </div>

      {/* Sign up link */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </a>
        </p>
      </div>
    </form>
  );
};

export default LoginForm; 