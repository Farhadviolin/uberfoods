import { forwardRef, SelectHTMLAttributes, ReactNode, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import './Select.css';

export type SelectVariant = 'default' | 'outlined' | 'filled';
export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  group?: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  variant?: SelectVariant;
  size?: SelectSize;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  options: SelectOption[];
  searchable?: boolean;
  placeholder?: string;
  clearable?: boolean;
  fullWidth?: boolean;
  onClear?: () => void;
  leftIcon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      helperText,
      errorMessage,
      options,
      searchable = false,
      placeholder = 'Select an option...',
      clearable = false,
      fullWidth = false,
      className,
      value,
      onChange,
      onClear,
      disabled,
      leftIcon,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const selectRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);
    const hasValue = value !== undefined && value !== null && value !== '';
    const hasError = errorMessage !== undefined && errorMessage !== '';

    // Filter options based on search query
    const filteredOptions = searchable
      ? options.filter((opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

    // Group options
    const groupedOptions = filteredOptions.reduce((acc, opt) => {
      const group = opt.group || 'default';
      if (!acc[group]) acc[group] = [];
      acc[group].push(opt);
      return acc;
    }, {} as Record<string, SelectOption[]>);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    const handleSelect = (optionValue: string) => {
      if (disabled) return;
      const option = options.find((opt) => opt.value === optionValue);
      if (option?.disabled) return;

      const syntheticEvent = {
        target: { value: optionValue },
      } as React.ChangeEvent<HTMLSelectElement>;

      onChange?.(syntheticEvent);
      setIsOpen(false);
      setSearchQuery('');
      setFocusedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleSelect(filteredOptions[focusedIndex].value);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchQuery('');
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : prev
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
      }
    };

    return (
      <div
        ref={selectRef}
        className={clsx('select-wrapper', { 'select-wrapper--full-width': fullWidth })}
      >
        {label && (
          <label className={clsx('select-label', `select-label--${size}`, { 'select-label--error': hasError })}>
            {label}
            {props.required && <span className="select-required">*</span>}
          </label>
        )}
        <div className={clsx('select-container', `select-container--${variant}`, `select-container--${size}`)}>
          {leftIcon && <span className="select-icon-left">{leftIcon}</span>}
          <div
            className={clsx(
              'select-trigger',
              `select-trigger--${variant}`,
              `select-trigger--${size}`,
              {
                'select-trigger--error': hasError,
                'select-trigger--disabled': disabled,
                'select-trigger--open': isOpen,
                'select-trigger--with-left-icon': leftIcon,
              },
              className
            )}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            tabIndex={disabled ? -1 : 0}
          >
            <span className={clsx('select-value', { 'select-value--placeholder': !hasValue })}>
              {hasValue ? (
                <>
                  {selectedOption?.icon && <span className="select-option-icon">{selectedOption.icon}</span>}
                  {selectedOption?.label || value}
                </>
              ) : (
                placeholder
              )}
            </span>
            <div className="select-actions">
              {clearable && hasValue && !disabled && onClear && (
                <button
                  type="button"
                  className="select-clear-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  aria-label="Clear selection"
                >
                  <X size={16} />
                </button>
              )}
              <ChevronDown
                size={20}
                className={clsx('select-chevron', { 'select-chevron--open': isOpen })}
              />
            </div>
          </div>
          <AnimatePresence>
            {isOpen && !disabled && (
              <motion.div
                className="select-dropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {searchable && (
                  <div className="select-search">
                    <Search size={16} className="select-search-icon" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="select-search-input"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                <div className="select-options" role="listbox">
                  {Object.keys(groupedOptions).map((group) => (
                    <div key={group}>
                      {group !== 'default' && (
                        <div className="select-group-label">{group}</div>
                      )}
                      {groupedOptions[group].map((option, index) => {
                        const isSelected = option.value === value;
                        const isFocused = index === focusedIndex;
                        const isDisabled = option.disabled || disabled;

                        return (
                          <div
                            key={option.value}
                            className={clsx('select-option', {
                              'select-option--selected': isSelected,
                              'select-option--focused': isFocused,
                              'select-option--disabled': isDisabled,
                            })}
                            onClick={() => !isDisabled && handleSelect(option.value)}
                            onMouseEnter={() => setFocusedIndex(index)}
                            role="option"
                            aria-selected={isSelected}
                          >
                            {option.icon && <span className="select-option-icon">{option.icon}</span>}
                            <span className="select-option-label">{option.label}</span>
                            {isSelected && (
                              <Check size={16} className="select-option-check" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {filteredOptions.length === 0 && (
                    <div className="select-no-options">No options found</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {(helperText || errorMessage) && (
          <div className={clsx('select-helper', { 'select-helper--error': hasError })}>
            {hasError ? errorMessage : helperText}
          </div>
        )}
        {/* Hidden native select for form submission */}
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="select-native"
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';

