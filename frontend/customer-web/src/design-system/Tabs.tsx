import { useState, ReactNode, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import './Tabs.css';

export type TabsVariant = 'default' | 'pills' | 'underline';
export type TabsOrientation = 'horizontal' | 'vertical';

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  content: ReactNode;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[];
  defaultTab?: string;
  variant?: TabsVariant;
  orientation?: TabsOrientation;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({
  items,
  defaultTab,
  variant = 'default',
  orientation = 'horizontal',
  onChange,
  className,
  ...props
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || items.find((item) => !item.disabled)?.id || items[0]?.id);
  const activeTabIndex = items.findIndex((item) => item.id === activeTab);
  const activeTabItem = items.find((item) => item.id === activeTab);

  const handleTabChange = (tabId: string) => {
    const tab = items.find((item) => item.id === tabId);
    if (tab?.disabled) return;
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div
      className={clsx(
        'tabs',
        `tabs--${variant}`,
        `tabs--${orientation}`,
        className
      )}
      {...props}
    >
      <div className="tabs-list" role="tablist">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={clsx('tabs-tab', {
              'tabs-tab--active': activeTab === item.id,
              'tabs-tab--disabled': item.disabled,
            })}
            onClick={() => handleTabChange(item.id)}
            role="tab"
            aria-selected={activeTab === item.id}
            aria-controls={`tabpanel-${item.id}`}
            disabled={item.disabled}
            type="button"
          >
            {item.icon && <span className="tabs-tab-icon">{item.icon}</span>}
            <span className="tabs-tab-label">{item.label}</span>
            {variant === 'underline' && activeTab === item.id && (
              <motion.span
                className="tabs-tab-indicator"
                layoutId="tab-indicator"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>
      <div
        className="tabs-content"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTabItem?.content}
        </motion.div>
      </div>
    </div>
  );
}

