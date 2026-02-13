import { useTranslation as useI18nTranslation } from 'react-i18next';

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  const changeLanguage = async (language: 'de' | 'en' | 'fa') => {
    await i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  };

  const currentLanguage = i18n.language as 'de' | 'en' | 'fa';

  return {
    t,
    changeLanguage,
    currentLanguage,
  };
};

// Type-safe translation keys
export type TranslationKey =
  | 'common.save'
  | 'common.cancel'
  | 'common.loading'
  | 'common.error'
  | 'common.success'
  | 'navigation.home'
  | 'navigation.restaurants'
  | 'navigation.orders'
  | 'navigation.profile'
  | 'auth.login'
  | 'auth.register'
  | 'auth.logout'
  | 'cart.add'
  | 'cart.remove'
  | 'cart.checkout'
  | 'orders.status.pending'
  | 'orders.status.confirmed'
  | 'orders.status.preparing'
  | 'orders.status.ready'
  | 'orders.status.delivered'
  | 'payment.card'
  | 'payment.paypal'
  | 'payment.applePay'
  | 'payment.googlePay'
  | 'restaurant.details'
  | 'restaurant.menu'
  | 'restaurant.reviews'
  | 'search.placeholder'
  | 'favorites.add'
  | 'favorites.remove'
  | 'profile.settings'
  | 'profile.addresses'
  | 'profile.paymentMethods'
  | 'social.feed'
  | 'social.follow'
  | 'social.unfollow'
  | 'gamification.points'
  | 'gamification.level'
  | 'gamification.achievements'
  | 'nutrition.calories'
  | 'nutrition.protein'
  | 'nutrition.carbs'
  | 'nutrition.fat'
  | 'mealPlanner.breakfast'
  | 'mealPlanner.lunch'
  | 'mealPlanner.dinner'
  | 'mealPlanner.snacks'
  | 'liveOrders.newOrder'
  | 'liveOrders.trending'
  | 'groupOrders.create'
  | 'groupOrders.join'
  | 'groupOrders.invite'
  | 'chat.send'
  | 'chat.typing'
  | 'notifications.enable'
  | 'notifications.disable'
  | 'accessibility.skipToContent'
  | 'accessibility.screenReader'
  | 'pwa.install'
  | 'pwa.installed'
  | 'offline.message'
  | 'offline.retry'
  | 'error.network'
  | 'error.server'
  | 'error.validation'
  | 'error.unknown';
