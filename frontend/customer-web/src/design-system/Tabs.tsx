import { useState, ReactNode, HTMLAttributes, ComponentType, isValidElement } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import './Tabs.css';

export type TabsVariant = 'default' | 'pills' | 'underline';
export type TabsOrientation = 'horizontal' | 'vertical';

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode | ComponentType<{ size?: number | string }>;
  disabled?: boolean;
  content?: ReactNode;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[];
  value?: string;
  onValueChange?: (tabId: string) => void;
  defaultTab?: string;
  variant?: TabsVariant;
  orientation?: TabsOrientation;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({
  items,
  value,
  onValueChange,
  defaultTab,
  variant = 'default',
  orientation = 'horizontal',
  onChange,
  className,
  ...props
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || items.find((item) => !item.disabled)?.id || items[0]?.id);
  const currentTab = value ?? activeTab;
  const activeTabIndex = items.findIndex((item) => item.id === currentTab);
  const activeTabItem = items.find((item) => item.id === currentTab);

  const renderIcon = (icon: TabItem['icon']) => {
    if (!icon) return null;
    if (isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const Icon = icon;
      return <Icon size={18} />;
    }
    if (typeof icon === 'object' && '$$typeof' in icon) {
      const Icon = icon as unknown as ComponentType<{ size?: number | string }>;
      return <Icon size={18} />;
    }
    return icon;
  };

  const handleTabChange = (tabId: string) => {
    const tab = items.find((item) => item.id === tabId);
    if (tab?.disabled) return;
    setActiveTab(tabId);
    onValueChange?.(tabId);
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
              'tabs-tab--active': currentTab === item.id,
              'tabs-tab--disabled': item.disabled,
            })}
            onClick={() => handleTabChange(item.id)}
            role="tab"
            aria-selected={currentTab === item.id}
            aria-controls={`tabpanel-${item.id}`}
            disabled={item.disabled}
            type="button"
          >
            {item.icon && <span className="tabs-tab-icon">{renderIcon(item.icon)}</span>}
            <span className="tabs-tab-label">{item.label}</span>
            {variant === 'underline' && currentTab === item.id && (
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
        id={`tabpanel-${currentTab}`}
        aria-labelledby={`tab-${currentTab}`}
      >
        <motion.div
          key={currentTab}
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

