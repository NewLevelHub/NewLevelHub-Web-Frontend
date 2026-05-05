/**
 * Изоляция кэша React Query по аккаунту: все запросы к GET /companies/ должны
 * включать scope в queryKey, чтобы при смене пользователя не показывались чужие данные.
 */
export type CompaniesCacheScope = number | 'anonymous';

export function companiesCacheScope(userId: number | null | undefined): CompaniesCacheScope {
  return userId ?? 'anonymous';
}

/** Префикс для любых ключей, связанных со списком / данными компаний из API companies. */
export function companiesCacheRoot(userId: number | null | undefined) {
  return ['companies', companiesCacheScope(userId)] as const;
}
