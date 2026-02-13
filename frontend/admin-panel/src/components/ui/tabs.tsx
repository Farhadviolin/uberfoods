// Re-export from design system for shadcn/ui compatibility
import React, { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs = ({ defaultValue = '', value, onValueChange, children, className = '' }: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;
  const handleChange = onValueChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleChange }}>
      <div className={`tabs ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`tabs-list ${className}`} style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E4E6EB', padding: '0 0 8px' }}>
      {children}
    </div>
  );
};

export const TabsTrigger = ({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.value === value;

  return (
    <button
      className={`tabs-trigger ${isActive ? 'active' : ''} ${className}`}
      onClick={() => context.onValueChange(value)}
      style={{
        padding: '8px 16px',
        border: 'none',
        background: isActive ? '#1877F2' : 'transparent',
        color: isActive ? 'white' : '#65676B',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.value !== value) return null;

  return (
    <div className={`tabs-content ${className}`} style={{ padding: '20px 0' }}>
      {children}
    </div>
  );
};
