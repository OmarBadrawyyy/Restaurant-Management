/**
 * Utility functions for formatting data
 */

/**
 * Format a number as currency with $ symbol
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }
  
  return '$' + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format a number with comma separators
 * @param value - The number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format a percent value
 * @param value - The decimal value to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  
  return (value * 100).toFixed(decimals) + '%';
}; 