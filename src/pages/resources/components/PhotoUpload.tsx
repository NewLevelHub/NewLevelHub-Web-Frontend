import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import type { ResourcePhoto } from '@/shared/types';

// ─── PhotoUploadCreate ────────────────────────────────────────────────────────

export type PhotoUploadCreateProps = {
  photoFiles: File[];
  primaryPhotoIndex: number | null;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (idx: number) => void;
  onSetPrimary: (idx: number) => void;
};

export function PhotoUploadCreate({
  photoFiles,
  primaryPhotoIndex,
  onAddPhotos,
  onRemovePhoto,
  onSetPrimary,
}: PhotoUploadCreateProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-secondary">
        {t('resources.create.photosLabel')}
      </label>
      <label
        htmlFor="photos"
        className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-default bg-raised px-4 py-3 text-sm text-secondary hover:bg-hover transition-colors"
      >
        <span className="font-medium text-[color:var(--brand)]">
          {t('resources.create.choosePhoto')}
        </span>
        <span className="text-muted">{t('resources.create.dropFilesHint')}</span>
        <input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          lang={dateLocale}
          onChange={(e) => {
            onAddPhotos(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </label>
      {photoFiles.length > 0 && (
        <ul className="mt-1 space-y-1">
          {photoFiles.map((file, i) => {
            const isPrimary = primaryPhotoIndex === i || photoFiles.length === 1;
            return (
              <li
                key={i}
                className={cn(
                  'flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm',
                  isPrimary
                    ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)] text-primary'
                    : 'border-default bg-raised text-secondary',
                )}
              >
                {isPrimary ? (
                  <span className="shrink-0 text-xs font-semibold text-[color:var(--brand-text)]">
                    {t('resources.create.photoPrimary')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetPrimary(i)}
                    className="shrink-0 text-xs text-muted hover:text-[color:var(--brand)] transition-colors"
                  >
                    {t('resources.create.photoMakePrimary')}
                  </button>
                )}
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onRemovePhoto(i)}
                  className="shrink-0 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  {t('common.delete')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── PhotoUploadDetail ────────────────────────────────────────────────────────

export type PhotoUploadDetailProps = {
  existingPhotos: ResourcePhoto[];
  newPhotoFiles: File[];
  uploadPending: boolean;
  deletePending: boolean;
  onAddNewFiles: (files: File[]) => void;
  onRemoveNewFile: (idx: number) => void;
  onUploadNew: () => void;
  onDeleteExisting: (photoId: number) => void;
};

export function PhotoUploadDetail({
  existingPhotos,
  newPhotoFiles,
  uploadPending,
  deletePending,
  onAddNewFiles,
  onRemoveNewFile,
  onUploadNew,
  onDeleteExisting,
}: PhotoUploadDetailProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);

  return (
    <div className="space-y-3">
      <label className="mb-1 block text-sm font-medium text-secondary">
        {t('resources.detail.photosLabel')}
      </label>

      {existingPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existingPhotos.map((p) => (
            <div key={p.id} className="group relative">
              <img
                src={p.image_url ?? resolveMediaUrl(p.image) ?? p.image}
                alt=""
                className="h-20 w-28 rounded-lg border border-default object-cover"
              />
              <button
                type="button"
                onClick={() => onDeleteExisting(p.id)}
                disabled={deletePending}
                className="absolute right-1 top-1 hidden rounded bg-black/60 px-1.5 py-0.5 text-xs text-white group-hover:block"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        htmlFor="new-photos"
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-default bg-raised px-4 py-3 text-sm text-secondary transition-colors hover:bg-hover"
      >
        <span className="font-medium text-blue-600">{t('resources.detail.addPhoto')}</span>
        <span className="text-muted">{t('resources.detail.addPhotoHint')}</span>
        <input
          id="new-photos"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          lang={dateLocale}
          onChange={(e) => {
            onAddNewFiles(Array.from(e.target.files ?? []));
          }}
        />
      </label>

      {newPhotoFiles.length > 0 && (
        <div className="space-y-1.5">
          {newPhotoFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-default bg-raised px-3 py-1.5 text-sm text-secondary"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemoveNewFile(i)}
                className="ml-3 shrink-0 text-red-500 hover:text-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onUploadNew}
            disabled={uploadPending}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {uploadPending ? t('common.loading') : t('resources.detail.uploadSelected')}
          </button>
        </div>
      )}
    </div>
  );
}
