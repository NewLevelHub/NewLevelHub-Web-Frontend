import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Download, X, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { API } from '@/shared/api/endpoints';
import { fetchSignedDownloadUrl } from '@/shared/lib/resolveDownloadUrl';
import type { StorageFile } from '@/shared/types';

// ── helpers ──────────────────────────────────────────────────────────────────

function getEffectiveMime(file: StorageFile): string {
  return (file.content_type || file.mime_type || '').toLowerCase();
}

export function isPreviewable(file: StorageFile): boolean {
  const mime = getEffectiveMime(file);
  return mime.startsWith('image/') || mime === 'application/pdf';
}

type PreviewKind = 'image' | 'pdf' | 'none';

function getPreviewKind(file: StorageFile): PreviewKind {
  const mime = getEffectiveMime(file);
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  return 'none';
}

// ── component ─────────────────────────────────────────────────────────────────

interface FilePreviewPanelProps {
  file: StorageFile;
  onClose: () => void;
  onDownload: (file: StorageFile) => void;
}

export function FilePreviewPanel({ file, onClose, onDownload }: FilePreviewPanelProps) {
  const { t } = useTranslation();
  const kind = getPreviewKind(file);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch signed preview URL (same endpoint used for download)
  const previewUrlQuery = useQuery({
    queryKey: ['storage', 'preview-url', file.id],
    queryFn: () => fetchSignedDownloadUrl(API.storage.fileDownload(String(file.id))),
    enabled: kind !== 'none',
    staleTime: 4 * 60 * 1000, // signed URLs typically expire in 5 min — refresh before that
    gcTime: 5 * 60 * 1000,
  });

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll while panel is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const previewUrl = previewUrlQuery.data;
  const isLoading = previewUrlQuery.isLoading;
  const isError = previewUrlQuery.isError;

  return (
    /*
     * Full-screen overlay (both mobile and desktop).
     * On desktop ≥ lg screens the inner panel is a wide modal/side-panel style box.
     * On mobile it takes the full screen.
     */
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px]',
        'sm:items-center',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={t('files.previewTitle', { name: file.name })}
    >
      <div
        className={cn(
          // Mobile: full-width sheet that takes up to 92vh
          'relative flex flex-col bg-[var(--bg-surface)] border border-[var(--border)]',
          'w-full max-h-[92vh] rounded-t-2xl',
          // Desktop: centered modal, fixed max-width, rounded on all sides
          'sm:rounded-2xl sm:w-[90vw] sm:max-w-4xl sm:max-h-[90vh]',
          'shadow-[0_24px_64px_rgba(0,0,0,0.22)]',
        )}
        // Stop clicks inside the panel from closing the overlay
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Panel header ── */}
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]',
            'shrink-0',
          )}
        >
          {/* Drag handle pill on mobile */}
          <span
            className="absolute left-1/2 top-2.5 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--border)] sm:hidden"
            aria-hidden="true"
          />

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText
              size={15}
              className="shrink-0"
              style={{ color: 'var(--text-secondary)' }}
              aria-hidden="true"
            />
            <span
              className="text-[14px] font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
              title={file.name}
            >
              {file.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Download button — always visible */}
            <button
              type="button"
              onClick={() => onDownload(file)}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-sm)]',
                'border border-[var(--border)] text-[12px] font-medium',
                'hover:bg-[var(--bg-hover)] transition-colors',
              )}
              style={{ color: 'var(--text-secondary)' }}
              aria-label={t('files.download')}
            >
              <Download size={13} aria-hidden="true" />
              <span className="hidden sm:inline">{t('files.download')}</span>
            </button>

            {/* Open in new tab — only for previewable types when URL is ready */}
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]',
                  'border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors',
                )}
                style={{ color: 'var(--text-secondary)' }}
                aria-label={t('files.previewOpenNewTab')}
              >
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]',
                'border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors',
              )}
              style={{ color: 'var(--text-secondary)' }}
              aria-label={t('common.close')}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Preview body ── */}
        <div className="flex-1 overflow-auto min-h-0 flex items-center justify-center p-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
              <span
                className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--border)] border-t-[var(--brand)]"
                aria-hidden="true"
              />
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {t('files.previewLoading')}
              </span>
            </div>
          )}

          {/* Error state */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <FileText size={40} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('files.previewError')}
              </p>
              <button
                type="button"
                onClick={() => onDownload(file)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-4 rounded-[var(--radius-sm)]',
                  'bg-[var(--brand)] text-white text-[13px] font-medium',
                  'hover:bg-[var(--brand-hover)] transition-colors',
                )}
              >
                <Download size={13} aria-hidden="true" />
                {t('files.download')}
              </button>
            </div>
          )}

          {/* Image preview */}
          {!isLoading && !isError && previewUrl && kind === 'image' && (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg select-none"
              style={{ maxHeight: 'calc(90vh - 100px)' }}
              draggable={false}
            />
          )}

          {/* PDF preview */}
          {!isLoading && !isError && previewUrl && kind === 'pdf' && (
            <iframe
              src={previewUrl}
              title={file.name}
              className="w-full rounded-lg border border-[var(--border)]"
              style={{ height: 'calc(90vh - 100px)', minHeight: '400px' }}
              aria-label={t('files.previewPdfLabel', { name: file.name })}
            />
          )}

          {/* Non-previewable fallback — shouldn't normally render since we guard
              with isPreviewable() before opening, but kept as safety net */}
          {!isLoading && !isError && kind === 'none' && (
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <FileText size={48} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <div>
                <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {t('files.previewNotSupported')}
                </p>
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {t('files.previewDownloadInstead')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDownload(file)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-4 rounded-[var(--radius-sm)]',
                  'bg-[var(--brand)] text-white text-[13px] font-medium',
                  'hover:bg-[var(--brand-hover)] transition-colors',
                )}
              >
                <Download size={13} aria-hidden="true" />
                {t('files.download')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
