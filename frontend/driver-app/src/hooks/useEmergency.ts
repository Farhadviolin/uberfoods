import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { logger } from '../utils/logger';

interface EmergencyAlert {
  id: string;
  type: string;
  location: { lat: number; lng: number };
  message?: string;
  status: 'active' | 'resolved';
  sentAt: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
}

export function useEmergency() {
  const { driver } = useAuth();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendAlert = useCallback(async (
    type: string,
    location: { lat: number; lng: number },
    message?: string
  ) => {
    if (!driver?.id) return { success: false, error: 'Driver ID fehlt' };

    try {
      setLoading(true);
      const response = await api.post(`/drivers/${driver.id}/emergency/alert`, {
        type,
        location,
        message,
      });
      setAlerts((prev) => [response.data, ...prev]);
      return { success: true, alert: response.data };
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Senden des Notrufs');
      logger.error('Emergency Alert Error', 'useEmergency', err);
      return {
        success: false,
        error: err.response?.data?.message || 'Fehler beim Senden des Notrufs',
      };
    } finally {
      setLoading(false);
    }
  }, [driver?.id]);

  const getAlerts = useCallback(async (status?: string) => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/emergency/alerts`, {
        params: status ? { status } : {},
      });
      // Backend returns { alerts: [...], total: number }
      const alertsData = response.data.alerts || [];
      setAlerts(alertsData.map((alert: any) => ({
        id: alert.id,
        type: alert.type || alert.alertType,
        location: alert.location,
        message: alert.message || alert.description,
        status: alert.status?.toLowerCase() === 'active' ? 'active' : 'resolved',
        sentAt: alert.createdAt || alert.updatedAt,
      })));
    } catch (err: any) {
      logger.error('Emergency Alerts Fetch Error', 'useEmergency', err);
    }
  }, [driver?.id]);

  const getContacts = useCallback(async () => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/emergency/contacts`);
      setContacts(response.data.contacts || []);
    } catch (err: any) {
      logger.error('Emergency Contacts Fetch Error', 'useEmergency', err);
    }
  }, [driver?.id]);

  const updateContact = useCallback(async (
    contactId: string,
    data: { name: string; phone: string; relationship?: string }
  ) => {
    if (!driver?.id) return { success: false, error: 'Driver ID fehlt' };

    try {
      await api.put(`/drivers/${driver.id}/emergency/contacts/${contactId}`, data);
      await getContacts();
      return { success: true };
    } catch (err: any) {
      logger.error('Update Emergency Contact Error', 'useEmergency', err);
      return {
        success: false,
        error: err.response?.data?.message || 'Fehler beim Aktualisieren des Kontakts',
      };
    }
  }, [driver?.id, getContacts]);

  const shareLocation = useCallback(async (
    shareWith: string[],
    duration?: number
  ) => {
    if (!driver?.id) return { success: false, error: 'Driver ID fehlt' };

    try {
      const response = await api.post(`/drivers/${driver.id}/emergency/location/share`, {
        shareWith,
        duration,
      });
      return { success: true, shareLink: response.data.shareLink };
    } catch (err: any) {
      logger.error('Share Emergency Location Error', 'useEmergency', err);
      return {
        success: false,
        error: err.response?.data?.message || 'Fehler beim Teilen des Standorts',
      };
    }
  }, [driver?.id]);

  return {
    alerts,
    contacts,
    loading,
    error,
    sendAlert,
    getAlerts,
    getContacts,
    updateContact,
    shareLocation,
  };
}

