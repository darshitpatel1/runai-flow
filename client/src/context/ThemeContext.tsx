import React, { createContext, useContext, useState, useEffect } from "react";
import { loadTheme, saveTheme, getSystemTheme } from "@/lib/theme";

type ThemeType = "light" | "dark";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme on first render
  useEffect(() => {
    const storedTheme = loadTheme();
    setTheme(storedTheme);
    setIsInitialized(true);
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    if (isInitialized) {
      saveTheme(theme);
    }
  }, [theme, isInitialized]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      // Only change theme if it's currently synced with system
      const storedTheme = localStorage.getItem("theme");
      if (!storedTheme) {
        setTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
