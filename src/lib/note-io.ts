import { t } from './i18n.svelte'
import { normalizeTags } from './notes'
import type { ImportedNoteInput, Note, NoteContentViewMode } from './types'

export interface NoteExportPayload {
  version: 1
  exportedAt: number
  notes: Array<{
    title: string
    content: string
    tags?: string[]
    createdAt: number
    updatedAt: number
    encrypted?: boolean
    keyId?: string
    contentViewMode?: NoteContentViewMode
    aiActiveProviderId?: string | null
    aiActiveModelId?: string | null
    aiActiveApiKeyId?: string | null
  }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseOptionalAiActiveId(value: unknown): string | null | undefined {
  if (value === null) return null
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function parseContentViewMode(value: unknown): NoteContentViewMode | undefined {
  return value === 'txt' || value === 'md' || value === 'html' ? value : undefined
}

function parseTimestamp(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function parseNoteInput(value: unknown): ImportedNoteInput | null {
  if (!isRecord(value)) return null

  const title = typeof value.title === 'string' ? value.title : ''
  const content = typeof value.content === 'string' ? value.content : ''
  const tags = Array.isArray(value.tags)
    ? normalizeTags(value.tags.filter((tag): tag is string => typeof tag === 'string'))
    : typeof value.tags === 'string'
      ? normalizeTags(value.tags)
      : undefined

  if (!title.trim() && !content.trim()) return null

  const input: ImportedNoteInput = { title, content }

  if (tags && tags.length > 0) {
    input.tags = tags
  }

  const keyId = typeof value.keyId === 'string' && value.keyId.trim() ? value.keyId.trim() : undefined
  const encrypted = value.encrypted === true || Boolean(keyId)

  if (encrypted) {
    input.encrypted = true
  }
  if (keyId) {
    input.keyId = keyId
  }

  const contentViewMode = parseContentViewMode(value.contentViewMode)
  if (contentViewMode) {
    input.contentViewMode = contentViewMode
  }

  const aiActiveProviderId = parseOptionalAiActiveId(value.aiActiveProviderId)
  if (aiActiveProviderId !== undefined) {
    input.aiActiveProviderId = aiActiveProviderId
  }

  const aiActiveModelId = parseOptionalAiActiveId(value.aiActiveModelId)
  if (aiActiveModelId !== undefined) {
    input.aiActiveModelId = aiActiveModelId
  }

  const aiActiveApiKeyId = parseOptionalAiActiveId(value.aiActiveApiKeyId)
  if (aiActiveApiKeyId !== undefined) {
    input.aiActiveApiKeyId = aiActiveApiKeyId
  }

  const createdAt = parseTimestamp(value.createdAt)
  if (createdAt !== undefined) {
    input.createdAt = createdAt
  }

  const updatedAt = parseTimestamp(value.updatedAt)
  if (updatedAt !== undefined) {
    input.updatedAt = updatedAt
  }

  return input
}

export function parseImportedNotes(data: unknown): ImportedNoteInput[] {
  let items: unknown[] = []

  if (Array.isArray(data)) {
    items = data
  } else if (isRecord(data) && Array.isArray(data.notes)) {
    items = data.notes
  } else if (isRecord(data) && parseNoteInput(data)) {
    items = [data]
  } else {
    throw new Error(t('jsonInvalidFormat'))
  }

  const notes = items.map(parseNoteInput).filter((note): note is ImportedNoteInput => note !== null)

  if (notes.length === 0) {
    throw new Error(t('jsonNoValidNotes'))
  }

  return notes
}

export function buildExportPayload(notes: Note[]): NoteExportPayload {
  return {
    version: 1,
    exportedAt: Date.now(),
    notes: notes.map((note) => {
      const item: NoteExportPayload['notes'][number] = {
        title: note.title,
        content: note.content ?? '',
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }

      if (note.tags && note.tags.length > 0) {
        item.tags = note.tags
      }
      if (note.encrypted) {
        item.encrypted = true
      }
      if (note.keyId) {
        item.keyId = note.keyId
      }
      if (note.contentViewMode) {
        item.contentViewMode = note.contentViewMode
      }
      if (note.aiActiveProviderId !== undefined) {
        item.aiActiveProviderId = note.aiActiveProviderId
      }
      if (note.aiActiveModelId !== undefined) {
        item.aiActiveModelId = note.aiActiveModelId
      }
      if (note.aiActiveApiKeyId !== undefined) {
        item.aiActiveApiKeyId = note.aiActiveApiKeyId
      }

      return item
    }),
  }
}

export function downloadNotesJson(notes: Note[], filename?: string) {
  const payload = buildExportPayload(notes)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)

  anchor.href = url
  anchor.download = filename ?? `notedata-export-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readNotesFromFile(file: File): Promise<ImportedNoteInput[]> {
  const text = await file.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(t('jsonInvalidFile'))
  }

  return parseImportedNotes(parsed)
}