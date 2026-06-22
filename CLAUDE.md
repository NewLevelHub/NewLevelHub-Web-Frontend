# NewLevelHub Web Frontend

## Project Overview

NewLevelHub is a coworking space management platform. It serves multiple user roles — superadmins, company admins, employees, and guests — each with different access levels and feature sets. The frontend is a single-page application built with Vite and React, communicating with a Django REST Framework backend.

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI library |
| Vite | 6.3.5 | Build tool and dev server |
| TypeScript | strict mode | Type safety |
| React Router | 7.13.0 | Client-side routing |
| TanStack React Query | 5.96.1 | Server state, data fetching, caching |
| Zustand | 5.0.12 | Client state (auth only) |
| Tailwind CSS | 4.1.12 | Utility-first styling |
| Axios | 1.14.0 | HTTP client |
| Lucide React | 0.487.0 | Icons |
| clsx + tailwind-merge | — | Classname utility via `cn()` |

**Tailwind is configured via `@tailwindcss/vite` plugin — NOT the PostCSS plugin. `postcss.config.mjs` exists but is intentionally empty (only for extra PostCSS plugins if needed).**

---

## Project Structure

```
src/
  main.tsx                    # App entry point, mounts React root
  app/
    App.tsx                   # Root component, wraps QueryClient + Router
    router.tsx                # All route definitions (React Router v7)
  pages/                      # One file per page, grouped by feature
    auth/                     # Login, register, password reset
    bookings/                 # Booking list and detail pages
    building/                 # Building management
    calendar/                 # Calendar/schedule views
    companies/                # Company directory (superadmin)
    company/                  # Single company management
    crm/                      # CRM features
    dashboard/                # Role-specific dashboards
    errors/                   # 403, 404, 500 error pages
    files/                    # File management
    leave/                    # Leave requests
    notifications/            # Notification center
    passes/                   # Access passes
    profile/                  # User profile
    resources/                # Resource management
    service-requests/         # Service request flows
    team/                     # Team management
    announcements/            # Announcements
    analytics/                # Analytics and reporting
    access/                   # Access control
  shared/
    api/
      client.ts               # Axios instance with base URL and interceptors
      endpoints.ts            # All API paths as const API = { ... }
    config/
      constants.ts            # Enums and constant values (USER_ROLES, BOOKING_STATUSES, etc.)
      env.ts                  # Typed access to VITE_ environment variables
    guards/
      RequireAuth.tsx         # Redirects to /login if user is not authenticated
      RequireGuest.tsx        # Redirects to / if user is already authenticated
      RequireRole.tsx         # Redirects to /403 if user lacks required role
    hooks/
      useAuth.ts              # Custom hook for auth state and actions
    lib/
      cn.ts                   # classname utility: clsx + tailwind-merge
      storage.ts              # localStorage read/write helpers
    store/
      auth.ts                 # Zustand store: user, token, login, logout
    types/
      index.ts                # All TypeScript interfaces: User, Company, Booking, etc.
    ui/
      layouts/
        AppLayout.tsx         # Shell for authenticated pages (header + sidebar)
        AuthLayout.tsx        # Centered layout for auth forms
      navigation/
        Header.tsx            # Top navigation bar
        Sidebar.tsx           # Role-aware side navigation
        sidebar-config.ts     # Nav item definitions per role
      PageStub.tsx            # Placeholder component for unimplemented pages
    styles/
      index.css               # Global styles entry
      tailwind.css            # Tailwind directives
      fonts.css               # Font imports
      theme.css               # CSS custom properties / design tokens
```

---

## Key Conventions

### Imports and Aliases

- Use the `@/` alias for all internal imports — it maps to `./src/`
- Never use relative paths that traverse upward (`../../`) from inside `pages/` or `shared/`

```ts
// correct
import { cn } from '@/shared/lib/cn';
import { API } from '@/shared/api/endpoints';
import type { User } from '@/shared/types';

// wrong
import { cn } from '../../shared/lib/cn';
```

### Classnames

Always use `cn()` from `@/shared/lib/cn.ts` for conditional or merged Tailwind classes. Never concatenate class strings manually.

```tsx
import { cn } from '@/shared/lib/cn';

<div className={cn('base-class', isActive && 'active-class', className)} />
```

### API Endpoints

All API paths live in `@/shared/api/endpoints.ts` as a single `API` constant. Never hardcode endpoint strings in components or hooks.

```ts
// correct
import { API } from '@/shared/api/endpoints';
axios.get(API.BOOKINGS.LIST);

// wrong
axios.get('/api/bookings/');
```

All endpoints have trailing slashes — this is required by the Django backend.

### Enums and Constants

All application-level enums and constant values (roles, statuses, types) live in `@/shared/config/constants.ts`. Never define these inline in components.

```ts
import { USER_ROLES, BOOKING_STATUSES } from '@/shared/config/constants';
```

### TypeScript Interfaces

All shared entity interfaces (User, Company, Booking, Pass, etc.) are defined in `@/shared/types/index.ts`. Do not create duplicate type definitions in page or component files.

### State Management

- **Server state** (API data, loading states, caching): use TanStack React Query (`useQuery`, `useMutation`).
- **Client state** (auth only): use the Zustand store at `@/shared/store/auth.ts` via `useAuth` hook.
- Do not use Zustand for anything other than auth. Do not use React Query for client-only state.

### Environment Variables

Access environment variables only through `@/shared/config/env.ts`. Do not access `import.meta.env.*` directly in components.

---

## Development Workflow

### Commands

```bash
npm run dev         # Start Vite dev server
npm run build       # Production build
npm run typecheck   # TypeScript check without emit (run before committing)
```

### Environment Setup

Copy `.env.example` to `.env` and fill in required `VITE_` prefixed variables. The dev server proxies `/api` to `http://localhost:8000` (the Django backend).

### Adding a New Page

1. Create the page component in the appropriate `src/pages/<feature>/` directory.
2. Register the route in `src/app/router.tsx`.
3. Wrap the route with the appropriate guards (`RequireAuth`, `RequireRole`) as needed.
4. If the page belongs in the sidebar navigation, add an entry to `src/shared/ui/navigation/sidebar-config.ts` for the relevant roles.
5. The page should render inside `AppLayout` (authenticated pages) or `AuthLayout` (auth pages) — set this at the router level, not inside the page component itself.

### Page Component Structure

A typical page component follows this pattern:

```tsx
import { useQuery } from '@tanstack/react-query';
import { API } from '@/shared/api/endpoints';
import { client } from '@/shared/api/client';
import type { Booking } from '@/shared/types';

export default function BookingsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => client.get<Booking[]>(API.BOOKINGS.LIST).then(r => r.data),
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading bookings.</div>;

  return (
    <div>
      {data?.map(booking => (
        <div key={booking.id}>{booking.title}</div>
      ))}
    </div>
  );
}
```

### Replacing a PageStub

Pages that are not yet implemented render `<PageStub />`. When implementing a real page, replace the `PageStub` import and JSX entirely — do not wrap or layer over it.

---

## CSS Custom Properties & Theming

Весь дизайн-токен системы живёт в `src/styles/theme.css` как CSS custom properties. **Никогда не используй хардкодные цвета** — ни hex (`#059669`), ни Tailwind-классы с фиксированными оттенками (`bg-emerald-600`, `text-gray-900`) для интерактивных и брендовых элементов.

### Доступные CSS переменные

**Фоны и поверхности:**
```
--bg-page        # фон всей страницы
--bg-surface     # карточки, модалки, дропдауны
--bg-raised      # приподнятые секции внутри surface
--bg-hover       # фон при hover
--bg-active      # фон активного/выбранного элемента
--bg-sidebar     # фон сайдбара
```

**Бордеры:**
```
--border         # стандартный бордер
--border-strong  # акцентный бордер
--border-faint   # едва заметный бордер
```

**Текст:**
```
--text-primary      # основной текст
--text-secondary    # вторичный текст
--text-muted        # приглушённый текст
--text-subtle       # очень тихий текст
--text-placeholder  # плейсхолдеры
--text-on-brand     # текст поверх brand-фона
```

**Бренд (меняются при смене brand color компании):**
```
--brand              # основной цвет бренда
--brand-hover        # бренд при hover
--brand-subtle       # очень светлый тинт бренда (для bg)
--brand-text         # текст цвета бренда
--brand-gradient-end # второй стоп в hero-градиенте
```

**Навигация (меняются при смене brand color):**
```
--nav-active-bg      # фон активного пункта меню
--nav-active-text    # текст активного пункта
--nav-active-border  # левый акцент активного пункта
--nav-text           # текст неактивных пунктов
--nav-hover-bg       # фон при hover
```

**Статусы (семантические — не трогать для бренда):**
```
--status-free-bg / --status-free-text      # свободный ресурс
--status-busy-bg / --status-busy-text      # занятый ресурс
--status-soon-bg / --status-soon-text      # скоро свободен
--status-na-bg   / --status-na-text        # нет статуса
```

**Сигнальные (семантические):**
```
--success / --success-bg / --success-text
--warning / --warning-bg / --warning-text
--danger  / --danger-bg  / --danger-text
--info
```

### Tailwind-утилиты для CSS vars

В `theme.css` определены utility-классы для brand и surface токенов:

```
bg-brand          bg-brand-subtle    bg-brand-hover
text-brand        hover:text-brand   hover:bg-brand-hover
bg-page           bg-surface         bg-raised
bg-hover          text-primary       text-secondary
text-muted        border-default     bg-success-subtle
bg-warning-subtle bg-danger-subtle
```

### Правила использования

**ЗАПРЕЩЕНО:**
```tsx
// ❌ хардкодный hex
style={{ background: '#111827' }}
style={{ color: '#b45309' }}

// ❌ Tailwind с фиксированным оттенком для брендовых/surface элементов
className="bg-emerald-600 hover:bg-emerald-700"
className="bg-gray-900 text-gray-100"

// ❌ в recharts/inline styles
contentStyle={{ background: '#111827', color: '#f9fafb' }}
```

**ПРАВИЛЬНО:**
```tsx
// ✅ CSS var в inline style
style={{ background: 'var(--bg-surface)' }}
style={{ color: 'var(--warning)' }}

// ✅ Tailwind utility из theme.css
className="bg-brand hover:bg-brand-hover text-white"
className="bg-surface text-primary border border-default"

// ✅ в recharts/inline styles
contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
```

### Исключения — когда можно оставить хардкод

Следующие цвета **семантически фиксированы** и не должны меняться вместе с брендом:
- Статусы доступности ресурсов: `bg-emerald-*` (FREE), `bg-rose-*` (OCCUPIED), `bg-amber-*` (SOON)
- Оценки/рейтинги: `text-amber-400` (звёзды)
- Цвета типов файлов в файловом менеджере
- Аватары с цветовым кодом пользователей
- Цвета серий данных в графиках (bars, lines)
- Декоративные `rgba(0,0,0,0.N)` оверлеи поверх изображений

### Система бренд-темизации

`src/shared/hooks/useBrandTheme.ts` — вызывается один раз в `AppLayout`. Он:
- Читает `company.brand_primary_color` из API (`/companies/{id}/settings/`)
- Устанавливает все `--brand*`, `--nav-*`, `--bg-*`, `--border*`, `--status-free-*` через `document.documentElement.style.setProperty`
- Пересчитывает переменные при смене темы (light/dark) через `MutationObserver`
- Очищает все переменные при логауте/анмаунте

Не вызывай этот хук нигде кроме `AppLayout`. Не дублируй его логику в компонентах.

---

## Table Styling Standard

All data tables in the project must use these exact style values. Do not use Tailwind classes on `<th>` or `<td>`. Do not hardcode hex colors. This standard is derived from `ManageBookingsPage.tsx` and `MyBookingsPage.tsx` and must be applied to every new table and every refactored table.

### Card wrapper `<div>`

```tsx
<div style={{
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
}}>
```

### `<table>` element

```tsx
<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
```

### `thStyle` — header cell

```ts
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-muted)',
  padding: '8px 12px',
  whiteSpace: 'nowrap',
};
```

### `tdStyle` — body cell

```ts
const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};
```

### Row borders — on `<tr>`, not on `<th>`/`<td>`

The `borderBottom` belongs on the `<tr>`, never on individual cells:

```tsx
// thead row
<tr style={{ borderBottom: '1px solid var(--border)' }}>

// tbody rows
<tr
  style={{ borderBottom: '1px solid var(--border)' }}
  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-hover)'; }}
  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
>
```

When the table is inside a Tailwind-styled page (e.g. using `className` on the `<table>` wrapper), use the equivalent Tailwind pattern from the bookings pages:

```tsx
<table className="w-full border-collapse text-[13px]">
  <thead>
    <tr className="border-b border-[color:var(--border)]">
      <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">...</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-[color:var(--border)] hover:bg-[color:var(--bg-hover)] transition-colors">
      <td className="px-3 py-2.5 align-middle">...</td>
    </tr>
  </tbody>
</table>
```

### Rules

- **Do not** add `textTransform: 'uppercase'`, `letterSpacing`, or `background: 'transparent'` to `thStyle` — these are not part of the standard.
- **Do not** put `borderBottom` on `<td>` or `<th>` — put it on `<tr>`.
- **Do not** use `border-faint` for table row separators — use `var(--border)`.
- **Do not** hardcode hex colors anywhere in table cells (e.g. `#ecfdf5`, `#047857`) — use CSS vars.

---

## Modal Styling Standard

All modals in the project must use these exact style values. Match `BookingModal` (`src/shared/ui/BookingModal.tsx`) as the canonical reference. Do not invent new modal layouts — apply this standard to every new modal and every refactored modal.

### Backdrop

```tsx
<div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
  onClick={(e) => e.target === e.currentTarget && handleClose()}
  role="dialog"
  aria-modal="true"
>
```

- `position: fixed`, `inset: 0`, `z-index: 50`
- Backdrop color: `bg-black/50` (`rgba(0,0,0,0.5)`)
- Content alignment: `flex items-center justify-center`
- Padding: `p-4`

### Modal box

```tsx
<div className="relative w-full max-w-[560px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]">
```

- Max width: `max-w-[560px]`
- Border radius: `rounded-2xl`
- Border: `border border-default`
- Background: `bg-surface`
- Shadow: `shadow-xl`
- Scroll: `overflow-y-auto max-h-[90vh]`

### Header

```tsx
<div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
  <div className="min-w-0 pr-4">
    <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
      {title}
    </h2>
    <p className="text-xs text-muted mt-0.5">{subtitle}</p>
  </div>
  <button
    type="button"
    onClick={onClose}
    className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
    aria-label={t('common.close')}
  >
    <X size={14} />
  </button>
</div>
```

- Padding: `px-[22px] pt-[18px] pb-[14px]`
- No `border-bottom` on the header — the separator belongs on the footer (`border-t`)
- Title: `text-base font-semibold text-primary tracking-[-0.015em]`
- Subtitle: `text-xs text-muted mt-0.5`
- Close button: `w-7 h-7 rounded-lg`

### Body

```tsx
<div className="px-[22px] pb-0 flex flex-col gap-4 max-h-[calc(90vh-120px)] overflow-y-auto">
```

- Padding: `px-[22px] pb-0`
- Gap between fields: `gap-4`
- Scroll guard: `max-h-[calc(90vh-120px)] overflow-y-auto`

### Footer

```tsx
<div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
```

- Padding: `px-[22px] pt-[14px] pb-[18px]`
- Top separator: `border-t border-[color:var(--border-faint)]`
- Gap between buttons: `gap-2`
- Top margin from body: `mt-3`
- No background override on footer (inherits `bg-surface`)

### `inputStyle` object

```ts
const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 36,
  padding: '0 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};
```

For `<textarea>`, override height and add vertical padding:

```ts
style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'none', minHeight: 80 }}
```

### `labelStyle` object

```ts
const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 6,
};
```

### Cancel button

```tsx
<button
  type="button"
  onClick={onClose}
  className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
>
```

- Height: `h-8` (32px)
- Padding: `px-4`
- Font: `text-sm font-medium`
- Color: `text-secondary`
- Background: no default background; `hover:bg-raised` on hover
- No border

### Primary (submit) button

```tsx
<button
  type="submit"
  className={cn(
    'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
    'text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity',
    'disabled:opacity-60 disabled:cursor-not-allowed',
  )}
>
```

- Height: `h-8` (32px)
- Padding: `px-4`
- Font: `text-sm font-medium`
- Background: `bg-[color:var(--brand)]`
- Text: `text-white`
- Hover: `hover:opacity-90`
- Disabled: `disabled:opacity-60 disabled:cursor-not-allowed`

### Rules

- **Do not** set `alignItems: 'flex-start'` on the backdrop — always center with `items-center`.
- **Do not** add `background` to the footer — it inherits `bg-surface` from the modal box.
- **Do not** use `border-faint` for header separation — put the separator only on the footer with `border-[color:var(--border-faint)]`.
- **Do not** hardcode `zIndex: 1000` or similar integers — use the Tailwind `z-50` class.
- **Do not** set `maxWidth: 540` inline — use the class `max-w-[560px]`.
- **Do not** use `overflow: 'hidden'` on the modal box — use `overflow-y-auto` with `max-h-[90vh]` so the modal scrolls internally.

---

## Frontend Development

Перед редактированием любого компонента:

1. **Подтверди цель** — проследи user flow от точки входа до нужного компонента. Покажи файл и релевантный код, прежде чем вносить изменения.
2. **Не редактируй Page, если задача про Modal** — например, `BookingModal` и `BookingCreatePage` — разные файлы. Функциональность создания брони живёт в модале, а не на странице-обёртке.
3. **Проверь дерево компонентов** — проверь роутинг и `sidebar-config.ts`, чтобы убедиться, что компонент вообще доступен пользователю в UI.
4. **После изменений** — запусти `npm run typecheck` и убедись, что TypeScript ошибок нет.
5. **Локализация обязательна** — любой UI-текст, добавляемый или изменяемый в компоненте, должен использовать `t('...')` из `react-i18next`. Никаких хардкодных строк на русском или английском в JSX. После добавления `t()`-ключа — добавь соответствующий перевод в оба файла: `src/shared/locales/ru.json` и `src/shared/locales/en.json`. Это не опционально и не откладывается на потом.

---

## Architecture Patterns

### Routing and Guards

Routes are defined in `src/app/router.tsx` using React Router v7. Guards are layout-level route wrappers:

- `RequireAuth` — wraps any routes that require a logged-in user
- `RequireGuest` — wraps auth routes (login/register) to redirect authenticated users away
- `RequireRole` — wraps routes restricted to specific roles, accepts a `roles` prop

Guards redirect rather than render error UI. The 403 page is rendered when a user navigates to a role-restricted route they do not have access to.

### Layouts

- `AppLayout` — used for all authenticated application pages. Renders the sidebar and header around the page content.
- `AuthLayout` — used for login and registration. Renders a centered card layout with no navigation.

Layouts are applied at the router level as wrapper elements. Page components do not import or render layouts themselves.

### API Client

The Axios instance in `@/shared/api/client.ts` handles:
- Base URL from environment config
- Attaching the auth token from the Zustand store to every request
- Handling 401 responses by logging the user out and redirecting to `/login`

Always use this instance — never create a new `axios` instance in a page or component.

### Data Fetching

Use React Query for all API interactions:
- `useQuery` for reading data
- `useMutation` for writes (create, update, delete)
- Set appropriate `queryKey` arrays so invalidation works correctly after mutations
- Invalidate related queries in `onSuccess` callbacks of mutations

### Auth State

The Zustand auth store holds the current user object and token. Access it through the `useAuth` hook from `@/shared/hooks/useAuth.ts`:

```ts
const { user, token, login, logout } = useAuth();
```

Do not import the Zustand store directly in components — always go through the hook.

---

## Role System

The platform has four roles. Navigation items, route access, and UI features are all gated by role.

| Role | Description |
|---|---|
| `superadmin` | Full platform access. Manages all companies, buildings, users. |
| `company_admin` | Manages their own company: employees, bookings, resources, passes. |
| `employee` | Standard user within a company. Can book resources, submit requests. |
| `guest` | Limited access. Can view and book select resources. No company features. |

Role values are defined in `@/shared/config/constants.ts` under `USER_ROLES`. Always use these constants for comparisons — never compare against raw strings.

```ts
import { USER_ROLES } from '@/shared/config/constants';

if (user.role === USER_ROLES.SUPERADMIN) { ... }
```

The sidebar configuration in `src/shared/ui/navigation/sidebar-config.ts` maps nav items to the roles that should see them. When adding a new nav item, update this config and specify which roles have access.

Route-level role enforcement is done through the `RequireRole` guard in the router — not inside page components.
