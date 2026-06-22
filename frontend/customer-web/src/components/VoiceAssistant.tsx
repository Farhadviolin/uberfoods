import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useRestaurants } from '../hooks/useRestaurants';
import { logError } from '../utils/errorReporting';
import api from '../utils/api';
import './VoiceAssistant.css';

type MenuDish = {
  id?: string;
  name?: string;
};

interface VoiceCommand {
  intent: 'order' | 'search' | 'navigate' | 'help' | 'repeat';
  entities: {
    restaurant?: string;
    dish?: string;
    quantity?: number;
    action?: string;
  };
  confidence: number;
}

export function VoiceAssistant() {
  const { t, i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const processVoiceCommandRef = useRef<((text: string) => Promise<void>) | null>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { data: restaurants } = useRestaurants();

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const speechWindow = window as SpeechWindow;
      const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        showToast(t('voiceAssistant.notSupported'), 'error');
        return;
      }

      recognitionRef.current = new SpeechRecognitionCtor();
      
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = i18n.language === 'de' ? 'de-DE' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast(t('voiceAssistant.listening'), 'info');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setTranscript(transcript);
        
        if (event.results[event.results.length - 1].isFinal) {
          setIsProcessing(true);
          // processVoiceCommand will be called via ref to avoid stale closure
          const currentProcessCommand = processVoiceCommandRef.current;
          if (currentProcessCommand) {
            currentProcessCommand(transcript);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        logError(new Error(`Speech recognition error: ${event.error}`), {
          component: 'VoiceAssistant',
          action: 'recognition.onerror',
          metadata: { error: event.error },
        });
        setIsListening(false);
        setIsProcessing(false);
        
        if (event.error === 'no-speech') {
          showToast(t('voiceAssistant.noSpeech'), 'error');
        } else if (event.error === 'not-allowed') {
          showToast(t('voiceAssistant.microphoneDenied'), 'error');
        } else {
          showToast(t('voiceAssistant.recognitionError'), 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setIsProcessing(false);
      };
    } else {
      showToast(t('voiceAssistant.notSupported'), 'error');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOrderCommand = useCallback(async (command: VoiceCommand) => {
    try {
      if (command.entities.restaurant && command.entities.dish) {
        // Finde Restaurant ID
        const restaurant = restaurants?.find(r => 
          r.id === command.entities.restaurant || 
          r.name.toLowerCase().includes((command.entities.restaurant || '').toLowerCase())
        );
        
        if (!restaurant) {
          showToast(t('voiceAssistant.restaurantNotFound'), 'error');
          return;
        }
        
        // Navigiere zum Restaurant Menu
        navigate(`/restaurant/${restaurant.id}`);
        showToast(t('voiceAssistant.navigateTo', { name: restaurant.name }), 'success');
        
      // Warte kurz, dann versuche Gericht zu finden und zum Warenkorb hinzuzufügen
        setTimeout(async () => {
          try {
            const restaurantData = await api.get(`/restaurants/public/${restaurant.id}`);
            const dishes: MenuDish[] = restaurantData.data.dishes || [];
            const dish = dishes.find((menuDish) => 
              menuDish.id === command.entities.dish ||
              menuDish.name?.toLowerCase().includes((command.entities.dish || '').toLowerCase())
            );
            
            if (dish) {
              // Speichere Voice Order Intent in localStorage für Menu Component
              localStorage.setItem('voice_order_intent', JSON.stringify({
                dishId: dish.id,
                quantity: command.entities.quantity || 1,
                timestamp: Date.now()
              }));
              showToast(t('voiceAssistant.dishFound', { name: dish.name }), 'success');
            }
          } catch (err) {
            // Ignoriere Fehler - User kann manuell bestellen
          }
        }, 500);
      } else if (command.entities.dish) {
        // Nur Gericht angegeben - suche in allen Restaurants
        showToast(t('voiceAssistant.searchingFor', { query: command.entities.dish }), 'info');
        navigate(`/?search=${encodeURIComponent(command.entities.dish)}`);
      } else {
        showToast(t('voiceAssistant.whichDish'), 'info');
      }
    } catch (error: unknown) {
      showToast(t('voiceAssistant.orderError'), 'error');
    }
  }, [restaurants, navigate, showToast, t]);

  const handleSearchCommand = useCallback((command: VoiceCommand) => {
    try {
      if (command.entities.restaurant) {
        // Suche nach Restaurant
        const restaurant = restaurants?.find(r => 
          r.id === command.entities.restaurant ||
          r.name.toLowerCase().includes((command.entities.restaurant || '').toLowerCase())
        );
        
        if (restaurant) {
          navigate(`/restaurant/${restaurant.id}`);
          showToast(t('voiceAssistant.dishFound', { name: restaurant.name }), 'success');
        } else {
          navigate(`/?search=${encodeURIComponent(command.entities.restaurant)}`);
          showToast(t('voiceAssistant.searchingFor', { query: command.entities.restaurant }), 'info');
        }
      } else if (command.entities.dish) {
        // Suche nach Gericht
        navigate(`/?search=${encodeURIComponent(command.entities.dish)}`);
        showToast(t('voiceAssistant.searchingFor', { query: command.entities.dish }), 'info');
      } else {
        showToast(t('voiceAssistant.whatToSearch'), 'info');
      }
    } catch (error: unknown) {
      showToast(t('voiceAssistant.searchError'), 'error');
    }
  }, [restaurants, navigate, showToast, t]);

  const handleNavigateCommand = useCallback((command: VoiceCommand) => {
    try {
      if (command.entities.action) {
        const routeMap: Record<string, string> = {
          'dashboard': '/dashboard',
          'orders': '/orders',
          'favorites': '/favorites',
          'profile': '/profile'
        };
        
        const route = routeMap[command.entities.action];
        if (route) {
          navigate(route);
          showToast(t('voiceAssistant.navigateTo', { name: command.entities.action }), 'success');
        } else {
          showToast(t('voiceAssistant.restaurantNotFound'), 'error');
        }
      }
    } catch (error: unknown) {
      showToast(t('voiceAssistant.navigationError'), 'error');
    }
  }, [navigate, showToast, t]);

  const showHelp = useCallback(() => {
    const helpText = `
      ${t('voiceAssistant.availableCommands')}
      - ${t('voiceAssistant.orderCommand')}
      - ${t('voiceAssistant.searchCommand')}
      - ${t('voiceAssistant.navigateCommand')}
      - ${t('voiceAssistant.helpCommand')}
    `;
    showToast(helpText, 'info');
  }, [showToast, t]);

  const parseVoiceCommand = async (text: string): Promise<VoiceCommand> => {
    try {
      // Versuche Backend-API für Voice Command Processing
      const response = await api.post('/ai-ml/voice-command/process', {
        text,
        language: 'de-DE',
      });

      if (response.data && response.data.intent) {
        return {
          intent: response.data.intent,
          entities: response.data.entities || {},
          confidence: response.data.confidence || 0.8,
        };
      }
    } catch (error) {
      // Fallback zu lokaler Verarbeitung wenn Backend nicht verfügbar
      logError(error instanceof Error ? error : new Error('Voice command processing error'), {
        component: 'VoiceAssistant',
        action: 'parseVoiceCommand',
        metadata: { text },
      });
    }

    // Fallback: Lokale Verarbeitung
    // Order Intent
    if (text.includes('bestelle') || text.includes('bestellung') || text.includes('ich möchte')) {
      const restaurant = extractRestaurant(text);
      const dish = extractDish(text, restaurant?.id);
      const quantity = extractQuantity(text);
      
      return {
        intent: 'order',
        entities: { 
          restaurant: restaurant?.name || restaurant?.id, 
          dish: dish?.name || dish?.id,
          quantity 
        },
        confidence: 0.8
      };
    }

    // Search Intent
    if (text.includes('suche') || text.includes('finde') || text.includes('zeige mir')) {
      const restaurant = extractRestaurant(text);
      const dish = extractDish(text, restaurant?.id);
      
      return {
        intent: 'search',
        entities: { 
          restaurant: restaurant?.name || restaurant?.id, 
          dish: dish?.name || dish?.id 
        },
        confidence: 0.7
      };
    }

    // Navigate Intent
    if (text.includes('gehe zu') || text.includes('zeige') || text.includes('öffne')) {
      const action = extractAction(text);
      
      return {
        intent: 'navigate',
        entities: { action },
        confidence: 0.6
      };
    }

    // Help Intent
    if (text.includes('hilfe') || text.includes('was kann ich') || text.includes('befehle')) {
      return {
        intent: 'help',
        entities: {},
        confidence: 0.9
      };
    }

    return {
      intent: 'repeat',
      entities: {},
      confidence: 0.3
    };
  };

  const processVoiceCommand = useCallback(async (text: string) => {
    try {
      const command = await parseVoiceCommand(text.toLowerCase());
      
      // Speichere Voice Command History im Backend
      try {
        await api.post('/ai-ml/voice-command/history', {
          text,
          intent: command.intent,
          entities: command.entities,
          confidence: command.confidence,
        });
      } catch (error) {
        // Ignoriere Fehler beim Speichern der History
      }
      
      switch (command.intent) {
        case 'order':
          // Versuche Backend-API für Voice Order
          try {
            const orderResponse = await api.post('/ai-ml/voice-command/order', {
              text,
              restaurantId: command.entities.restaurant,
            });
            
            if (orderResponse.data && orderResponse.data.restaurantId) {
              navigate(`/restaurant/${orderResponse.data.restaurantId}`);
              if (orderResponse.data.dishId) {
                localStorage.setItem('voice_order_intent', JSON.stringify({
                  dishId: orderResponse.data.dishId,
                  quantity: command.entities.quantity || 1,
                  timestamp: Date.now()
                }));
              }
              showToast(orderResponse.data.message || t('voiceAssistant.orderPrepared'), 'success');
            } else {
              handleOrderCommand(command);
            }
          } catch (error) {
            // Fallback zu lokaler Verarbeitung
            handleOrderCommand(command);
          }
          break;
        case 'search':
          // Versuche Backend-API für Voice Search
          try {
            const searchResponse = await api.post('/ai-ml/voice-command/search', {
              text,
              query: command.entities.restaurant || command.entities.dish,
            });
            
            if (searchResponse.data && searchResponse.data.results) {
              if (searchResponse.data.results.length === 1) {
                navigate(`/restaurant/${searchResponse.data.results[0].id}`);
                showToast(t('voiceAssistant.dishFound', { name: searchResponse.data.results[0].name }), 'success');
              } else {
                navigate(`/?search=${encodeURIComponent(searchResponse.data.query)}`);
                showToast(t('voiceAssistant.resultsFound', { count: searchResponse.data.results.length }), 'info');
              }
            } else {
              handleSearchCommand(command);
            }
          } catch (error) {
            // Fallback zu lokaler Verarbeitung
            handleSearchCommand(command);
          }
          break;
        case 'navigate':
          // Versuche Backend-API für Voice Navigation
          try {
            const navResponse = await api.post('/ai-ml/voice-command/navigate', {
              text,
              action: command.entities.action,
            });
            
            if (navResponse.data && navResponse.data.route) {
              navigate(navResponse.data.route);
              showToast(navResponse.data.message || t('voiceAssistant.navigating'), 'success');
            } else {
              handleNavigateCommand(command);
            }
          } catch (error) {
            // Fallback zu lokaler Verarbeitung
            handleNavigateCommand(command);
          }
          break;
        case 'help':
          showHelp();
          break;
        default:
          showToast(t('voiceAssistant.pleaseRepeat'), 'info');
      }
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Voice command processing error'), {
        component: 'VoiceAssistant',
        action: 'processVoiceCommand',
      });
      showToast(t('voiceAssistant.commandError'), 'error');
    }
    
    setIsProcessing(false);
    setTranscript('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleOrderCommand, handleSearchCommand, handleNavigateCommand, showHelp, showToast, navigate, t]);

  // Update ref whenever processVoiceCommand changes
  useEffect(() => {
    processVoiceCommandRef.current = processVoiceCommand;
  }, [processVoiceCommand]);

  const extractRestaurant = (text: string): { id?: string; name?: string } | undefined => {
    if (!restaurants || restaurants.length === 0) return undefined;
    
    // Suche nach Restaurant-Namen in der Text
    const restaurantNames = restaurants.map(r => ({
      id: r.id,
      name: r.name.toLowerCase(),
      originalName: r.name
    }));
    
    const found = restaurantNames.find(r => 
      text.includes(r.name) || 
      r.name.includes(text) ||
      text.includes(r.name.split(' ')[0]) // Erster Wort des Restaurant-Namens
    );
    
    if (found) {
      return { id: found.id, name: found.originalName };
    }
    
    // Fallback: Suche nach Küchentypen
    const cuisineTypes: Record<string, string> = {
      'pizza': 'pizza',
      'burger': 'burger',
      'sushi': 'sushi',
      'chinese': 'chinesisch',
      'italienisch': 'italienisch',
      'griechisch': 'griechisch',
      'türkisch': 'türkisch',
      'asiatisch': 'asiatisch'
    };
    
    for (const [key, value] of Object.entries(cuisineTypes)) {
      if (text.includes(key) || text.includes(value)) {
        const cuisineRestaurant = restaurants.find(r => 
          r.name.toLowerCase().includes(value) || 
          r.description?.toLowerCase().includes(value)
        );
        if (cuisineRestaurant) {
          return { id: cuisineRestaurant.id, name: cuisineRestaurant.name };
        }
      }
    }
    
    return undefined;
  };

  const extractDish = (text: string, restaurantId?: string): { id?: string; name?: string } | undefined => {
    if (restaurantId && restaurants) {
      const restaurant = restaurants.find(r => r.id === restaurantId);
      if (restaurant?.dishes) {
        const dish = restaurant.dishes.find((d: MenuDish) => 
          d.name?.toLowerCase().includes(text) || 
          text.includes(d.name?.toLowerCase() || '')
        );
        if (dish) {
          return { id: dish.id, name: dish.name };
        }
      }
    }
    
    // Fallback: Suche nach Gerichtstypen
    const dishTypes: Record<string, string> = {
      'pizza': 'pizza',
      'burger': 'burger',
      'sushi': 'sushi',
      'pasta': 'pasta',
      'salat': 'salat',
      'suppe': 'suppe',
      'döner': 'döner',
      'kebab': 'kebab'
    };
    
    for (const [key, value] of Object.entries(dishTypes)) {
      if (text.includes(key) || text.includes(value)) {
        return { name: value };
      }
    }
    
    return undefined;
  };

  const extractQuantity = (text: string): number | undefined => {
    const numbers = text.match(/\d+/);
    return numbers ? parseInt(numbers[0], 10) : 1;
  };

  const extractAction = (text: string): string | undefined => {
    if (text.includes('dashboard')) return 'dashboard';
    if (text.includes('bestellungen')) return 'orders';
    if (text.includes('favoriten')) return 'favorites';
    if (text.includes('profil')) return 'profile';
    return undefined;
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsVisible(true);
      } catch (error: unknown) {
        logError(error instanceof Error ? error : new Error('Speech recognition start error'), {
          component: 'VoiceAssistant',
          action: 'startListening',
        });
        showToast(t('voiceAssistant.startError'), 'error');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!recognitionRef.current) {
    return null;
  }

  return (
    <>
      {/* Floating Voice Button */}
      <button
        className="voice-assistant-button"
        onClick={toggleListening}
        aria-label={t('accessibility.voiceAssistant')}
        title={t('accessibility.activateVoice')}
      >
        {isListening ? (
          <MicOff className="voice-icon" />
        ) : (
          <Mic className="voice-icon" />
        )}
        {isListening && <span className="voice-pulse" />}
      </button>

      {/* Voice Assistant Panel */}
      {isVisible && (
        <div className="voice-assistant-panel">
          <div className="voice-assistant-header">
            <h3>{t('voiceAssistant.title')}</h3>
            <button
              className="voice-close-btn"
              onClick={() => {
                setIsVisible(false);
                stopListening();
              }}
              aria-label={t('voiceAssistant.close')}
            >
              <X />
            </button>
          </div>

          <div className="voice-assistant-content">
            {isListening && (
              <div className="voice-listening-indicator">
                <Volume2 className="voice-animation" />
                <p>{t('voiceAssistant.listeningText')}</p>
              </div>
            )}

            {isProcessing && (
              <div className="voice-processing">
                <div className="voice-spinner" />
                <p>{t('voiceAssistant.processing')}</p>
              </div>
            )}

            {transcript && (
              <div className="voice-transcript">
                <p className="voice-transcript-label">{t('voiceAssistant.recognized')}</p>
                <p className="voice-transcript-text">{transcript}</p>
              </div>
            )}

            {!isListening && !isProcessing && !transcript && (
              <div className="voice-idle">
                <Mic className="voice-idle-icon" />
                <p>{t('voiceAssistant.clickToStart')}</p>
                <div className="voice-commands-hint">
                  <p>{t('voiceAssistant.exampleCommands')}</p>
                  <ul>
                    <li>&quot;{t('voiceAssistant.orderPizza')}&quot;</li>
                    <li>&quot;{t('voiceAssistant.searchBurger')}&quot;</li>
                    <li>&quot;{t('voiceAssistant.goToDashboard')}&quot;</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="voice-assistant-footer">
            <button
              className={`voice-toggle-btn ${isListening ? 'active' : ''}`}
              onClick={toggleListening}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleListening();
                }
              }}
              aria-label={isListening ? t('voiceAssistant.stopRecognition') : t('voiceAssistant.startRecognition')}
              aria-pressed={isListening}
            >
              {isListening ? t('voiceAssistant.stop') : t('voiceAssistant.activateMicrophone')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface SpeechWindow extends Window {
  webkitSpeechRecognition?: new () => SpeechRecognition;
  SpeechRecognition?: new () => SpeechRecognition;
}

