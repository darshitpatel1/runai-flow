/**
 * Theme utility functions
 */

// Get system theme preference
export const getSystemTheme = (): 'dark' | 'light' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light';
};

// Apply theme to document
export const applyTheme = (theme: 'dark' | 'light') => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Load theme from localStorage
export const loadTheme = (): 'dark' | 'light' => {
  const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
  return savedTheme || getSystemTheme();
};

// Save theme to localStorage
export const saveTheme = (theme: 'dark' | 'light') => {
  localStorage.setItem('theme', theme);
  applyTheme(theme);
};
