import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import './CommandPalette.css';

interface Command {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  commands: Command[];
}

function CommandPaletteInner({ commands }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Open with Cmd+K or Ctrl+K
  useHotkeys('meta+k, ctrl+k', (e) => {
    e.preventDefault();
    setIsOpen(true);
  });

  // Close with Escape
  useHotkeys('escape', () => {
    if (isOpen) {
      setIsOpen(false);
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, { enabled: isOpen });

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands;
    const query = searchQuery.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query) ||
        cmd.shortcut?.toLowerCase().includes(query)
    );
  }, [commands, searchQuery]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
          setSearchQuery('');
          setSelectedIndex(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleCommandClick = useCallback((command: Command) => {
    command.action();
    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(0);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Flatten grouped commands for selection
  const flatCommands = useMemo(() => {
    return Object.values(groupedCommands).flat();
  }, [groupedCommands]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="command-palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />

          {/* Palette */}
          <motion.div
            className="command-palette"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="command-palette-header">
              <input
                type="text"
                className="command-palette-input"
                placeholder="Befehl suchen... (Cmd+K)"
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
              />
            </div>

            <div className="command-palette-results">
              {flatCommands.length === 0 ? (
                <div className="command-palette-empty">Keine Befehle gefunden</div>
              ) : (
                Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                  <div key={category} className="command-palette-category">
                    <div className="command-palette-category-title">{category}</div>
                    {categoryCommands.map((command, index) => {
                      const globalIndex = flatCommands.indexOf(command);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <div
                          key={command.id}
                          className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleCommandClick(command)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <span className="command-palette-icon">{command.icon}</span>
                          <span className="command-palette-label">{command.label}</span>
                          {command.shortcut && (
                            <span className="command-palette-shortcut">{command.shortcut}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export const CommandPalette = memo(CommandPaletteInner);

