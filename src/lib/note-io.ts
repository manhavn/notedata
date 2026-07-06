import type { Note, NoteInput } from './types'

export interface NoteExportPayload {
  version: 1
  exportedAt: number
  notes: Array<{
    title: string
    content: string
    createdAt: number
    updatedAt: number
  }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseNoteInput(value: unknown): NoteInput | null {
  if (!isRecord(value)) return null

  const title = typeof value.title === 'string' ? value.title : ''
  const content = typeof value.content === 'string' ? value.content : ''

  if (!title.trim() && !content.trim()) return null

  return { title, content }
}

export function parseImportedNotes(data: unknown): NoteInput[] {
  let items: unknown[] = []

  if (Array.isArray(data)) {
    items = data
  } else if (isRecord(data) && Array.isArray(data.notes)) {
    items = data.notes
  } else if (isRecord(data) && parseNoteInput(data)) {
    items = [data]
  } else {
    throw new Error('File JSON không đúng định dạng. Cần mảng ghi chú hoặc object có trường "notes".')
  }

  const notes = items.map(parseNoteInput).filter((note): note is NoteInput => note !== null)

  if (notes.length === 0) {
    throw new Error('Không tìm thấy ghi chú hợp lệ trong file JSON.')
  }

  return notes
}

export function buildExportPayload(notes: Note[]): NoteExportPayload {
  return {
    version: 1,
    exportedAt: Date.now(),
    notes: notes.map(({ title, content, createdAt, updatedAt }) => ({
      title,
      content,
      createdAt,
      updatedAt,
    })),
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

export async function readNotesFromFile(file: File): Promise<NoteInput[]> {
  const text = await file.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('File JSON không hợp lệ.')
  }

  return parseImportedNotes(parsed)
}