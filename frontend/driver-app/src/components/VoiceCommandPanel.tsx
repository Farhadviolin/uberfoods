import { useState, useCallback } from 'react';
import { useVoiceNavigation } from '../hooks/useVoiceNavigation';
import { MicIcon, MicOffIcon, VolumeIcon } from './Icons';
import { logger } from '../utils/logger';
import type { CommandCategory } from '../hooks/useVoiceNavigation';
import './VoiceCommandPanel.css';

interface VoiceCommandPanelProps {
  isCollapsed?: boolean;
}

export function VoiceCommandPanel({ isCollapsed = false }: VoiceCommandPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['navigation', 'orders']));

  const {
    isSupported,
    isListening,
    isSpeaking,
    lastCommand,
    confidence,
    startListening,
    stopListening,
    speak,
    getAvailableCommands,
    getCategorizedCommands
  } = useVoiceNavigation({
    enabled: true,
    language: 'de-DE',
    onCommand: (command, confidence) => {
      logger.info('Voice command received', 'VoiceCommandPanel', { command, confidence });
    }
  });

  const handleVoiceCommand = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleTestVoice = useCallback(() => {
    speak('Sprachausgabe funktioniert. Sie können jetzt Sprachbefehle verwenden.');
  }, [speak]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const categorizedCommands = getCategorizedCommands();
  const availableCommands = getAvailableCommands();

  if (!isSupported) {
    return (
      <div className={`voice-command-panel unsupported ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="voice-panel-header">
          <span className="voice-panel-icon">🎤</span>
          {!isCollapsed && <span className="voice-panel-title">Sprachsteuerung</span>}
        </div>
        {!isCollapsed && (
          <div className="voice-panel-status">
            Nicht verfügbar
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`voice-command-panel ${isCollapsed ? 'collapsed' : ''} ${isExpanded ? 'expanded' : ''}`}>
      <div className="voice-panel-header" onClick={() => !isCollapsed && setIsExpanded(!isExpanded)}>
        <span className="voice-panel-icon">🎤</span>
        {!isCollapsed && (
          <>
            <span className="voice-panel-title">Sprachsteuerung</span>
            <span className="voice-panel-arrow">{isExpanded ? '▼' : '▶'}</span>
          </>
        )}
      </div>

      {!isCollapsed && isExpanded && (
        <div className="voice-panel-content">
          <div className="voice-controls">
            <button
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={handleVoiceCommand}
              disabled={isSpeaking}
              title={isListening ? 'Aufnahme stoppen' : 'Sprachbefehl aufnehmen'}
            >
              {isListening ? (
                <>
                  <MicOffIcon size={18} className="btn-icon" />
                  <div className="listening-indicator">
                    <div className="pulse"></div>
                  </div>
                </>
              ) : (
                <MicIcon size={18} className="btn-icon" />
              )}
            </button>

            <button
              className="voice-btn test-btn"
              onClick={handleTestVoice}
              disabled={isSpeaking}
              title="Sprachausgabe testen"
            >
              <VolumeIcon size={18} className="btn-icon" />
            </button>
          </div>

          <div className="voice-status">
            {isListening && (
              <div className="status-item listening">
                <span className="status-dot"></span>
                Höre zu...
              </div>
            )}
            {isSpeaking && (
              <div className="status-item speaking">
                <span className="status-dot"></span>
                Spreche...
              </div>
            )}
            {lastCommand && (
              <div className="status-item command">
                <span>Letzter Befehl:</span>
                <strong>{lastCommand}</strong>
                {confidence > 0 && <span className="confidence">({Math.round(confidence * 100)}%)</span>}
              </div>
            )}
          </div>

          <div className="voice-commands-list">
            <h4>Verfügbare Befehle ({availableCommands.length})</h4>
            <div className="commands-categories">
              {categorizedCommands.map((category: CommandCategory) => {
                const isCategoryExpanded = expandedCategories.has(category.id);
                return (
                  <div key={category.id} className="command-category">
                    <button
                      className="category-header"
                      onClick={() => toggleCategory(category.id)}
                      aria-expanded={isCategoryExpanded}
                    >
                      <div className="category-title">
                        <span className="category-icon">{category.icon}</span>
                        <span className="category-name">{category.name}</span>
                        <span className="category-count">({category.commands.length})</span>
                      </div>
                      <span className="category-arrow">{isCategoryExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isCategoryExpanded && (
                      <div className="category-commands">
                        {category.commands.map((cmd, index) => (
                          <div key={`${category.id}-${index}`} className="command-item">
                            <div className="command-keywords">
                              {cmd.keywords.slice(0, 3).join(', ')}
                              {cmd.keywords.length > 3 && '...'}
                            </div>
                            <div className="command-description">
                              {cmd.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

