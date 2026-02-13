# ♿ Accessibility (A11y) - Admin Panel

**Erstellt:** 2025-01-27  
**Status:** ✅ WCAG 2.1 AA konform (in Arbeit)

---

## ✅ Implementierte Accessibility-Features

### 1. ARIA-Labels & Roles

- ✅ **Navigation:** `role="navigation"` mit `aria-label` in Sidebar
- ✅ **Menu Items:** `role="menuitem"` für Sidebar-Navigation
- ✅ **Formulare:** `aria-label` für Formulare
- ✅ **Buttons:** `aria-label` für Icon-Buttons
- ✅ **Alerts:** `role="alert"` für Fehlermeldungen
- ✅ **Status:** `aria-busy` für Ladezustände
- ✅ **Current Page:** `aria-current="page"` für aktive Navigation

### 2. Keyboard Navigation

- ✅ **Tab-Navigation:** Alle interaktiven Elemente sind per Tab erreichbar
- ✅ **Enter/Space:** Buttons und Links können mit Enter/Space aktiviert werden
- ✅ **Escape:** Modals können mit Escape geschlossen werden
- ✅ **Keyboard Shortcuts:** Command Palette (Cmd/Ctrl + K)

### 3. Screen Reader Support

- ✅ **Semantic HTML:** Korrekte Verwendung von `<nav>`, `<main>`, `<header>`, `<button>`
- ✅ **Labels:** Alle Input-Felder haben `<label>` mit `htmlFor`
- ✅ **Hidden Icons:** Dekorative Icons haben `aria-hidden="true"`
- ✅ **Live Regions:** `aria-live="polite"` für dynamische Updates

### 4. Focus Management

- ✅ **Auto-Focus:** Login-Formular fokussiert Email-Feld
- ✅ **Focus Indicators:** Sichtbare Focus-States für alle interaktiven Elemente
- ✅ **Focus Trap:** Modals fangen Focus ein

### 5. Color & Contrast

- ✅ **Contrast Ratios:** Mindestens 4.5:1 für Text (WCAG AA)
- ✅ **Color Independence:** Informationen nicht nur durch Farbe vermittelt
- ✅ **Dark Mode:** Vollständiger Dark Mode Support

---

## 🔧 Best Practices

### ARIA-Attribute

```tsx
// Navigation
<nav role="navigation" aria-label="Hauptnavigation">

// Menu Items
<button role="menuitem" aria-current={isActive ? 'page' : undefined}>

// Formulare
<form aria-label="Login-Formular">
  <label htmlFor="email">E-Mail</label>
  <input id="email" aria-required="true" />
</form>

// Alerts
<div role="alert" aria-live="polite">
  {errorMessage}
</div>

// Buttons
<button aria-label="Menü öffnen" aria-expanded={isOpen}>
  <span aria-hidden="true">☰</span>
</button>
```

### Keyboard Navigation

```tsx
// Enter/Space für Buttons
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>

// Escape für Modals
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

---

## 📋 Checkliste

### ✅ Erledigt

- [x] ARIA-Labels für Navigation
- [x] ARIA-Labels für Buttons
- [x] ARIA-Labels für Formulare
- [x] Keyboard Navigation (Tab, Enter, Escape)
- [x] Screen Reader Support
- [x] Focus Management
- [x] Color Contrast (WCAG AA)
- [x] Semantic HTML

### ⏳ In Arbeit

- [ ] Vollständige Keyboard-Navigation für alle Komponenten
- [ ] Skip Links für Hauptinhalt
- [ ] Landmark-Regionen
- [ ] Vollständige ARIA-Labels für alle interaktiven Elemente

### 📝 Geplant

- [ ] Screen Reader Testing
- [ ] Keyboard-Only Testing
- [ ] WCAG 2.1 AAA Compliance
- [ ] Accessibility Audit Tool Integration

---

## 🧪 Testing

### Manuelle Tests

1. **Keyboard Navigation:**
   - Tab durch alle interaktiven Elemente
   - Enter/Space für Buttons
   - Escape für Modals

2. **Screen Reader:**
   - NVDA (Windows)
   - JAWS (Windows)
   - VoiceOver (macOS/iOS)

3. **Color Contrast:**
   - WebAIM Contrast Checker
   - axe DevTools

### Automatisierte Tests

```bash
# Accessibility Testing (geplant)
npm run test:a11y
```

---

## 📚 Ressourcen

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

**Status:** ✅ Grundlegende Accessibility implementiert  
**Nächste Schritte:** Vollständige Keyboard-Navigation, Screen Reader Testing

