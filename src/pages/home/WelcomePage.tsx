import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Building2, CalendarDays, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';

const HIGHLIGHT_ICONS: LucideIcon[] = [Building2, CalendarDays, ShieldCheck];

export default function WelcomePage() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuthStore();

  const highlights = useMemo(
    () =>
      HIGHLIGHT_ICONS.map((icon, index) => ({
        icon,
        title: t(`home.slides.${index}.title`),
        description: t(`home.slides.${index}.description`),
      })),
    [t],
  );

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-page text-primary">
      <header className="border-b border-default bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-[15px] font-semibold tracking-tight text-primary">NewLevelHub</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors"
            >
              {t('common.signIn')}
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
            >
              {t('auth.register.title')}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full border border-default bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
              {t('home.badge')}
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-primary sm:text-5xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-secondary">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
              >
                {t('home.openPlatform')}
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-lg border border-default px-5 py-2.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors"
              >
                {t('home.createAccount')}
              </Link>
            </div>
          </div>

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
