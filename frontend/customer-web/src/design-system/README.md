# Design System - Customer Web App

Ein umfassendes, Enterprise-Grade Design System für die Customer Web App mit vollständiger Dark Mode Unterstützung, Accessibility-Features und konsistenter API.

## 📦 Komponenten

### Foundation Components
- **Button** - Primäre Interaktions-Komponente mit Varianten, Sizes, Icons, Loading States
- **Card** - Container-Komponente mit Varianten (default, elevated, outlined, glass)
- **Input** - Text-Input mit Varianten, States, Icons, Clear-Button
- **Select** - Dropdown mit Search, Grouping, Multi-Select Support
- **Modal** - Dialog-Komponente mit Sizes, Varianten, Focus Trap, Keyboard Navigation
- **Toast** - Notification-System mit Varianten, Positions, Auto-dismiss

### Feedback Components
- **Badge** - Status-Badges mit Varianten, Sizes, Shapes (rounded, pill, dot)
- **Alert** - Banner-Komponente mit Varianten, Dismissible, Actions
- **Progress** - Linear & Circular Progress Bars mit Indeterminate Support
- **Spinner** - Loading Spinner mit Sizes, Varianten, Overlay Mode

### Form Components
- **Checkbox** - Checkbox mit Sizes, Indeterminate State
- **Radio** - Radio Button mit Group Support
- **Switch** - Toggle Switch mit Colors, Sizes
- **Rating** - Star Rating mit Interactive/Read-only, Half Stars

### Display Components
- **Avatar** - User Avatar mit Image/Initials/Icon, Badge Support, AvatarGroup
- **Tag** - Chip/Tag Component mit Varianten, Dismissible, Icons
- **Divider** - Horizontal/Vertical Divider mit Text Support
- **Skeleton** - Loading Placeholder mit Varianten, Animations

### Navigation Components
- **Tabs** - Tab Navigation mit Varianten (default, pills, underline), Icons
- **Accordion** - Collapsible Sections mit Single/Multiple, Icons

### Utility Components
- **EmptyState** - Empty State mit Varianten, Icons, Actions
- **Tooltip** - Tooltip mit Positions, Varianten, Auto-positioning

## 🎨 Design Tokens

### Colors
- Primary (50-900)
- Semantic (Success, Warning, Error, Info)
- Neutral Gray Scale
- Background (default, paper, elevated, surface, overlay)
- Text (primary, secondary, disabled, inverse)
- Border Colors
- Focus, Hover, Active States

### Spacing
- xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl
- Fractional: 0.5, 1.5, 2.5, 3.5

### Typography
- Font Families (sans, mono)
- Font Sizes (xs bis 8xl)
- Font Weights (normal, medium, semibold, bold)
- Line Heights (tight, normal, relaxed)
- Letter Spacing
- Text Transform

### Layout
- Border Radius (none bis full)
- Border Widths
- Shadows (sm bis 2xl)
- Z-Index Scale
- Breakpoints (xs bis 2xl)
- Container Sizes

### Animation
- Transitions (fastest bis slower)
- Easing Functions
- Animation Durations
- Spring Configurations

## 🌙 Dark Mode

Alle Komponenten unterstützen vollständig Dark Mode über:
- `data-theme='dark'` Attribute
- `@media (prefers-color-scheme: dark)` Fallback
- Konsistente Color Tokens für beide Modi

## ♿ Accessibility

- ARIA Labels & Roles
- Keyboard Navigation
- Focus Management
- Screen Reader Support
- Semantic HTML

## 📖 Verwendung

```typescript
import { Button, Input, Modal, Toast } from '@/design-system';

// Button
<Button variant="primary" size="md" icon={<Icon />} loading={isLoading}>
  Click Me
</Button>

// Input
<Input
  label="Email"
  variant="outlined"
  size="md"
  state="error"
  errorMessage="Invalid email"
  leftIcon={<Mail />}
  clearable
  onClear={() => setValue('')}
/>

// Select
<Select
  label="Country"
  options={countries}
  searchable
  clearable
  placeholder="Select country..."
/>

// Modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
  footer={<Button onClick={handleConfirm}>Confirm</Button>}
>
  Are you sure?
</Modal>

// Toast
<Toast
  message="Order placed successfully!"
  variant="success"
  duration={4000}
  onClose={() => {}}
/>
```

## 🎯 Design Prinzipien

1. **Konsistenz** - Einheitliche API-Patterns (variant, size, disabled)
2. **Accessibility** - WCAG 2.1 AA konform
3. **Performance** - Optimiert mit Framer Motion, Memoization
4. **Type Safety** - Vollständige TypeScript Unterstützung
5. **Responsive** - Mobile-first Approach
6. **Theming** - CSS Variables für einfache Anpassung

## 📚 Komponenten-API

Alle Komponenten folgen konsistenten Patterns:

```typescript
// Standard Props
variant?: 'default' | 'primary' | 'secondary' | ...
size?: 'sm' | 'md' | 'lg'
disabled?: boolean
className?: string

// Event Handlers
onClick?: () => void
onChange?: (value: any) => void
```

## 🚀 Nächste Schritte

Weitere geplante Komponenten:
- Breadcrumbs
- Pagination
- Stepper
- Timeline
- Popover
- Dropdown Menu
- Slider/Range
- DatePicker
- TimePicker
- DataTable
- Form (Formik Integration)

