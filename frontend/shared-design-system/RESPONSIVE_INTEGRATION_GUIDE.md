# Responsive Design System - Integration Guide

## ✅ Vollständig implementiert!

Das responsive Design-System ist jetzt in **allen 4 Frontend-Apps** integriert:

- ✅ Customer-Web
- ✅ Admin-Panel  
- ✅ Driver-App
- ✅ Restaurant-Web

## 🎯 Was wurde implementiert?

### 1. Shared Design System (`frontend/shared-design-system/`)

- **`responsive-tokens.ts`** - Einheitliche Breakpoints, Spacing, Typography
- **`useResponsive.ts`** - React Hooks für responsive Design
- **`responsive.css`** - CSS Utility-Klassen
- **`ResponsiveContainer.tsx`** - React Components für responsive Layouts

### 2. Integration in alle Apps

Alle Apps importieren jetzt automatisch das responsive CSS:
```css
@import url('../../shared-design-system/responsive.css');
```

## 📱 Breakpoints

- **Mobile**: 0-767px
- **Tablet**: 768-1023px  
- **Desktop**: 1024px+

## 🚀 Verwendung

### CSS Utility-Klassen

```html
<!-- Responsive Container -->
<div class="responsive-container">
  <h1 class="responsive-h1">Titel</h1>
</div>

<!-- Responsive Grid (automatisch 1-4 Spalten) -->
<div class="responsive-grid">
  <div class="responsive-card">Card 1</div>
  <div class="responsive-card">Card 2</div>
  <div class="responsive-card">Card 3</div>
</div>

<!-- Hide/Show basierend auf Device -->
<div class="responsive-hide-mobile">Nur Desktop/Tablet</div>
<div class="responsive-show-mobile">Nur Mobile</div>
```

### React Hooks

```tsx
import { useResponsive } from '../../shared-design-system/useResponsive';

function MyComponent() {
  const { isMobile, isTablet, isDesktop, deviceType } = useResponsive();
  
  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}
    </div>
  );
}
```

### ResponsiveContainer Component

```tsx
import { ResponsiveContainer, ResponsiveGrid } from '../../shared-design-system/ResponsiveContainer';

<ResponsiveContainer>
  <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
  </ResponsiveGrid>
</ResponsiveContainer>
```

## 🎨 CSS Variables

Das System verwendet CSS Variables, die sich automatisch anpassen:

- `--responsive-spacing-xs` bis `--responsive-spacing-2xl`
- `--responsive-font-h1` bis `--responsive-font-tiny`
- `--responsive-container-padding`
- `--responsive-grid-columns`
- `--responsive-grid-gap`

## ✨ Features

✅ **Automatische Anpassung** - Keine manuellen Media Queries nötig  
✅ **Touch-optimiert** - 44x44px Touch Targets auf Mobile  
✅ **Performance** - CSS Variables für optimale Performance  
✅ **Einheitlich** - Gleiche Breakpoints in allen Apps  
✅ **Flexibel** - Utility-Klassen + React Hooks  

## 📝 Nächste Schritte

1. Bestehende Komponenten können jetzt die Utility-Klassen verwenden
2. Neue Komponenten sollten `useResponsive()` Hook verwenden
3. CSS Variables können in bestehenden Styles verwendet werden

## 🔍 Beispiele

Siehe:
- `frontend/customer-web/src/components/Dashboard.tsx`
- `frontend/shared-design-system/README.md`

