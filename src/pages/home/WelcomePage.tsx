import { ArrowRight, Building2, CalendarDays, ShieldCheck } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';

const highlights = [
  {
    icon: Building2,
    title: 'Офис в одном интерфейсе',
    description: 'Бронирование, карты, CRM, сервисные заявки и команда без переключения между разными системами.',
  },
  {
    icon: CalendarDays,
    title: 'Быстрый запуск для команды',
    description: 'Новые сотрудники, гостевые пропуска и внутренние анонсы собираются в единый рабочий сценарий.',
  },
  {
    icon: ShieldCheck,
    title: 'Контроль доступа и процессов',
    description: 'Прозрачные роли, история действий и автоматические уведомления для ежедневных операций.',
  },
];

export default function WelcomePage() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <p className="text-sm text-muted">Загрузка...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-page text-primary">
      {/* Top nav */}
      <header className="border-b border-default bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-[15px] font-semibold tracking-tight text-primary">NewLevelHub</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors"
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full border border-default bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
              Workspace operations platform
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-primary sm:text-5xl">
              Управление офисом без ручной рутины
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-secondary">
              Бронирование рабочих мест, карта офиса, CRM, пропуска и уведомления — всё в одной панели для вашей команды.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
              >
                Открыть платформу
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-lg border border-default px-5 py-2.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors"
              >
                Создать аккаунт
              </Link>
            </div>
          </div>

          {/* Feature cards */}
          <div className="space-y-3">
            {highlights.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="flex items-start gap-4 rounded-xl border border-default bg-surface p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-raised text-brand">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-secondary">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
