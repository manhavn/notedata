import { t } from './i18n.svelte'
import { getRawUserSettings, overwriteUserSettings } from './user-settings'

export interface SettingsExportPayload {
  version: 1
  exportedAt: number
  settings: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function buildSettingsExportPayload(
  settings: Record<string, unknown>,
): SettingsExportPayload {
  return {
    version: 1,
    exportedAt: Date.now(),
    settings,
  }
}

export function parseImportedSettings(data: unknown): Record<string, unknown> {
  if (isRecord(data) && isRecord(data.settings)) {
    return data.settings
  }

  if (isRecord(data)) {
    return data
  }

  throw new Error(t('settingsInvalidFormat'))
}

export function downloadSettingsJson(settings: Record<string, unknown>, filename?: string) {
  const payload = buildSettingsExportPayload(settings)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)

  anchor.href = url
  anchor.download = filename ?? `notedata-settings-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readSettingsFromFile(file: File): Promise<Record<string, unknown>> {
  const text = await file.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(t('settingsInvalidFile'))
  }

  return parseImportedSettings(parsed)
}

export async function exportUserSettings(userId: string): Promise<void> {
  const settings = await getRawUserSettings(userId)
  downloadSettingsJson(settings)
}

export async function importUserSettings(
  userId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  await overwriteUserSettings(userId, settings)
}