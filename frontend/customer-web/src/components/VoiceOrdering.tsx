import { useState, useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { logError } from '../utils/errorReporting';
import './VoiceOrdering.css';

interface VoiceOrderingProps {
  restaurantId: string;
  onOrderPlaced?: (orderId: string) => void;
}

export function VoiceOrdering({ restaurantId, onOrderPlaced }: VoiceOrderingProps) {
  const { showToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionConstructor = 
        window.webkitSpeechRecognition ||
        window.SpeechRecognition;
      if (!SpeechRecognitionConstructor) return;
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'de-DE';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        logError(new Error(`Speech recognition error: ${event.error}`), { component: 'VoiceOrdering', action: 'speechRecognition', metadata: { error: event.error, message: event.message } });
        setIsListening(false);
        if (event.error === 'not-allowed') {
          showToast('Mikrofon-Berechtigung erforderlich', 'error');
        } else {
          showToast('Spracherkennung fehlgeschlagen', 'error');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [showToast]);

  const startListening = () => {
    if (!recognitionRef.current) {
      showToast('Spracherkennung nicht verfügbar', 'error');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript('');
    } catch (error) {
      console.error('Failed to start recognition:', error);
      showToast('Spracherkennung konnte nicht gestartet werden', 'error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const processOrder = async () => {
    if (!transcript.trim()) {
      showToast('Bitte sprechen Sie Ihre Bestellung ein', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await api.post('/orders/voice-order', {
        restaurantId,
        transcript,
      });

      if (response.data.orderId) {
        showToast('Bestellung wurde erstellt!', 'success');
        onOrderPlaced?.(response.data.orderId);
        setTranscript('');
        setSuggestions([]);
      } else if (response.data.suggestions) {
        setSuggestions(response.data.suggestions);
        showToast('Bitte bestätigen Sie Ihre Bestellung', 'info');
      }
    } catch (error: unknown) {
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setTranscript(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="voice-ordering">
      <div className="voice-header">
        <h2>🎤 Sprachbestellung</h2>
        <p className="voice-subtitle">
          Sprechen Sie Ihre Bestellung ein, z.B. &quot;Ich möchte eine Pizza Margherita und eine Cola&quot;
        </p>
      </div>

      <div className="voice-controls">
        {!isListening ? (
          <button
            onClick={startListening}
            className="voice-button start"
            disabled={isProcessing}
          >
            🎤 Bestellung sprechen
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="voice-button stop"
          >
            ⏹️ Stoppen
          </button>
        )}
      </div>

      {isListening && (
        <div className="listening-indicator">
          <div className="pulse"></div>
          <span>Höre zu...</span>
        </div>
      )}

      {transcript && (
        <div className="transcript-section">
          <h3>Erkannte Bestellung:</h3>
          <div className="transcript-box">
            <p>{transcript}</p>
          </div>
          <button
            onClick={processOrder}
            className="process-button"
            disabled={isProcessing}
          >
            {isProcessing ? 'Wird verarbeitet...' : 'Bestellung bestätigen'}
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="suggestions-section">
          <h3>Bitte wählen Sie aus:</h3>
          <div className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => selectSuggestion(suggestion)}
                className="suggestion-button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="voice-help">
        <h4>💡 Tipps:</h4>
        <ul>
          <li>Sprechen Sie langsam und deutlich</li>
          <li>Nennen Sie Gerichtnamen und Mengen</li>
          <li>Beispiel: &quot;Zwei Pizzen Margherita und eine Cola&quot;</li>
        </ul>
      </div>
    </div>
  );
}
