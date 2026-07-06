import { translations, type Locale } from './i18n/translations'

export type { Locale, TranslationKey } from './i18n/translations'
import type { TranslationKey } from './i18n/translations'

const LOCALE_STORAGE_KEY = 'notedata-locale'

export const localeState = $state({
  locale: 'en' as Locale,
})

export function initLocale() {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  localeState.locale = stored === 'vi' ? 'vi' : 'en'
  document.documentElement.lang = localeState.locale
}

export function setLocale(locale: Locale) {
  localeState.locale = locale
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  document.documentElement.lang = locale
}

export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  let value: string = translations[localeState.locale][key] ?? translations.en[key]

  if (params) {
    for (const [name, paramValue] of Object.entries(params)) {
      value = value.replace(`{${name}}`, String(paramValue))
    }
  }

  return value
}

export function formatAppDate(timestamp: number): string {
  const locale = localeState.locale === 'vi' ? 'vi-VN' : 'en-US'

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function getUntitledNoteTitle(): string {
  return t('untitledNote')
}