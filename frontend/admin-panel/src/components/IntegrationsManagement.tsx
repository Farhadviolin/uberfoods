import { useState } from 'react';
import { useIntegrationsData, Integration, APIKey, Webhook } from '../hooks/useIntegrationsData';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';
import { Input } from '../design-system/Input';
import { Select } from '../design-system/Select';
import { Modal } from '../design-system/Modal';
import { Badge } from '../design-system/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../design-system/Tabs';
import { Alert } from '../design-system/Alert';
import { Spinner } from '../design-system/Spinner';
import './IntegrationsManagement.css';

export function IntegrationsManagement() {
  const {
    available,
    connected,
    apiKeys,
    webhooks,
    isLoading,
    error,
    connectIntegration,
    disconnectIntegration,
    createAPIKey,
    createWebhook,
    isConnecting,
    isDisconnecting,
    isCreatingAPIKey,
    isCreatingWebhook,
    refetch,
  } = useIntegrationsData();

  const [activeTab, setActiveTab] = useState<'integrations' | 'api-keys' | 'webhooks'>('integrations');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [connectConfig, setConnectConfig] = useState<Record<string, string>>({});

  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
  const [apiKeyForm, setApiKeyForm] = useState({
    name: '',
    environment: 'development' as 'production' | 'staging' | 'development',
    permissions: [] as string[],
  });

  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    eventTypes: [] as string[],
    secret: '',
  });

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConnectConfig({});
    setShowConnectModal(true);
  };

  const handleDisconnect = (integrationId: string) => {
    if (confirm('Sind Sie sicher, dass Sie diese Integration trennen möchten?')) {
      disconnectIntegration(integrationId);
    }
  };

  const submitConnect = () => {
    if (selectedIntegration) {
      connectIntegration({
        id: selectedIntegration.id,
        config: connectConfig,
      });
      setShowConnectModal(false);
    }
  };

  const submitAPIKey = () => {
    if (apiKeyForm.name.trim()) {
      createAPIKey(apiKeyForm);
      setShowAPIKeyModal(false);
      setApiKeyForm({
        name: '',
        environment: 'development',
        permissions: [],
      });
    }
  };

  const submitWebhook = () => {
    if (webhookForm.name.trim() && webhookForm.url.trim()) {
      createWebhook(webhookForm);
      setShowWebhookModal(false);
      setWebhookForm({
        name: '',
        url: '',
        eventTypes: [],
        secret: '',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'success' as const,
      disconnected: 'secondary' as const,
      error: 'error' as const,
      active: 'success' as const,
      inactive: 'secondary' as const,
    };
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const availableIntegrations = available.filter(
    (integration) => !connected.some((connected) => connected.id === integration.id)
  );

  if (isLoading) {
    return (
      <div className="integrations-loading">
        <Spinner size="lg" />
        <p>Lade Integrationen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" className="integrations-error">
        <strong>Fehler beim Laden der Integrationen:</strong> {error.message}
        <Button onClick={refetch} variant="outline" size="sm">
          Erneut versuchen
        </Button>
      </Alert>
    );
  }

  return (
    <div className="integrations-management">
      <div className="integrations-header">
        <h2>Integrationen verwalten</h2>
        <Button onClick={refetch} variant="outline">
          Aktualisieren
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'integrations' | 'api-keys' | 'webhooks')}>
        <TabsList>
          <TabsTrigger value="integrations">Integrationen</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          <div className="integrations-content">
            {/* Connected Integrations */}
            {connected.length > 0 && (
              <div className="integrations-section">
                <h3>Verknüpfte Integrationen</h3>
                <div className="integrations-grid">
                  {connected.map((integration) => (
                    <Card key={integration.id} className="integration-card">
                      <div className="integration-header">
                        <h4>{integration.name}</h4>
                        {getStatusBadge(integration.status)}
                      </div>
                      <p>{integration.description}</p>
                      <div className="integration-meta">
                        <small>Kategorie: {integration.category}</small>
                        {integration.lastSync && (
                          <small>Letzte Synchronisation: {new Date(integration.lastSync).toLocaleString('de-DE')}</small>
                        )}
                      </div>
                      <div className="integration-actions">
                        <Button
                          onClick={() => handleDisconnect(integration.id)}
                          variant="outline"
                          size="sm"
                          disabled={isDisconnecting}
                        >
                          {isDisconnecting ? <Spinner size="sm" /> : 'Trennen'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Available Integrations */}
            {availableIntegrations.length > 0 && (
              <div className="integrations-section">
                <h3>Verfügbare Integrationen</h3>
                <div className="integrations-grid">
                  {availableIntegrations.map((integration) => (
                    <Card key={integration.id} className="integration-card available">
                      <div className="integration-header">
                        <h4>{integration.name}</h4>
                        {getStatusBadge('disconnected')}
                      </div>
                      <p>{integration.description}</p>
                      <div className="integration-meta">
                        <small>Kategorie: {integration.category}</small>
                      </div>
                      <div className="integration-actions">
                        <Button
                          onClick={() => handleConnect(integration)}
                          variant="primary"
                          size="sm"
                          disabled={isConnecting}
                        >
                          {isConnecting ? <Spinner size="sm" /> : 'Verbinden'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="api-keys">
          <div className="api-keys-content">
            <div className="section-header">
              <h3>API Keys</h3>
              <Button onClick={() => setShowAPIKeyModal(true)} variant="primary">
                Neuer API Key
              </Button>
            </div>

            <div className="api-keys-list">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id} className="api-key-card">
                  <div className="api-key-header">
                    <h4>{apiKey.name}</h4>
                    <Badge variant="secondary">{apiKey.environment}</Badge>
                  </div>
                  <div className="api-key-details">
                    <code className="api-key-value">{apiKey.key}</code>
                    <div className="api-key-meta">
                      <small>Erstellt: {new Date(apiKey.createdAt).toLocaleString('de-DE')}</small>
                      {apiKey.lastUsed && (
                        <small>Zuletzt verwendet: {new Date(apiKey.lastUsed).toLocaleString('de-DE')}</small>
                      )}
                      {apiKey.expiresAt && (
                        <small>Läuft ab: {new Date(apiKey.expiresAt).toLocaleString('de-DE')}</small>
                      )}
                    </div>
                    <div className="api-key-permissions">
                      {apiKey.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" size="sm">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}

              {apiKeys.length === 0 && (
                <div className="empty-state">
                  <p>Keine API Keys vorhanden</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="webhooks">
          <div className="webhooks-content">
            <div className="section-header">
              <h3>Webhooks</h3>
              <Button onClick={() => setShowWebhookModal(true)} variant="primary">
                Neuer Webhook
              </Button>
            </div>

            <div className="webhooks-list">
              {webhooks.map((webhook) => (
                <Card key={webhook.id} className="webhook-card">
                  <div className="webhook-header">
                    <h4>{webhook.name}</h4>
                    {getStatusBadge(webhook.status)}
                  </div>
                  <div className="webhook-details">
                    <div className="webhook-url">
                      <strong>URL:</strong> {webhook.url}
                    </div>
                    <div className="webhook-events">
                      <strong>Events:</strong>
                      {webhook.eventTypes.map((event) => (
                        <Badge key={event} variant="secondary" size="sm">
                          {event}
                        </Badge>
                      ))}
                    </div>
                    <div className="webhook-meta">
                      <small>Erstellt: {new Date(webhook.createdAt).toLocaleString('de-DE')}</small>
                      {webhook.lastTriggered && (
                        <small>Zuletzt ausgelöst: {new Date(webhook.lastTriggered).toLocaleString('de-DE')}</small>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {webhooks.length === 0 && (
                <div className="empty-state">
                  <p>Keine Webhooks konfiguriert</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Connect Integration Modal */}
      <Modal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        title={`Integration verbinden: ${selectedIntegration?.name}`}
      >
        <div className="connect-modal-content">
          {selectedIntegration && (
            <>
              <p>{selectedIntegration.description}</p>
              <div className="config-fields">
                <Input
                  type="password"
                  value={connectConfig.apiKey || ''}
                  onChange={(e) => setConnectConfig({ ...connectConfig, apiKey: e.target.value })}
                  placeholder="Geben Sie Ihren API Key ein"
                />
                <Input
                  type="password"
                  value={connectConfig.apiSecret || ''}
                  onChange={(e) => setConnectConfig({ ...connectConfig, apiSecret: e.target.value })}
                  placeholder="Geben Sie Ihren API Secret ein"
                />
                <Input
                  value={connectConfig.baseUrl || ''}
                  onChange={(e) => setConnectConfig({ ...connectConfig, baseUrl: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>
              <div className="modal-actions">
                <Button onClick={() => setShowConnectModal(false)} variant="outline">
                  Abbrechen
                </Button>
                <Button onClick={submitConnect} disabled={isConnecting}>
                  {isConnecting ? <Spinner size="sm" /> : 'Verbinden'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* API Key Modal */}
      <Modal
        isOpen={showAPIKeyModal}
        onClose={() => setShowAPIKeyModal(false)}
        title="Neuen API Key erstellen"
      >
        <div className="api-key-modal-content">
          <Input
            value={apiKeyForm.name}
            onChange={(e) => setApiKeyForm({ ...apiKeyForm, name: e.target.value })}
            placeholder="API Key Name"
            required
          />
          <Select
            label="Umgebung"
            value={apiKeyForm.environment}
            onChange={(value) => setApiKeyForm({ ...apiKeyForm, environment: value as any })}
            options={[
              { value: 'development', label: 'Development' },
              { value: 'staging', label: 'Staging' },
              { value: 'production', label: 'Production' },
            ]}
          />
          <div className="permissions-section">
            <label className="form-label">Berechtigungen</label>
            <div className="permissions-grid">
              {['read', 'write', 'delete', 'admin'].map((permission) => (
                <label key={permission} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={apiKeyForm.permissions.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setApiKeyForm({
                          ...apiKeyForm,
                          permissions: [...apiKeyForm.permissions, permission],
                        });
                      } else {
                        setApiKeyForm({
                          ...apiKeyForm,
                          permissions: apiKeyForm.permissions.filter((p) => p !== permission),
                        });
                      }
                    }}
                  />
                  {permission}
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <Button onClick={() => setShowAPIKeyModal(false)} variant="outline">
              Abbrechen
            </Button>
            <Button onClick={submitAPIKey} disabled={isCreatingAPIKey}>
              {isCreatingAPIKey ? <Spinner size="sm" /> : 'Erstellen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Webhook Modal */}
      <Modal
        isOpen={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        title="Neuen Webhook erstellen"
      >
        <div className="webhook-modal-content">
          <Input
            value={webhookForm.name}
            onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
            placeholder="Webhook Name"
            required
          />
          <Input
            value={webhookForm.url}
            onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
            placeholder="https://your-app.com/webhook"
            required
          />
          <Input
            type="password"
            value={webhookForm.secret}
            onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
            placeholder="Webhook Secret für Signatur"
          />
          <div className="events-section">
            <label className="form-label">Event Types</label>
            <div className="events-grid">
              {['order.created', 'order.updated', 'order.cancelled', 'payment.completed', 'user.created'].map((event) => (
                <label key={event} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={webhookForm.eventTypes.includes(event)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setWebhookForm({
                          ...webhookForm,
                          eventTypes: [...webhookForm.eventTypes, event],
                        });
                      } else {
                        setWebhookForm({
                          ...webhookForm,
                          eventTypes: webhookForm.eventTypes.filter((e) => e !== event),
                        });
                      }
                    }}
                  />
                  {event}
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <Button onClick={() => setShowWebhookModal(false)} variant="outline">
              Abbrechen
            </Button>
            <Button onClick={submitWebhook} disabled={isCreatingWebhook}>
              {isCreatingWebhook ? <Spinner size="sm" /> : 'Erstellen'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
