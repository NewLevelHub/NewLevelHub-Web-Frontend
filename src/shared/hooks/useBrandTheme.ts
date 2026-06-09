import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import type { CompanySettings } from '@/shared/types';

/** Converts a hex colour string to an HSL tuple [h, s, l] where s and l are 0–1. */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s, l];
}

/** Converts HSL (h in degrees, s and l in 0–1) back to a hex colour string. */
function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;

  function hue2rgb(p: number, q: number, t: number): number {
    let tVal = t;
    if (tVal < 0) tVal += 1;
    if (tVal > 1) tVal -= 1;
    if (tVal < 1 / 6) return p + (q - p) * 6 * tVal;
    if (tVal < 1 / 2) return q;
    if (tVal < 2 / 3) return p + (q - p) * (2 / 3 - tVal) * 6;
    return p;
  }

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Darkens a hex colour by reducing lightness by `amount` (0–1). */
function darkenHex(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount));
}

const BRAND_VARS = [
  '--brand', '--brand-hover', '--brand-subtle', '--brand-text', '--brand-gradient-end',
  '--bg-page', '--bg-surface', '--bg-raised', '--bg-hover', '--bg-active', '--bg-sidebar',
  '--border', '--border-strong', '--border-faint',
  '--nav-active-bg', '--nav-active-border', '--nav-hover-bg',
  '--status-free-bg', '--status-free-text', '--status-na-bg',
] as const;

/**
 * Side-effect-only hook. Reads the company's brand colour from the API and
 * applies it as CSS custom properties on `document.documentElement`. Cleans up
 * on unmount. Must only be called once — inside AppLayout.
 */
export function useBrandTheme(): void {
  const { user } = useAuth();

  const companyId = user && user.company ? String(user.company.id) : null;
  const shouldFetch =
    user !== null &&
    user.company !== null &&
    user.role !== USER_ROLES.SUPERADMIN;

  const { data } = useQuery({
    queryKey: ['company-settings', companyId],
    queryFn: () =>
      apiClient
        .get<CompanySettings>(API.companies.settings(companyId!))
        .then(r => r.data),
    enabled: shouldFetch && companyId !== null,
    staleTime: 5 * 60 * 1000,
  });

  const brandColor = data?.brand_primary_color ?? null;

  useEffect(() => {
    if (brandColor) {
      const applyVars = (color: string) => {
        const isDark = document.documentElement.classList.contains('dark');
        const [h, s, l] = hexToHsl(color);

        if (isDark) {
          document.documentElement.style.setProperty('--brand', hslToHex(h, s, Math.min(0.95, l + 0.10)));
          document.documentElement.style.setProperty('--brand-hover', hslToHex(h, s, Math.min(0.95, l + 0.22)));
          document.documentElement.style.setProperty('--brand-subtle', hslToHex(h, Math.max(0, s - 0.20), Math.max(0.04, l - 0.20)));
          document.documentElement.style.setProperty('--brand-text', hslToHex(h, Math.max(0, s - 0.25), Math.min(0.95, l + 0.37)));
          const gradientEnd = hslToHex((h + 40) % 360, s, Math.min(0.85, l + 0.10));
          document.documentElement.style.setProperty('--brand-gradient-end', gradientEnd);
          // Background tints — same S/L as theme.css defaults, brand hue substituted
          document.documentElement.style.setProperty('--bg-page',       hslToHex(h, 0.33, 0.06));
          document.documentElement.style.setProperty('--bg-surface',    hslToHex(h, 0.33, 0.09));
          document.documentElement.style.setProperty('--bg-raised',     hslToHex(h, 0.38, 0.12));
          document.documentElement.style.setProperty('--bg-hover',      hslToHex(h, 0.41, 0.15));
          document.documentElement.style.setProperty('--bg-active',     hslToHex(h, 0.56, 0.11));
          document.documentElement.style.setProperty('--bg-sidebar',    hslToHex(h, 0.30, 0.07));
          // Border tints
          document.documentElement.style.setProperty('--border',        hslToHex(h, 0.28, 0.14));
          document.documentElement.style.setProperty('--border-strong', hslToHex(h, 0.31, 0.19));
          document.documentElement.style.setProperty('--border-faint',  hslToHex(h, 0.38, 0.12));
          // Nav vars — dark mode
          document.documentElement.style.setProperty('--nav-active-border', hslToHex(h, s, Math.min(0.95, l + 0.10)));
          document.documentElement.style.setProperty('--nav-active-bg',     hslToHex(h, 0.31, 0.15));
          document.documentElement.style.setProperty('--nav-hover-bg',      hslToHex(h, 0.38, 0.12));
          // Free resource pins: same formulas as --brand-subtle and --brand-text dark
          document.documentElement.style.setProperty('--status-free-bg',   hslToHex(h, Math.max(0, s - 0.20), Math.max(0.04, l - 0.20)));
          document.documentElement.style.setProperty('--status-free-text', hslToHex(h, Math.max(0, s - 0.25), Math.min(0.95, l + 0.37)));
          // na-bg: same formula as --bg-raised
          document.documentElement.style.setProperty('--status-na-bg',     hslToHex(h, 0.38, 0.12));
        } else {
          document.documentElement.style.setProperty('--brand', color);
          document.documentElement.style.setProperty('--brand-hover', darkenHex(color, 0.08));
          document.documentElement.style.setProperty('--brand-subtle', hslToHex(h, 0.3, 0.95));
          document.documentElement.style.setProperty('--brand-text', darkenHex(color, 0.08));
          const gradientEnd = hslToHex((h + 40) % 360, s, Math.max(0.15, l - 0.05));
          document.documentElement.style.setProperty('--brand-gradient-end', gradientEnd);
          // Nav vars — light mode
          document.documentElement.style.setProperty('--nav-active-border', color);
          document.documentElement.style.setProperty('--nav-active-bg',     hslToHex(h, 0.20, 0.92));
          document.documentElement.style.setProperty('--nav-hover-bg',      hslToHex(h, 0.10, 0.95));
          // Free resource pins: same formula as --brand-subtle and --brand-text
          document.documentElement.style.setProperty('--status-free-bg',   hslToHex(h, 0.30, 0.95));
          document.documentElement.style.setProperty('--status-free-text', darkenHex(color, 0.08));
          // --status-na-bg light is nearly neutral (#f1f3f0) — no change needed in light mode
          // Remove dark-mode-only overrides so :root CSS values take over
          const DARK_ONLY_VARS = [
            '--bg-page', '--bg-surface', '--bg-raised', '--bg-hover', '--bg-active', '--bg-sidebar',
            '--border', '--border-strong', '--border-faint',
            '--status-na-bg',
          ] as const;
          for (const v of DARK_ONLY_VARS) {
            document.documentElement.style.removeProperty(v);
          }
        }
      };

      applyVars(brandColor);

      const observer = new MutationObserver(() => applyVars(brandColor));
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      return () => {
        observer.disconnect();
        for (const varName of BRAND_VARS) {
          document.documentElement.style.removeProperty(varName);
        }
      };
    } else {
      for (const varName of BRAND_VARS) {
        document.documentElement.style.removeProperty(varName);
      }
    }
  }, [brandColor]);
}
