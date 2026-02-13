# Shared Responsive Design System

Einheitliches, responsives Design-System für alle Frontend-Apps (Customer-Web, Admin-Panel, Driver-App, Restaurant-Web).

## Features

✅ **Automatische Anpassung** an Mobile, Tablet und Desktop  
✅ **Einheitliche Breakpoints** für alle Apps  
✅ **Responsive Spacing & Typography**  
✅ **Utility-Klassen** für schnelle Implementierung  
✅ **React Hooks** für programmatische Nutzung  
✅ **Touch-optimiert** für Mobile-Geräte  

## Installation

Das Design-System ist bereits in allen Apps integriert. Einfach die CSS-Datei importieren:

```css
@import url('../../shared-design-system/responsive.css');
```

## Verwendung

### 1. CSS Utility-Klassen

```html
<!-- Responsive Container -->
<div class="responsive-container">
  <h1 class="responsive-h1">Titel</h1>
  <p class="responsive-body">Text</p>
</div>

<!-- Responsive Grid -->
<div class="responsive-grid">
  <div class="responsive-card">Card 1</div>
  <div class="responsive-card">Card 2</div>
  <div class="responsive-card">Card 3</div>
</div>

<!-- Responsive Flex -->
<div class="responsive-flex">
  <button>Button 1</button>
  <button>Button 2</button>
</div>

<!-- Hide/Show basierend auf Device -->
<div class="responsive-hide-mobile">Nur Desktop/Tablet</div>
<div class="responsive-show-mobile">Nur Mobile</div>
```

### 2. React Hooks

```tsx
import { useResponsive, useBreakpoint, useResponsiveValue } from '../../shared-design-system/useResponsive';

function MyComponent() {
  const { isMobile, isTablet, isDesktop, deviceType } = useResponsive();
  const { isXs, isSm, isMd, isLg } = useBreakpoint();
  
  const padding = useResponsiveValue({
    mobile: '16px',
    tablet: '24px',
    desktop: '32px',
  });

  return (
    <div style={{ padding }}>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}
    </div>
  );
}
```

### 3. ResponsiveContainer Component

```tsx
import { ResponsiveContainer, ResponsiveGrid, ResponsiveFlex } from '../../shared-design-system/ResponsiveContainer';

function MyComponent() {
  return (
    <ResponsiveContainer>
      <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ResponsiveGrid>
    </ResponsiveContainer>
  );
}
```

### 4. Device-spezifische Views

```tsx
<ResponsiveContainer
  mobile={<MobileView />}
  tablet={<TabletView />}
  desktop={<DesktopView />}
/>
```

## Breakpoints

- **Mobile**: 0-767px
- **Tablet**: 768-1023px
- **Desktop**: 1024px+

## CSS Variables

Das System verwendet CSS Variables, die sich automatisch anpassen:

```css
--responsive-spacing-xs: 4px (Mobile) → 8px (Desktop)
--responsive-font-h1: 24px (Mobile) → 48px (Desktop)
--responsive-container-padding: 16px (Mobile) → 32px (Desktop)
```

## Best Practices

1. **Mobile First**: Beginne mit Mobile-Design, erweitere dann für größere Screens
2. **Touch Targets**: Verwende mindestens 44x44px für Buttons auf Mobile
3. **Responsive Images**: Verwende `responsive-img` Klasse
4. **Grid System**: Nutze `responsive-grid` für automatische Spalten-Anpassung
5. **Hooks**: Verwende `useResponsive()` für conditional Rendering

## Beispiele

Siehe die Implementierungen in:
- `frontend/customer-web/src/components/`
- `frontend/admin-panel/src/components/`
- `frontend/driver-app/src/components/`
- `frontend/restaurant-web/src/components/`

