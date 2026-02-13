import { useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import { AxiosErrorWithResponse } from '../types';

export interface PromoCodeValidation {
  valid: boolean;
  discount: number;
  discountType: string;
  message?: string;
  promotionId?: string;
}

export function useValidatePromoCode() {
  return useMutation({
    mutationFn: async ({ code, restaurantId, subtotal }: { code: string; restaurantId: string; subtotal: number }) => {
      try {
        // Validiere Promo Code über Backend (Public Endpoint)
        const response = await api.get(`/promotions/public/code/${code}`);
        const promotion = response.data;

        // Prüfe Restaurant-Kompatibilität
        if (promotion.restaurantId && promotion.restaurantId !== restaurantId) {
          return {
            valid: false,
            discount: 0,
            discountType: 'PERCENTAGE',
            message: 'Gutscheincode ist nicht für dieses Restaurant gültig',
          } as PromoCodeValidation;
        }

        // Prüfe Mindestbestellwert
        if (promotion.minOrderAmount && subtotal < promotion.minOrderAmount) {
          return {
            valid: false,
            discount: 0,
            discountType: 'PERCENTAGE',
            message: `Mindestbestellwert von ${promotion.minOrderAmount}€ nicht erreicht`,
          } as PromoCodeValidation;
        }

        return {
          valid: true,
          discount: promotion.discount,
          discountType: promotion.discountType,
          promotionId: promotion.id,
          message: 'Gutscheincode erfolgreich angewendet',
        } as PromoCodeValidation;
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        return {
          valid: false,
          discount: 0,
          discountType: 'PERCENTAGE',
          message: axiosError.response?.data?.message || 'Ungültiger Gutscheincode',
        } as PromoCodeValidation;
      }
    },
  });
}

