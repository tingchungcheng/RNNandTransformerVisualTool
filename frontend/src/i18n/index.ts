import en from '../locales/en.json'
import zhCN from '../locales/zh-CN.json'

export type Locale = 'en' | 'zh-CN'

export const LOCALES: Locale[] = ['en', 'zh-CN']

export const LOCALE_STORAGE_KEY = 'rnn-demo-locale'

const catalogs: Record<Locale, typeof en> = {
  en,
  'zh-CN': zhCN,
}

export function getCatalog(locale: Locale) {
  return catalogs[locale]
}

export function resolveMessage(
  catalog: typeof en,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split('.')
  let value: unknown = catalog

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part]
    } else {
      return key
    }
  }

  if (typeof value !== 'string') return key

  if (!params) return value

  return Object.entries(params).reduce((text, [name, val]) => {
    return text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(val))
  }, value)
}

export function readStoredLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored === 'en' || stored === 'zh-CN') return stored
  return 'en'
}
