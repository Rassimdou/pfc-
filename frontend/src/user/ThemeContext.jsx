import React, { createContext, useContext, useState, useEffect } from 'react';

// Create context
const ThemeContext = createContext();

// Default theme settings
const defaultThemeSettings = {
  primaryColor: '#10b981', // Default emerald color
  theme: 'light',
  logo: null, // Default logo (will use text/icon if null)
  customCss: false,
};

export function ThemeProvider({ children }) {
  // Initialize state from localStorage or use defaults
  const [themeSettings, setThemeSettings] = useState(() => {
    const savedSettings = localStorage.getItem('themeSettings');
    return savedSettings ? JSON.parse(savedSettings) : defaultThemeSettings;
  });

  // Apply theme whenever settings change
  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('themeSettings', JSON.stringify(themeSettings));
    
    // Apply theme settings
    applyThemeSettings(themeSettings);
  }, [themeSettings]);

  // Function to apply theme settings to the document
  const applyThemeSettings = (settings) => {
    // Apply theme (light/dark)
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // Apply primary color
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    
    // Convert hex to HSL for Tailwind CSS variables
    const hexToHSL = (hex) => {
      // Convert hex to RGB
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      
      // Convert RGB to HSL
      r /= 255;
      g /= 255;
      b /= 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      
      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
          default: break;
        }
        
        h /= 6;
      }
      
      h = Math.round(h * 360);
      s = Math.round(s * 100);
      l = Math.round(l * 100);
      
      return `${h} ${s}% ${l}%`;
    };
    
    const primaryHSL = hexToHSL(settings.primaryColor);
    document.documentElement.style.setProperty('--primary', primaryHSL);
  };

  // Function to update theme settings
  const updateThemeSettings = (newSettings) => {
    setThemeSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Reset to defaults
  const resetThemeSettings = () => {
    setThemeSettings(defaultThemeSettings);
  };

  return (
    <ThemeContext.Provider value={{ 
      themeSettings, 
      updateThemeSettings,
      resetThemeSettings
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}