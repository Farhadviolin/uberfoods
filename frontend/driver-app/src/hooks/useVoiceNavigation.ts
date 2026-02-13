import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '../utils/logger';

interface VoiceNavigationOptions {
  enabled?: boolean;
  language?: string;
  onCommand?: (command: string, confidence: number) => void;
}

interface VoiceCommand {
  keywords: string[];
  action: string;
  handler: (params?: any) => void;
  description: string;
  category?: string;
}

export interface CategorizedCommand {
  action: string;
  description: string;
  keywords: string[];
  category: string;
}

export interface CommandCategory {
  id: string;
  name: string;
  icon: string;
  commands: CategorizedCommand[];
}

export function useVoiceNavigation(options: VoiceNavigationOptions = {}) {
  const { enabled = true, language = 'de-DE', onCommand } = options;
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const commandsRef = useRef<VoiceCommand[]>([]);

  useEffect(() => {
    let speechSupported = false;
    let recognitionSupported = false;

    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        speechSupported = true;
        synthRef.current = window.speechSynthesis;
      }

      // Speech Recognition Setup
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognitionSupported = true;
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();

        const recognition = recognitionRef.current;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = language;
        recognition.maxAlternatives = 5;

        recognition.onstart = () => {
          setIsListening(true);
          logger.info('🎤 Voice recognition started');
        };

        recognition.onend = () => {
          setIsListening(false);
          logger.info('🎤 Voice recognition ended');
        };

        recognition.onresult = (event) => {
          const results = Array.from(event.results);
          if (results.length > 0) {
            const bestResult = results[0];
            const transcript = bestResult[0].transcript.toLowerCase().trim();
            const confidence = bestResult[0].confidence;

            setLastCommand(transcript);
            setConfidence(confidence);

            logger.info('🎤 Voice command detected', 'useVoiceNavigation', {
              transcript,
              confidence: Math.round(confidence * 100) + '%'
            });

            // Process command
            processVoiceCommand(transcript, confidence);
            onCommand?.(transcript, confidence);
          }
        };

        recognition.onerror = (event) => {
          logger.error('Voice recognition error', 'useVoiceNavigation', event.error);
          setIsListening(false);
        };
      }
    }

    setIsSupported(speechSupported && recognitionSupported);

    // Initialize default commands
    initializeCommands();

  }, [language, onCommand]);

  const speak = (text: string, priority: 'high' | 'normal' = 'normal') => {
    if (!isSupported || !enabled || !synthRef.current) return;

    // Stoppe vorherige Ansage wenn neue mit hoher Priorität kommt
    if (priority === 'high' && synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const announceDirection = (direction: string, distance?: number) => {
    let text = direction;
    if (distance) {
      if (distance < 100) {
        text = `In ${Math.round(distance)} Metern ${direction}`;
      } else {
        text = `In ${Math.round(distance / 100) / 10} Kilometern ${direction}`;
      }
    }
    speak(text, 'high');
  };

  const announceArrival = (location: 'restaurant' | 'customer') => {
    const text = location === 'restaurant'
      ? 'Sie haben das Restaurant erreicht'
      : 'Sie haben die Lieferadresse erreicht';
    speak(text, 'high');
  };

  // Voice Command System
  const initializeCommands = useCallback(() => {
    const defaultCommands: VoiceCommand[] = [
      // Navigation Commands
      {
        keywords: ['navigation', 'navigieren', 'route', 'weg'],
        action: 'NAVIGATE',
        handler: () => speak('Navigation wird gestartet'),
        description: 'Navigation zur nächsten Bestellung starten',
        category: 'navigation'
      },
      {
        keywords: ['stop', 'halt', 'anhalten', 'stopp'],
        action: 'STOP_NAVIGATION',
        handler: () => speak('Navigation gestoppt'),
        description: 'Navigation anhalten',
        category: 'navigation'
      },
      {
        keywords: ['nächste bestellung', 'next order', 'nächste'],
        action: 'NEXT_ORDER',
        handler: () => speak('Zur nächsten Bestellung navigieren'),
        description: 'Zur nächsten Bestellung fahren',
        category: 'navigation'
      },

      // Order Commands
      {
        keywords: ['bestellung annehmen', 'accept order', 'annehmen'],
        action: 'ACCEPT_ORDER',
        handler: () => speak('Bestellung wird angenommen'),
        description: 'Aktuelle Bestellung annehmen',
        category: 'orders'
      },
      {
        keywords: ['bestellung ablehnen', 'reject order', 'ablehnen'],
        action: 'REJECT_ORDER',
        handler: () => speak('Bestellung wird abgelehnt'),
        description: 'Aktuelle Bestellung ablehnen',
        category: 'orders'
      },

      // Communication Commands
      {
        keywords: ['kunde anrufen', 'call customer', 'anrufen'],
        action: 'CALL_CUSTOMER',
        handler: () => speak('Kunde wird angerufen'),
        description: 'Kunden anrufen',
        category: 'communication'
      },
      {
        keywords: ['sms senden', 'text customer', 'sms'],
        action: 'SMS_CUSTOMER',
        handler: () => speak('SMS wird gesendet'),
        description: 'SMS an Kunden senden',
        category: 'communication'
      },
      {
        keywords: ['chat öffnen', 'open chat', 'chat'],
        action: 'OPEN_CHAT',
        handler: () => speak('Chat wird geöffnet'),
        description: 'Chat mit Kunden öffnen',
        category: 'communication'
      },

      // Emergency Commands
      {
        keywords: ['notfall', 'emergency', 'hilfe', 'sos'],
        action: 'EMERGENCY',
        handler: () => speak('Notfall-Modus aktiviert', 'high'),
        description: 'Notfall aktivieren',
        category: 'emergency'
      },
      {
        keywords: ['pause', 'break', 'unterbrechung'],
        action: 'TAKE_BREAK',
        handler: () => speak('Pause-Modus aktiviert'),
        description: 'Pause einlegen',
        category: 'emergency'
      },

      // Status Commands
      {
        keywords: ['status', 'zustand', 'wie gehts'],
        action: 'STATUS_REPORT',
        handler: () => speak('Status wird abgerufen'),
        description: 'Aktueller Status abrufen',
        category: 'status'
      },
      {
        keywords: ['verdienst', 'earnings', 'geld'],
        action: 'EARNINGS_REPORT',
        handler: () => speak('Verdienst-Report wird angezeigt'),
        description: 'Tagesverdienst anzeigen',
        category: 'status'
      },

      // Utility Commands
      {
        keywords: ['lauter', 'volume up', 'lauter machen'],
        action: 'VOLUME_UP',
        handler: () => speak('Lautstärke erhöht'),
        description: 'Sprachausgabe lauter stellen',
        category: 'utility'
      },
      {
        keywords: ['leiser', 'volume down', 'leiser machen'],
        action: 'VOLUME_DOWN',
        handler: () => speak('Lautstärke verringert'),
        description: 'Sprachausgabe leiser stellen',
        category: 'utility'
      },
      {
        keywords: ['wiederholen', 'repeat', 'nochmal'],
        action: 'REPEAT_LAST',
        handler: () => speak('Letzte Ansage wird wiederholt'),
        description: 'Letzte Ansage wiederholen',
        category: 'utility'
      }
    ];

    commandsRef.current = defaultCommands;
  }, []);

  const addCommand = useCallback((command: VoiceCommand) => {
    commandsRef.current.push(command);
  }, []);

  const removeCommand = useCallback((action: string) => {
    commandsRef.current = commandsRef.current.filter(cmd => cmd.action !== action);
  }, []);

  const processVoiceCommand = useCallback((transcript: string, confidence: number) => {
    if (confidence < 0.6) {
      speak('Befehl nicht verstanden. Bitte wiederholen Sie.');
      return;
    }

    const commands = commandsRef.current;
    let bestMatch: VoiceCommand | null = null;
    let bestScore = 0;

    // Finde besten Command-Match
    for (const command of commands) {
      for (const keyword of command.keywords) {
        const score = calculateMatchScore(transcript, keyword);
        if (score > bestScore && score > 0.7) { // Mindestens 70% Übereinstimmung
          bestMatch = command;
          bestScore = score;
        }
      }
    }

    if (bestMatch) {
      logger.info('🎯 Voice command matched', 'useVoiceNavigation', {
        command: bestMatch.action,
        transcript,
        confidence: Math.round(confidence * 100) + '%'
      });

      try {
        bestMatch.handler();
      } catch (error) {
        logger.error('Voice command handler error', 'useVoiceNavigation', error);
        speak('Fehler bei der Befehlsausführung');
      }
    } else {
      speak('Befehl nicht erkannt. Verfügbare Befehle: Navigation, Bestellung annehmen, Kunde anrufen, Notfall.');
    }
  }, []);

  const calculateMatchScore = (transcript: string, keyword: string): number => {
    const transcriptWords = transcript.toLowerCase().split(/\s+/);
    const keywordWords = keyword.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const keywordWord of keywordWords) {
      if (transcriptWords.some(transcriptWord =>
        transcriptWord.includes(keywordWord) || keywordWord.includes(transcriptWord)
      )) {
        matches++;
      }
    }

    return keywordWords.length > 0 ? matches / keywordWords.length : 0;
  };

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !enabled) return;

    try {
      recognitionRef.current.start();
      speak('Stimme erkannt. Bitte sprechen Sie Ihren Befehl.', 'high');
    } catch (error) {
      logger.error('Failed to start voice recognition', 'useVoiceNavigation', error);
      speak('Spracherkennung konnte nicht gestartet werden.');
    }
  }, [enabled]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const getAvailableCommands = useCallback(() => {
    return commandsRef.current.map(cmd => ({
      action: cmd.action,
      description: cmd.description,
      keywords: cmd.keywords,
      category: cmd.category || 'other'
    }));
  }, []);

  const getCategorizedCommands = useCallback((): CommandCategory[] => {
    const categories: { [key: string]: CommandCategory } = {
      navigation: {
        id: 'navigation',
        name: 'Navigation',
        icon: '🧭',
        commands: []
      },
      orders: {
        id: 'orders',
        name: 'Bestellungen',
        icon: '📦',
        commands: []
      },
      communication: {
        id: 'communication',
        name: 'Kommunikation',
        icon: '💬',
        commands: []
      },
      emergency: {
        id: 'emergency',
        name: 'Notfall & Sicherheit',
        icon: '🚨',
        commands: []
      },
      status: {
        id: 'status',
        name: 'Status & Berichte',
        icon: '📊',
        commands: []
      },
      utility: {
        id: 'utility',
        name: 'Einstellungen',
        icon: '⚙️',
        commands: []
      }
    };

    commandsRef.current.forEach(cmd => {
      const category = cmd.category || 'other';
      if (categories[category]) {
        categories[category].commands.push({
          action: cmd.action,
          description: cmd.description,
          keywords: cmd.keywords,
          category: category
        });
      }
    });

    // Filter out empty categories
    return Object.values(categories).filter(cat => cat.commands.length > 0);
  }, []);

  return {
    // Original navigation functions
    isSupported,
    isSpeaking,
    speak,
    stop,
    announceDirection,
    announceArrival,

    // Voice command functions
    isListening,
    lastCommand,
    confidence,
    startListening,
    stopListening,
    addCommand,
    removeCommand,
    getAvailableCommands,
    getCategorizedCommands,
  };
}

