import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const SelectContext = createContext({
  value: undefined,
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
});

export function Select({ children, value, defaultValue, onValueChange, ...props }) {
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleValueChange = (newValue) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ 
      value: selectedValue, 
      onValueChange: handleValueChange, 
      open, 
      setOpen 
    }}>
      <div className="relative w-full" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = "", children, id, ...props }) {
  const { open, setOpen } = useContext(SelectContext);
  
  return (
    <button
      type="button"
      id={id}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      onClick={() => setOpen(!open)}
      className={`flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${className}`}
      {...props}
    >
      {children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-5 w-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder = "Select an option", className = "", ...props }) {
  const { value } = useContext(SelectContext);
  
  return (
    <span className={`truncate ${!value ? "text-gray-400" : "text-gray-700"} ${className}`} {...props}>
      {value || placeholder}
    </span>
  );
}

export function SelectContent({ className = "", children, ...props }) {
  const { open, setOpen } = useContext(SelectContext);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute z-50 w-full min-w-[12rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-in fade-in-80 mt-1 ${className}`}
      {...props}
    >
      <div className="p-1.5 space-y-1">
        {children}
      </div>
    </div>
  );
}

export function SelectItem({ value, className = "", children, ...props }) {
  const { value: selectedValue, onValueChange } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-value={value}
      onClick={() => onValueChange(value)}
      className={`relative flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-sm text-gray-700 transition-colors ${
        isSelected 
          ? "bg-emerald-50 text-emerald-700 font-medium" 
          : "hover:bg-gray-100"
      } ${className}`}
      {...props}
    >
      <span className="mr-2 text-emerald-600">
        {isSelected && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
      {children}
    </div>
  );
}