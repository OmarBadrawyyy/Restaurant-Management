import { useState, useCallback, useEffect } from 'react';
import validator, { ValidationRules, ValidationErrors } from './validator';

interface UseFormProps<TValues, TErrors = Record<string, string>> {
  initialValues: TValues;
  validationRules?: ValidationRules;
  validate?: (values: TValues) => Partial<TErrors>;
  onSubmit?: (values: TValues) => void | Promise<void>;
}

interface UseFormReturn<TValues, TTouched = Record<string, boolean>, TErrors = ValidationErrors> {
  values: TValues;
  errors: TErrors;
  touched: TTouched;
  isSubmitting: boolean;
  isValid: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFieldValue: (field: keyof TValues, value: any) => void;
  setFieldTouched: (field: keyof TValues, isTouched?: boolean) => void;
  setFieldError: (field: keyof TValues, error: string) => void;
  resetForm: () => void;
  validateField: (field: keyof TValues) => string | null;
  validateForm: () => boolean;
}

/**
 * Custom hook for managing form state, validation, and submission
 */
function useForm<TValues extends Record<string, any>, 
                 TTouched = Record<string, boolean>, 
                 TErrors = ValidationErrors>({
  initialValues,
  validationRules = {},
  validate,
  onSubmit
}: UseFormProps<TValues, TErrors>): UseFormReturn<TValues, TTouched, TErrors> {
  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<TErrors>({} as TErrors);
  const [touched, setTouched] = useState<TTouched>({} as TTouched);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validate form whenever values change
  useEffect(() => {
    if (Object.keys(touched as Record<string, any>).length > 0) {
      validateForm();
    }
  }, [values]);

  // Check form validity whenever errors change
  useEffect(() => {
    setIsValid(Object.keys(errors as Record<string, any>).length === 0);
  }, [errors]);

  // Validate a specific field
  const validateField = useCallback((field: keyof TValues): string | null => {
    if (!validationRules[field as string]) return null;
    
    const error = validator.validateField(
      values[field as string], 
      validationRules[field as string],
      values
    );
    
    setErrors(prev => {
      const newErrors = { ...(prev as Record<string, any>) };
      if (error) {
        newErrors[field as string] = error;
      } else {
        delete newErrors[field as string];
      }
      return newErrors as TErrors;
    });
    
    return error;
  }, [values, validationRules]);

  // Validate the entire form
  const validateForm = useCallback((): boolean => {
    // Use schema-based validation if provided
    if (Object.keys(validationRules).length > 0) {
      const validationErrors = validator.validateForm(values, validationRules);
      setErrors(prev => ({ ...prev, ...validationErrors } as TErrors));
      return Object.keys(validationErrors).length === 0;
    }
    
    // Use custom validation function if provided
    if (validate) {
      const customErrors = validate(values);
      setErrors(customErrors as TErrors);
      return Object.keys(customErrors).length === 0;
    }
    
    return true;
  }, [values, validationRules, validate]);

  // Handle input change
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    // Handle dot notation for nested objects (e.g., "address.street")
    if (name.includes('.')) {
      const [parentField, childField] = name.split('.');
      setValues(prev => ({
        ...prev,
        [parentField]: {
          ...(prev[parentField] || {}),
          [childField]: type === 'checkbox' 
            ? (e.target as HTMLInputElement).checked 
            : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
        }
      }));
      return;
    }
    
    // Handle different input types
    let parsedValue: any = value;
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }
    
    setValues(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  }, []);

  // Handle input blur (focus lost)
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    
    // Handle dot notation for nested objects (e.g., "address.street")
    if (name.includes('.')) {
      const [parentField, childField] = name.split('.');
      setTouched(prev => {
        const parentTouched = (prev as Record<string, any>)[parentField] || {};
        return {
          ...prev,
          [parentField]: {
            ...parentTouched,
            [childField]: true
          }
        } as TTouched;
      });
      
      // Validate the field
      const error = validator.validateField(
        values[parentField as keyof TValues]?.[childField], 
        validationRules[`${parentField}.${childField}` as string] || {}, 
        values
      );
      
      if (error) {
        setErrors(prev => {
          const prevErrors = prev as Record<string, any>;
          const parentErrors = prevErrors[parentField] || {};
          return {
            ...prev,
            [parentField]: {
              ...parentErrors,
              [childField]: error
            }
          } as TErrors;
        });
      }
      
      return;
    }
    
    // For regular fields
    setTouched(prev => ({
      ...prev,
      [name]: true
    } as TTouched));
    
    validateField(name as keyof TValues);
  }, [validateField, values, validationRules]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(initialValues).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched as TTouched);
    
    // Validate all fields
    const isFormValid = validateForm();
    
    if (isFormValid && onSubmit) {
      setIsSubmitting(true);
      
      Promise.resolve(onSubmit(values))
        .catch(error => {
          console.error('Form submission error:', error);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  }, [values, validateForm, onSubmit]);

  // Set field value programmatically
  const setFieldValue = useCallback((field: keyof TValues, value: any) => {
    // Handle dot notation for nested fields
    if (field.toString().includes('.')) {
      const [parentField, childField] = field.toString().split('.');
      setValues(prev => ({
        ...prev,
        [parentField]: {
          ...(prev[parentField] || {}),
          [childField]: value
        }
      }));
      return;
    }
    
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Set field touched state programmatically
  const setFieldTouched = useCallback((field: keyof TValues, isTouched = true) => {
    // Handle dot notation for nested fields
    if (field.toString().includes('.')) {
      const [parentField, childField] = field.toString().split('.');
      setTouched(prev => {
        const parentTouched = (prev as Record<string, any>)[parentField] || {};
        return {
          ...prev,
          [parentField]: {
            ...parentTouched,
            [childField]: isTouched
          }
        } as TTouched;
      });
      return;
    }
    
    setTouched(prev => ({
      ...prev,
      [field as string]: isTouched
    } as TTouched));
    
    if (isTouched) {
      validateField(field);
    }
  }, [validateField]);

  // Set field error programmatically
  const setFieldError = useCallback((field: keyof TValues, error: string) => {
    // Handle dot notation for nested fields
    if (field.toString().includes('.')) {
      const [parentField, childField] = field.toString().split('.');
      setErrors(prev => {
        const parentErrors = (prev as Record<string, any>)[parentField] || {};
        return {
          ...prev,
          [parentField]: {
            ...parentErrors,
            [childField]: error
          }
        } as TErrors;
      });
      return;
    }
    
    setErrors(prev => ({
      ...prev,
      [field as string]: error
    } as TErrors));
  }, []);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({} as TErrors);
    setTouched({} as TTouched);
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    resetForm,
    validateField,
    validateForm
  };
}

export default useForm; 