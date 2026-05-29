/** BCP 47 locale tag for date/time formatting from i18n language code. */
export function dateLocaleTag(language: string): string {
  return language === 'en' ? 'en-US' : 'ru-RU';
}
