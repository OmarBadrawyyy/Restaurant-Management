import { useMemo } from 'react';
import theme from '../styles/theme';

/**
 * A custom hook that provides access to the theme configuration
 * This allows for consistent styling across components
 */
export function useTheme() {
  return useMemo(() => theme, []);
}

/**
 * A helper hook to access just the colors from the theme
 */
export function useColors() {
  return useMemo(() => theme.colors, []);
}

export default useTheme; 