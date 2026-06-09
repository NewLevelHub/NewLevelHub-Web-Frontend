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

const BRAND_VARS = ['--brand', '--brand-hover', '--brand-subtle', '--brand-text'] as const;

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
      const hover = darkenHex(brandColor, 0.08);
      const [h] = hexToHsl(brandColor);
      const subtle = hslToHex(h, 0.3, 0.95);

      document.documentElement.style.setProperty('--brand', brandColor);
      document.documentElement.style.setProperty('--brand-hover', hover);
      document.documentElement.style.setProperty('--brand-subtle', subtle);
      document.documentElement.style.setProperty('--brand-text', hover);
    } else {
      for (const varName of BRAND_VARS) {
        document.documentElement.style.removeProperty(varName);
      }
    }

    return () => {
      for (const varName of BRAND_VARS) {
        document.documentElement.style.removeProperty(varName);
      }
    };
  }, [brandColor]);
}
