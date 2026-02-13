/**
 * Navigation Utilities für Cross-App Deep-Links
 * Ermöglicht Navigation zu anderen Apps (Customer-Web, Driver-App, etc.)
 */

import { config } from '../config';

/**
 * Öffnet Customer-Web App in neuem Tab
 */
export function openCustomerWeb(path: string = '') {
  const url = `${config.customerWebUrl}${path.startsWith('/') ? path : `/${path}`}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Öffnet Customer-Profil in Customer-Web
 */
export function openCustomerProfile(customerId: string) {
  openCustomerWeb(`/customers/${customerId}`);
}

/**
 * Öffnet Customer-Bestellung in Customer-Web
 */
export function openCustomerOrder(orderId: string) {
  openCustomerWeb(`/orders/${orderId}`);
}

/**
 * Öffnet Driver-App in neuem Tab
 */
export function openDriverApp(path: string = '') {
  const url = `${config.driverAppUrl}${path.startsWith('/') ? path : `/${path}`}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Öffnet Driver-Profil in Driver-App
 */
export function openDriverProfile(driverId: string) {
  openDriverApp(`/drivers/${driverId}`);
}

/**
 * Öffnet Driver-Bestellung in Driver-App
 */
export function openDriverOrder(orderId: string) {
  openDriverApp(`/orders/${orderId}`);
}

/**
 * Öffnet Restaurant-Web in neuem Tab
 */
export function openRestaurantWeb(path: string = '') {
  const url = `${config.restaurantWebUrl}${path.startsWith('/') ? path : `/${path}`}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Öffnet Restaurant-Dashboard in Restaurant-Web
 */
export function openRestaurantDashboard(restaurantId: string) {
  openRestaurantWeb(`/restaurants/${restaurantId}/dashboard`);
}

/**
 * Öffnet Restaurant-Bestellung in Restaurant-Web
 */
export function openRestaurantOrder(orderId: string) {
  openRestaurantWeb(`/orders/${orderId}`);
}

/**
 * Generische Funktion zum Öffnen von URLs
 */
export function openUrl(url: string, newTab: boolean = true) {
  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = url;
  }
}

