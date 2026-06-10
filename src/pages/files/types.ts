import type { StorageFile, StorageFolder } from '@/shared/types';

export type StorageScope = 'personal' | 'company';

export type FileBrowserConfirmAction =
  | { type: 'delete-folder'; folder: StorageFolder }
  | { type: 'delete-file'; file: StorageFile }
  | { type: 'revoke-share'; shareId: number };

export type RenameTarget =
  | { kind: 'folder'; folder: StorageFolder }
  | { kind: 'file'; file: StorageFile };

export type CategoryFilter = 'all' | 'docs' | 'img' | 'media' | 'arch' | 'other';

