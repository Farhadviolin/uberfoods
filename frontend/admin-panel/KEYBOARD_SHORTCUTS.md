# ⌨️ Keyboard Shortcuts - Admin Panel

**Erstellt:** 2025-01-27  
**Status:** ✅ Vollständig implementiert

---

## 🎯 Übersicht

Das Admin-Panel unterstützt umfassende Keyboard Shortcuts für schnelle Navigation und effiziente Bedienung.

---

## 📋 Navigation Shortcuts

### Hauptnavigation

| Shortcut | Aktion | Beschreibung |
|----------|--------|--------------|
| `D` | Dashboard | Öffnet das Dashboard |
| `N` | Analytics | Öffnet Analytics |
| `M` | Financial | Öffnet Financial Management |
| `B` | RBAC | Öffnet Role-Based Access Control |
| `R` | Restaurants | Öffnet Restaurant Management |
| `G` | Dishes | Öffnet Gerichte Management |
| `O` | Orders | Öffnet Bestellungen |
| `C` | Customers | Öffnet Kunden Management |
| `F` | Drivers | Öffnet Fahrer Management |
| `A` | Audit | Öffnet Audit Logs |
| `P` | Promotions | Öffnet Promotionen |
| `S` | Settings | Öffnet Einstellungen |
| `T` | Toggle Theme | Wechselt zwischen Light/Dark Mode |

### Command Palette

| Shortcut | Aktion | Beschreibung |
|----------|--------|--------------|
| `Cmd/Ctrl + K` | Command Palette | Öffnet die Command Palette |
| `Esc` | Close | Schließt die Command Palette |

---

## 🔧 Interaktion Shortcuts

### Allgemein

| Shortcut | Aktion | Beschreibung |
|----------|--------|--------------|
| `Esc` | Close Modal | Schließt offene Modals |
| `Enter` | Submit Form | Bestätigt Formulare |
| `Tab` | Navigate | Navigiert durch Formularfelder |
| `Shift + Tab` | Navigate Back | Navigiert rückwärts |

### Tabellen

| Shortcut | Aktion | Beschreibung |
|----------|--------|--------------|
| `Arrow Up/Down` | Navigate Rows | Navigiert durch Tabellenzeilen |
| `Enter` | Select Row | Wählt Zeile aus |
| `Space` | Select Row | Wählt Zeile aus (Checkbox) |
| `Ctrl/Cmd + A` | Select All | Wählt alle Zeilen aus (wenn Bulk-Modus aktiv) |

---

## 🎨 Verwendung

### Implementierung

Die Keyboard Shortcuts werden über den `useKeyboardShortcuts` Hook implementiert:

```typescript
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

function MyComponent() {
  useKeyboardShortcuts({
    onDashboard: () => navigate('/dashboard'),
    onOrders: () => navigate('/orders'),
    // ...
  });
}
```

### Smart Detection

Die Shortcuts werden **nicht** ausgelöst, wenn:
- Der Fokus auf einem Input-Feld ist
- Der Fokus auf einem Textarea ist
- Ein Content-Editable-Element aktiv ist

Dies verhindert Konflikte mit normaler Texteingabe.

---

## 📝 Best Practices

### 1. Shortcuts nur außerhalb von Inputs

```typescript
// ✅ Gut: Prüft ob Input fokussiert ist
if (isInputFocused()) return;
```

### 2. Präfixe für Modifier-Keys

- `Cmd/Ctrl + K` - Command Palette
- `Shift + ...` - Alternative Aktionen
- `Alt + ...` - Erweiterte Funktionen

### 3. Konsistente Shortcuts

- Navigation: Einzelne Buchstaben (`D`, `O`, `C`)
- Aktionen: Modifier-Keys (`Cmd/Ctrl + K`)
- Escape: Immer zum Schließen

---

## 🔍 Command Palette

Die Command Palette (`Cmd/Ctrl + K`) bietet:

- **Schnelle Suche** nach allen Features
- **Fuzzy Search** für intelligente Ergebnisse
- **Keyboard Navigation** mit Arrow Keys
- **Enter** zum Ausführen

### Command Palette Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `Cmd/Ctrl + K` | Öffnen |
| `Esc` | Schließen |
| `Arrow Up/Down` | Navigieren |
| `Enter` | Ausführen |
| `Tab` | Auto-Complete |

---

## 🎯 Accessibility

### Screen Reader Support

- Alle Shortcuts sind dokumentiert
- ARIA-Labels für interaktive Elemente
- Keyboard-only Navigation möglich

### Visual Feedback

- Tooltips zeigen verfügbare Shortcuts
- Hover-States für interaktive Elemente
- Focus-Indikatoren für Keyboard-Navigation

---

## 📚 Erweiterte Shortcuts

### Geplant

- [ ] Custom Shortcuts (Benutzer-definierbar)
- [ ] Shortcut-Hints in UI
- [ ] Shortcut-Konflikte-Detection
- [ ] Shortcut-Export/Import

---

## 🧪 Testing

### Manuelle Tests

1. **Navigation:** Alle Shortcuts testen
2. **Input-Konflikte:** Shortcuts in Input-Feldern testen
3. **Modals:** Escape-Funktionalität testen
4. **Command Palette:** Alle Features testen

### Automatisierte Tests

```typescript
// E2E Test für Keyboard Shortcuts
test('should navigate to dashboard with D key', async () => {
  await page.keyboard.press('d');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## 📖 Ressourcen

- [MDN Keyboard Events](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
- [WAI-ARIA Keyboard Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [react-hotkeys-hook Documentation](https://github.com/JohannesKlauss/react-hotkeys-hook)

---

**Status:** ✅ Vollständig implementiert  
**Nächste Schritte:** Custom Shortcuts, Visual Hints

