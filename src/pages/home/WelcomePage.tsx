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
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">
        <p className="text-sm text-slate-400">Загрузка...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_45%,_#0f172a_100%)] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-amber-300/80">NewLevelHub</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Управление офисом без ручной рутины</h1>
          </div>
          <Link
            to="/login"
            className="rounded-full border border-white/15 bg-white/8 px-5 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/12"
          >
            Войти
          </Link>
        </header>

        <div className="grid gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
          <div>
            <p className="max-w-xl text-sm uppercase tracking-[0.28em] text-emerald-300/75">Workspace operations platform</p>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Welcome to the workplace layer that keeps bookings, people and operations in sync.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Запускайте гостевые пропуска, управляйте картой офиса, отправляйте уведомления и ведите процессы команды из одной панели.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
              >
                Открыть платформу
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/8"
              >
                Создать аккаунт
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Today</p>
                  <p className="mt-2 text-xl font-semibold">Operational overview</p>
                </div>
                <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-300">Live</div>
              </div>

              <div className="mt-5 space-y-4">
                {highlights.map(({ icon: Icon, title, description }) => (
                  <article key={title} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-amber-300/12 p-2 text-amber-300">
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}