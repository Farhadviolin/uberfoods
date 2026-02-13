import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import './DishCustomization.css';

interface DishCustomizationProps {
  dish: {
    id: string;
    name: string;
    price: number;
    ingredients?: string;
    tags?: string[];
  };
  onConfirm: (customization: {
    modifications?: {
      extras?: string[];
      removals?: string[];
      notes?: string;
    };
    specialInstructions?: string;
  }) => void;
  onCancel: () => void;
}

// Beispiel-Extras (würde normalerweise vom Backend kommen)
// Diese werden dynamisch übersetzt in der Komponente
const AVAILABLE_EXTRAS_KEYS = [
  'dishExtras.extraCheese',
  'dishExtras.extraSauce',
  'dishExtras.extraMeat',
  'dishExtras.extraVegetables',
  'dishExtras.increaseSpiciness',
];

export function DishCustomization({ dish, onConfirm, onCancel }: DishCustomizationProps) {
  const { t } = useTranslation();
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Parse ingredients (kommagetrennt)
  const ingredients = dish.ingredients
    ? dish.ingredients.split(',').map((i) => i.trim())
    : [];

  const toggleExtra = (extra: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extra) ? prev.filter((e) => e !== extra) : [...prev, extra],
    );
  };

  const toggleRemoval = (ingredient: string) => {
    setSelectedRemovals((prev) =>
      prev.includes(ingredient)
        ? prev.filter((i) => i !== ingredient)
        : [...prev, ingredient],
    );
  };

  const handleConfirm = () => {
    onConfirm({
      modifications: {
        extras: selectedExtras.length > 0 ? selectedExtras : undefined,
        removals: selectedRemovals.length > 0 ? selectedRemovals : undefined,
        notes: notes || undefined,
      },
      specialInstructions: specialInstructions || undefined,
    });
  };

  return (
    <div className="dish-customization-overlay" onClick={onCancel}>
      <div className="dish-customization-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dish-customization-header">
          <h3>{dish.name} {t('dishCustomization.title')}</h3>
          <button className="close-btn" onClick={onCancel} aria-label={t('dishCustomization.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="dish-customization-content">
          {/* Extras */}
          {AVAILABLE_EXTRAS_KEYS.length > 0 && (
            <div className="customization-section">
              <h4>{t('dishCustomization.addExtras')}</h4>
              <div className="customization-options">
                {AVAILABLE_EXTRAS_KEYS.map((extraKey) => {
                  const extra = t(extraKey);
                  return (
                    <label key={extraKey} className="customization-option">
                    <input
                      type="checkbox"
                      checked={selectedExtras.includes(extra)}
                      onChange={() => toggleExtra(extra)}
                    />
                    <span>{extra}</span>
                  </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Entfernen */}
          {ingredients.length > 0 && (
            <div className="customization-section">
              <h4>{t('dishCustomization.removeIngredients')}</h4>
              <div className="customization-options">
                {ingredients.map((ingredient) => (
                  <label key={ingredient} className="customization-option">
                    <input
                      type="checkbox"
                      checked={selectedRemovals.includes(ingredient)}
                      onChange={() => toggleRemoval(ingredient)}
                    />
                    <span>{t('dishCustomization.without')} {ingredient}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notizen */}
          <div className="customization-section">
            <h4>{t('dishCustomization.notes')}</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('dishCustomization.notesPlaceholder')}
              rows={3}
              className="customization-textarea"
            />
          </div>

          {/* Spezialwünsche */}
          <div className="customization-section">
            <h4>{t('dishCustomization.specialInstructions')}</h4>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder={t('dishCustomization.specialInstructionsPlaceholder')}
              rows={2}
              className="customization-textarea"
            />
          </div>
        </div>

        <div className="dish-customization-footer">
          <button className="btn-secondary" onClick={onCancel}>
            {t('dishCustomization.cancel')}
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            {t('dishCustomization.addToCart')}
          </button>
        </div>
      </div>
    </div>
  );
}

