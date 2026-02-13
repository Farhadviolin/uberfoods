import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../design-system/ThemeProvider';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';
import { Switch } from '../design-system/Switch';
import { Tabs } from '../design-system/Tabs';
import { Skeleton } from '../design-system/Skeleton';
import { Toast } from '../design-system/Toast';
import { useToast } from '../contexts/ToastContext';
import { Settings as SettingsIcon, User, Bell, Lock, Globe, Palette, Trash2, Download, Eye, EyeOff } from 'lucide-react';
import './Settings.css';

interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  social: boolean;
  reviews: boolean;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showOrderHistory: boolean;
  allowDataSharing: boolean;
  marketingEmails: boolean;
}

export function Settings() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const { toggleTheme, theme } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile Settings
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification Preferences
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    push: true,
    email: true,
    sms: false,
    orderUpdates: true,
    promotions: true,
    social: true,
    reviews: true,
  });
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Privacy Settings
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'friends',
    showOrderHistory: true,
    allowDataSharing: false,
    marketingEmails: true,
  });

  // Language & Theme
  const [language, setLanguage] = useState(i18n.language || 'de');
  const [currentTheme, setCurrentTheme] = useState(theme);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    if (!user?.id) {
      setLoadingNotifications(false);
      return;
    }

    try {
      const response = await api.get('/notifications/preferences', {
        params: { userId: user.id },
      });
      if (response.data) {
        setNotifications({
          push: response.data.push ?? true,
          email: response.data.email ?? true,
          sms: response.data.sms ?? false,
          orderUpdates: response.data.orderUpdates ?? true,
          promotions: response.data.promotions ?? true,
          social: response.data.social ?? true,
          reviews: response.data.reviews ?? true,
        });
      }
    } catch (err) {
      // Ignore errors - use defaults
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const response = await api.put(`/customers/${user.id}`, profileData);
      if (response.data && updateUser) {
        updateUser(response.data);
      }
      showToast(t('settings.profileSaved'), 'success');
    } catch (err) {
      showToast(extractErrorMessage(err) || t('settings.profileSaveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.id) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast(t('settings.passwordsDoNotMatch'), 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showToast(t('settings.passwordTooShort'), 'error');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/customers/${user.id}`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      showToast(t('settings.passwordChanged'), 'success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
    } catch (err) {
      showToast(extractErrorMessage(err) || t('settings.passwordChangeError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      await api.put('/notifications/preferences', notifications, {
        params: { userId: user.id },
      });
      showToast(t('settings.notificationsSaved'), 'success');
    } catch (err) {
      showToast(extractErrorMessage(err) || t('settings.notificationsSaveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      await api.put(`/customers/${user.id}`, {
        privacySettings: privacy,
      });
      showToast(t('settings.privacySaved'), 'success');
    } catch (err) {
      showToast(extractErrorMessage(err) || t('settings.privacySaveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('i18nextLng', newLanguage);
    showToast(t('settings.languageChanged'), 'success');
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setCurrentTheme(newTheme);
    if (newTheme === 'dark' && theme === 'light') {
      toggleTheme();
    } else if (newTheme === 'light' && theme === 'dark') {
      toggleTheme();
    }
    showToast(t('settings.themeChanged'), 'success');
  };

  const handleExportData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Export user data
      const userData = {
        profile: user,
        orders: [],
        addresses: [],
        favorites: [],
        // Add more data as needed
      };

      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uberfoods-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(t('settings.dataExported'), 'success');
    } catch (err) {
      showToast(extractErrorMessage(err) || t('settings.dataExportError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    if (!confirm(t('settings.deleteAccountConfirm'))) return;

    setLoading(true);
    try {
      await api.delete(`/customers/${user.id}`);
      showToast(t('settings.accountDeleted'), 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      showToast(extractErrorMessage(err) || t('settings.accountDeleteError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'privacy', label: t('settings.privacy'), icon: Lock },
    { id: 'language', label: t('settings.language'), icon: Globe },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'data', label: t('settings.data'), icon: Download },
  ];

  if (!user) {
    return (
      <div className="settings-container">
        <Card>
          <div className="settings-empty">
            <SettingsIcon size={48} />
            <h2>{t('settings.title')}</h2>
            <p>{t('settings.pleaseLogin')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
      />

      <div className="settings-content">
        {activeTab === 'profile' && (
          <Card>
            <h2>{t('settings.profile')}</h2>
            <div className="settings-form">
              <Input
                label={t('auth.name')}
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder={t('auth.namePlaceholder')}
              />
              <Input
                label={t('auth.phone')}
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder={t('auth.phonePlaceholder')}
                type="tel"
              />
              <div className="settings-actions">
                <Button onClick={handleSaveProfile} loading={saving} variant="primary">
                  {t('settings.save')}
                </Button>
              </div>

              <div className="settings-section-divider" />

              <div className="settings-section">
                <h3>{t('settings.changePassword')}</h3>
                {!showPasswordForm ? (
                  <Button onClick={() => setShowPasswordForm(true)} variant="outline">
                    {t('settings.changePassword')}
                  </Button>
                ) : (
                  <div className="password-form">
                    <Input
                      label={t('settings.currentPassword')}
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      iconRight={
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="password-toggle"
                        >
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                    <Input
                      label={t('settings.newPassword')}
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      iconRight={
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="password-toggle"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                    <Input
                      label={t('settings.confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      iconRight={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="password-toggle"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                    <div className="settings-actions">
                      <Button onClick={handleChangePassword} loading={saving} variant="primary">
                        {t('settings.save')}
                      </Button>
                      <Button onClick={() => setShowPasswordForm(false)} variant="outline">
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'notifications' && (
          <Card>
            <h2>{t('settings.notifications')}</h2>
            {loadingNotifications ? (
              <Skeleton variant="rectangular" width="100%" height="200px" />
            ) : (
              <div className="settings-form">
                <div className="settings-section">
                  <h3>{t('settings.notificationChannels')}</h3>
                  <div className="settings-switch-group">
                    <div className="settings-switch-item">
                      <div>
                        <label>{t('settings.pushNotifications')}</label>
                        <p>{t('settings.pushNotificationsDesc')}</p>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                      />
                    </div>
                    <div className="settings-switch-item">
                      <div>
                        <label>{t('settings.emailNotifications')}</label>
                        <p>{t('settings.emailNotificationsDesc')}</p>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                      />
                    </div>
                    <div className="settings-switch-item">
                      <div>
                        <label>{t('settings.smsNotifications')}</label>
                        <p>{t('settings.smsNotificationsDesc')}</p>
                      </div>
                      <Switch
                        checked={notifications.sms}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-section-divider" />

                <div className="settings-section">
                  <h3>{t('settings.notificationTypes')}</h3>
                  <div className="settings-switch-group">
                    <div className="settings-switch-item">
                      <div>
                        <label>{t('settings.orderUpdates')}</label>
                        <p>{t('settings.orderUpdatesDesc')}</p>
                      </div>
                      <Switch
                        checked={notifications.orderUpdates}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, orderUpdates: checked })}
                      />
                    </div>
                    <div className="settings-switch-item">
                      <div>
                        <label>{t('settings.promotions')}</label>
                        <p>{t('settings.promotionsDesc')}</p>
                      </div>
                      <Switch
                        checked={notifications.promotions}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, promotions: checked })}
                      />
                    </div>
                    <div className="settings-switch-item">
                      <div>
                        <label>{t('settings.socialNotifications')}</label>
                        <p>{t('settings.socialNotificationsDesc')}</p>
                      </div>
                      <Switch
                        checked={notifications.social}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, social: checked })}
                      />
                    </div>
                    <div className="settings-switch-item">
                      <div>
                        <label>{t('settings.reviewNotifications')}</label>
                        <p>{t('settings.reviewNotificationsDesc')}</p>
                      </div>
                      <Switch
                        checked={notifications.reviews}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, reviews: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-actions">
                  <Button onClick={handleSaveNotifications} loading={saving} variant="primary">
                    {t('settings.save')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'privacy' && (
          <Card>
            <h2>{t('settings.privacy')}</h2>
            <div className="settings-form">
              <div className="settings-section">
                <h3>{t('settings.profileVisibility')}</h3>
                <div className="settings-radio-group">
                  <label>
                    <input
                      type="radio"
                      value="public"
                      checked={privacy.profileVisibility === 'public'}
                      onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value as 'public' })}
                    />
                    <span>{t('settings.public')}</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="friends"
                      checked={privacy.profileVisibility === 'friends'}
                      onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value as 'friends' })}
                    />
                    <span>{t('settings.friends')}</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="private"
                      checked={privacy.profileVisibility === 'private'}
                      onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value as 'private' })}
                    />
                    <span>{t('settings.private')}</span>
                  </label>
                </div>
              </div>

              <div className="settings-section-divider" />

              <div className="settings-section">
                <div className="settings-switch-item">
                  <div>
                    <label>{t('settings.showOrderHistory')}</label>
                    <p>{t('settings.showOrderHistoryDesc')}</p>
                  </div>
                  <Switch
                    checked={privacy.showOrderHistory}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, showOrderHistory: checked })}
                  />
                </div>
                <div className="settings-switch-item">
                  <div>
                    <label>{t('settings.allowDataSharing')}</label>
                    <p>{t('settings.allowDataSharingDesc')}</p>
                  </div>
                  <Switch
                    checked={privacy.allowDataSharing}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, allowDataSharing: checked })}
                  />
                </div>
                <div className="settings-switch-item">
                  <div>
                    <label>{t('settings.marketingEmails')}</label>
                    <p>{t('settings.marketingEmailsDesc')}</p>
                  </div>
                  <Switch
                    checked={privacy.marketingEmails}
                    onCheckedChange={(checked) => setPrivacy({ ...privacy, marketingEmails: checked })}
                  />
                </div>
              </div>

              <div className="settings-actions">
                <Button onClick={handleSavePrivacy} loading={saving} variant="primary">
                  {t('settings.save')}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'language' && (
          <Card>
            <h2>{t('settings.language')}</h2>
            <div className="settings-form">
              <div className="settings-section">
                <h3>{t('settings.selectLanguage')}</h3>
                <div className="settings-radio-group">
                  <label>
                    <input
                      type="radio"
                      value="de"
                      checked={language === 'de'}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                    />
                    <span>Deutsch</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="en"
                      checked={language === 'en'}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                    />
                    <span>English</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'appearance' && (
          <Card>
            <h2>{t('settings.appearance')}</h2>
            <div className="settings-form">
              <div className="settings-section">
                <h3>{t('settings.theme')}</h3>
                <div className="settings-radio-group">
                  <label>
                    <input
                      type="radio"
                      value="light"
                      checked={currentTheme === 'light'}
                      onChange={(e) => handleThemeChange(e.target.value as 'light')}
                    />
                    <span>{t('settings.light')}</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="dark"
                      checked={currentTheme === 'dark'}
                      onChange={(e) => handleThemeChange(e.target.value as 'dark')}
                    />
                    <span>{t('settings.dark')}</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'data' && (
          <Card>
            <h2>{t('settings.data')}</h2>
            <div className="settings-form">
              <div className="settings-section">
                <h3>{t('settings.exportData')}</h3>
                <p>{t('settings.exportDataDesc')}</p>
                <div className="settings-actions">
                  <Button onClick={handleExportData} loading={loading} variant="outline">
                    <Download size={18} />
                    {t('settings.exportData')}
                  </Button>
                </div>
              </div>

              <div className="settings-section-divider" />

              <div className="settings-section danger-zone">
                <h3>{t('settings.deleteAccount')}</h3>
                <p>{t('settings.deleteAccountDesc')}</p>
                <div className="settings-actions">
                  <Button onClick={handleDeleteAccount} loading={loading} variant="danger">
                    <Trash2 size={18} />
                    {t('settings.deleteAccount')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

