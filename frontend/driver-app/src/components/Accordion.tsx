import { ReactNode, useState } from 'react';
import './Accordion.css';

interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
  icon?: string;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpen?: string[];
}

export function Accordion({ items, allowMultiple = false, defaultOpen = [] }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="accordion">
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        return (
          <div key={item.id} className="accordion-item">
            <button
              className={`accordion-header ${isOpen ? 'open' : ''}`}
              onClick={() => toggleItem(item.id)}
            >
              <div className="accordion-title">
                {item.icon && <span className="accordion-icon">{item.icon}</span>}
                <span>{item.title}</span>
              </div>
              <span className="accordion-arrow">{isOpen ? '▼' : '▶'}</span>
            </button>
            {isOpen && <div className="accordion-content">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}

