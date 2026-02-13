import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import './LegalPagesTab.css';

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  language: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PAGES = [
  { slug: 'impressum', title: 'Impressum', content: '<h1>Impressum</h1><p>Hier steht das Impressum...</p>' },
  { slug: 'datenschutz', title: 'Datenschutzerklärung', content: '<h1>Datenschutzerklärung</h1><p>Hier steht die Datenschutzerklärung...</p>' },
  { slug: 'agb', title: 'Allgemeine Geschäftsbedingungen', content: '<h1>AGB</h1><p>Hier stehen die AGB...</p>' },
  { slug: 'widerruf', title: 'Widerrufsrecht', content: '<h1>Widerrufsrecht</h1><p>Hier steht das Widerrufsrecht...</p>' },
];

export function LegalPagesTab() {
  const { showToast } = useToast();
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPage, setEditingPage] = useState<LegalPage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    language: 'de',
    isPublished: true,
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/legal-pages');
      setPages(response.data || []);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Laden der Seiten', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefault = async (defaultPage: typeof DEFAULT_PAGES[0]) => {
    try {
      await api.post('/legal-pages', {
        ...defaultPage,
        language: 'de',
        isPublished: true,
      });
      showToast('Seite erfolgreich erstellt!', 'success');
      fetchPages();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Erstellen der Seite', 'error');
    }
  };

  const handleEdit = (page: LegalPage) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      language: page.language,
      isPublished: page.isPublished,
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingPage(null);
    setFormData({
      slug: '',
      title: '',
      content: '',
      language: 'de',
      isPublished: true,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPage) {
        await api.put(`/legal-pages/${editingPage.slug}`, formData);
        showToast('Seite erfolgreich aktualisiert!', 'success');
      } else {
        await api.post('/legal-pages', formData);
        showToast('Seite erfolgreich erstellt!', 'success');
      }
      setShowForm(false);
      setEditingPage(null);
      fetchPages();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Speichern', 'error');
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Möchten Sie diese Seite wirklich löschen?')) return;

    try {
      await api.delete(`/legal-pages/${slug}`);
      showToast('Seite erfolgreich gelöscht!', 'success');
      fetchPages();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Löschen', 'error');
    }
  };

  const handleTogglePublish = async (page: LegalPage) => {
    try {
      await api.put(`/legal-pages/${page.slug}`, {
        isPublished: !page.isPublished,
      });
      showToast(`Seite ${!page.isPublished ? 'veröffentlicht' : 'unveröffentlicht'}!`, 'success');
      fetchPages();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Ändern des Status', 'error');
    }
  };

  if (showForm) {
    return (
      <div className="legal-pages-tab">
        <div className="legal-pages-header">
          <h2>{editingPage ? 'Seite bearbeiten' : 'Neue Seite erstellen'}</h2>
          <button onClick={() => { setShowForm(false); setEditingPage(null); }} className="btn-secondary">
            Zurück
          </button>
        </div>

        <form onSubmit={handleSave} className="legal-page-form">
          <div className="form-group">
            <label>Slug (URL-Teil) *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
              disabled={!!editingPage}
              placeholder="z.B. impressum, datenschutz"
            />
            {editingPage && <small>Slug kann nicht geändert werden</small>}
          </div>

          <div className="form-group">
            <label>Titel *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="z.B. Impressum"
            />
          </div>

          <div className="form-group">
            <label>Sprache</label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="form-group">
            <label>Inhalt (HTML) *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={20}
              placeholder="HTML-Content hier eingeben..."
              style={{ fontFamily: 'monospace', fontSize: '14px' }}
            />
            <small>HTML wird direkt gerendert. Verwenden Sie &lt;h1&gt;, &lt;p&gt;, &lt;ul&gt; etc.</small>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              />
              Veröffentlicht
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingPage ? 'Aktualisieren' : 'Erstellen'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingPage(null); }} className="btn-secondary">
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="legal-pages-tab">
      <div className="legal-pages-header">
        <h2>📄 Legale Seiten</h2>
        <button onClick={handleCreate} className="btn-primary">
          + Neue Seite
        </button>
      </div>

      {pages.length === 0 && !loading && (
        <div className="legal-pages-empty">
          <p>Noch keine legalen Seiten vorhanden. Erstellen Sie Standard-Seiten:</p>
          <div className="default-pages-grid">
            {DEFAULT_PAGES.map((page) => (
              <div key={page.slug} className="default-page-card">
                <h3>{page.title}</h3>
                <p>Slug: {page.slug}</p>
                <button onClick={() => handleCreateDefault(page)} className="btn-primary">
                  Erstellen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Lade Seiten...</div>
      ) : (
        <div className="legal-pages-list">
          <table className="data-table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Titel</th>
                <th>Sprache</th>
                <th>Status</th>
                <th>Aktualisiert</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td><code>{page.slug}</code></td>
                  <td>{page.title}</td>
                  <td>{page.language}</td>
                  <td>
                    <span className={`status-badge ${page.isPublished ? 'published' : 'draft'}`}>
                      {page.isPublished ? '✅ Veröffentlicht' : '📝 Entwurf'}
                    </span>
                  </td>
                  <td>{new Date(page.updatedAt).toLocaleDateString('de-DE')}</td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleEdit(page)} className="btn-icon" title="Bearbeiten">
                        ✏️
                      </button>
                      <button
                        onClick={() => handleTogglePublish(page)}
                        className="btn-icon"
                        title={page.isPublished ? 'Unveröffentlichen' : 'Veröffentlichen'}
                      >
                        {page.isPublished ? '👁️' : '👁️‍🗨️'}
                      </button>
                      <button onClick={() => handleDelete(page.slug)} className="btn-icon btn-danger" title="Löschen">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

