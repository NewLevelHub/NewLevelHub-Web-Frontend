import { apiClient } from '@/shared/api/client';
import { env } from '@/shared/config/env';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';

export interface DownloadUrlResponse {
  url: string;
  expires_in?: number;
}

const API_V1_PREFIX = '/api/v1';

/**
 * Normalize a download endpoint (relative API path, `/api/v1/...`, or absolute API URL)
 * to a path relative to `env.API_BASE_URL` for authenticated GET.
 */
export function toApiRelativePath(downloadEndpoint: string): string {
  const trimmed = downloadEndpoint.trim();
  if (!trimmed) {
    throw new Error('Empty download endpoint');
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const { pathname } = new URL(trimmed);
    const v1Index = pathname.indexOf(API_V1_PREFIX);
    if (v1Index >= 0) {
      return pathname.slice(v1Index + API_V1_PREFIX.length) || '/';
    }
    throw new Error(`Not an API download URL: ${trimmed}`);
  }

  if (trimmed.startsWith(API_V1_PREFIX)) {
    return trimmed.slice(API_V1_PREFIX.length) || '/';
  }

  const base = env.API_BASE_URL.replace(/\/$/, '');
  if (trimmed.startsWith(base)) {
    const rest = trimmed.slice(base.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Resolve `/media/...` paths from the signed-url payload when needed. */
export function resolveFetchedDownloadUrl(url: string): string {
  return resolveMediaUrl(url) ?? url;
}

/** GET download endpoint with Bearer → JSON `{ url, expires_in? }`. */
export async function fetchSignedDownloadUrl(downloadEndpoint: string): Promise<string> {
  const path = toApiRelativePath(downloadEndpoint);
  const { data } = await apiClient.get<DownloadUrlResponse>(path);
  if (!data?.url) {
    throw new Error('Download URL missing in response');
  }
  return resolveFetchedDownloadUrl(data.url);
}

export function openSignedDownloadUrl(
  resolvedUrl: string,
  options?: { filename?: string; openInNewTab?: boolean },
): void {
  const anchor = document.createElement('a');
  anchor.href = resolvedUrl;
  anchor.rel = 'noopener noreferrer';
  if (options?.filename) {
    anchor.download = options.filename;
  }
  if (options?.openInNewTab !== false) {
    anchor.target = '_blank';
  }
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Authenticated API download → open or save the signed URL (no Bearer on `url`). */
export async function downloadFromApiEndpoint(
  downloadEndpoint: string,
  options?: { filename?: string },
): Promise<void> {
  const path = toApiRelativePath(downloadEndpoint);

  // Use responseType:'blob' so we can inspect content-type before deciding.
  const response = await apiClient.get<Blob>(path, {
    responseType: 'blob',
    // Preserve non-2xx so we can forward errors properly.
    validateStatus: (s) => s < 400,
  });

  const contentType: string = (response.headers as Record<string, string>)['content-type'] ?? '';

  if (contentType.includes('application/json')) {
    // S3 path: backend returned { url, expires_in } — read the blob as text.
    const text = await (response.data as Blob).text();
    const json = JSON.parse(text) as DownloadUrlResponse;
    if (!json?.url) throw new Error('Download URL missing in response');
    const url = resolveFetchedDownloadUrl(json.url);
    // The `download` attribute is ignored by browsers for cross-origin URLs (S3).
    // Fetch the signed URL as a blob to get a same-origin blob URL that respects `download`.
    try {
      const fileResponse = await fetch(url);
      const blob = await fileResponse.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      if (options?.filename) anchor.download = options.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // CORS fallback: open in new tab if direct fetch fails.
      openSignedDownloadUrl(url, { filename: options?.filename, openInNewTab: true });
    }
    return;
  }

  // Local-storage path: backend streamed the file directly with Content-Disposition.
  const blobUrl = URL.createObjectURL(response.data as Blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  if (options?.filename) {
    anchor.download = options.filename;
  }
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
