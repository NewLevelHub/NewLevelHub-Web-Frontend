import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';
import { WelcomeNav } from './components/WelcomeNav';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { TariffsSection } from './components/TariffsSection';
import { CtaSection } from './components/CtaSection';
import { WelcomeFooter } from './components/WelcomeFooter';

export default function WelcomePage() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;

    html.style.background = '#051a0d';
    body.style.background = '#051a0d';

    return () => {
      html.style.background = prevHtmlBg;
      body.style.background = prevBodyBg;
    };
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          background: '#051a0d',
          color: '#8bbfa0',
          fontSize: 14,
        }}
      >
        {t('common.loading')}
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      style={{
        background: '#051a0d',
        color: '#e8f5ee',
        minHeight: '100vh',
        fontFamily: 'Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <WelcomeNav />
      <HeroSection />
      <FeaturesSection />
      <TariffsSection />
      <CtaSection />
      <WelcomeFooter />
    </div>
  );
}
