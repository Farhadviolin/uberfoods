import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useValidatePromoCode } from '../hooks/usePromoCode';
import { Button } from '../design-system/Button';
import { Tag, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import './PromoCodeInput.css';

interface PromoCodeInputProps {
  restaurantId: string;
  subtotal: number;
  onCodeApplied: (code: string, discount: number, discountType: string, promotionId: string) => void;
  onCodeRemoved: () => void;
  appliedCode?: string;
}

export function PromoCodeInput({
  restaurantId,
  subtotal,
  onCodeApplied,
  onCodeRemoved,
  appliedCode,
}: PromoCodeInputProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const { showToast } = useToast();
  const validateMutation = useValidatePromoCode();

  const handleApply = async () => {
    if (!code.trim()) {
      showToast(t('promoCode.enterCode'), 'error');
      return;
    }

    const result = await validateMutation.mutateAsync({
      code: code.trim().toUpperCase(),
      restaurantId,
      subtotal,
    });

    if (result.valid) {
      onCodeApplied(code.trim().toUpperCase(), result.discount, result.discountType, result.promotionId!);
      setCode('');
      showToast(result.message || t('promoCode.codeApplied'), 'success');
    } else {
      showToast(result.message || t('promoCode.invalidCode'), 'error');
    }
  };

  const handleRemove = () => {
    onCodeRemoved();
    showToast(t('promoCode.codeRemoved'), 'info');
  };

  if (appliedCode) {
    return (
      <div className="promo-code-applied">
        <div className="promo-code-badge">
          <Tag size={16} />
          <span>{appliedCode}</span>
          <button onClick={handleRemove} className="remove-code-btn" aria-label={t('promoCode.removeCode')}>
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="promo-code-input">
      <div className="promo-code-field">
        <Tag size={18} className="promo-icon" />
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('promoCode.codePlaceholder')}
          className="promo-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleApply();
            }
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleApply}
          disabled={validateMutation.isPending || !code.trim()}
          className="apply-btn"
        >
          {validateMutation.isPending ? '...' : t('promoCode.apply')}
        </Button>
      </div>
    </div>
  );
}

