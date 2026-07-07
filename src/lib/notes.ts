import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database'
import { getUntitledNoteTitle } from './i18n.svelte'
import { db } from './firebase'
import type { Note, NoteInput, TrashedNote } from './types'

function notesPath(userId: string) {
  return `users/${userId}/notes`
}

function trashPath(userId: string) {
  return `users/${userId}/trash`
}

export function normalizeTags(tags?: string[] | string): string[] {
  const items = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(',')
      : []

  return [...new Set(items.map((tag) => tag.trim()).filter(Boolean))]
}

function parseTags(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    const tags = normalizeTags(value)
    return tags.length > 0 ? tags : undefined
  }

  if (typeof value === 'object' && value !== null) {
    const tags = normalizeTags(
      Object.values(value).filter((item): item is string => typeof item === 'string'),
    )
    return tags.length > 0 ? tags : undefined
  }

  return undefined
}

function serializeTags(tags?: string[]): string | null {
  const normalized = normalizeTags(tags)
  return normalized.length > 0 ? normalized.join(',') : null
}

function parseOptionalAiActiveId(value: unknown): string | null | undefined {
  if (value === null) return null
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function parseNoteAiActiveFields(raw: Record<string, unknown>) {
  const aiActiveProviderId = parseOptionalAiActiveId(raw.aiActiveProviderId)
  const aiActiveModelId = parseOptionalAiActiveId(raw.aiActiveModelId)
  const aiActiveApiKeyId = parseOptionalAiActiveId(raw.aiActiveApiKeyId)

  return {
    ...(aiActiveProviderId !== undefined ? { aiActiveProviderId } : {}),
    ...(aiActiveModelId !== undefined ? { aiActiveModelId } : {}),
    ...(aiActiveApiKeyId !== undefined ? { aiActiveApiKeyId } : {}),
  }
}

function parseNoteRecord(id: string, note: Omit<Note, 'id'> & { tags?: unknown }): Note {
  const { tags: rawTags, ...rest } = note
  const tags = parseTags(rawTags)
  const aiFields = parseNoteAiActiveFields(rest as Record<string, unknown>)

  return tags
    ? { id, ...rest, ...aiFields, tags }
    : { id, ...rest, ...aiFields }
}

export type NoteSortOrder =
  | 'title-asc'
  | 'title-desc'
  | 'update-asc'
  | 'update-desc'
  | 'create-asc'
  | 'create-desc'

export function sortNotes(
  notes: Note[],
  order: NoteSortOrder,
  locale = 'en',
): Note[] {
  const sorted = [...notes]

  switch (order) {
    case 'title-asc':
      return sorted.sort((a, b) =>
        a.title.localeCompare(b.title, locale, { sensitivity: 'base' }),
      )
    case 'title-desc':
      return sorted.sort((a, b) =>
        b.title.localeCompare(a.title, locale, { sensitivity: 'base' }),
      )
    case 'update-asc':
      return sorted.sort((a, b) => a.updatedAt - b.updatedAt)
    case 'create-asc':
      return sorted.sort((a, b) => a.createdAt - b.createdAt)
    case 'create-desc':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'update-desc':
    default:
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt)
  }
}

function parseNotes(data: Record<string, Omit<Note, 'id'> & { tags?: unknown }>): Note[] {
  return sortNotes(
    Object.entries(data).map(([id, note]) => parseNoteRecord(id, note)),
    'update-desc',
  )
}

function noteMatchesSearch(note: Note, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true

  if (note.title.toLowerCase().includes(term)) {
    return true
  }

  return (note.tags ?? []).some((tag) => tag.toLowerCase().includes(term))
}

function parseTrashedNotes(
  data: Record<string, Omit<TrashedNote, 'id'> & { tags?: unknown }>,
): TrashedNote[] {
  return Object.entries(data)
    .map(([id, note]) => parseNoteRecord(id, note) as TrashedNote)
    .sort((a, b) => b.deletedAt - a.deletedAt)
}

function buildNotePayload(input: NoteInput, now: number) {
  const payload: Record<string, string | number | boolean> = {
    title: input.title.trim() || getUntitledNoteTitle(),
    content: input.content,
    createdAt: now,
    updatedAt: now,
  }

  if (input.encrypted) {
    payload.encrypted = true
  }
  if (input.keyId) {
    payload.keyId = input.keyId
  }

  const tags = serializeTags(input.tags)
  if (tags) {
    payload.tags = tags
  }

  if (input.aiActiveProviderId) {
    payload.aiActiveProviderId = input.aiActiveProviderId
  }
  if (input.aiActiveModelId) {
    payload.aiActiveModelId = input.aiActiveModelId
  }
  if (input.aiActiveApiKeyId) {
    payload.aiActiveApiKeyId = input.aiActiveApiKeyId
  }

  return payload
}

function buildNoteUpdates(input: Partial<NoteInput>) {
  const updates: Record<string, string | number | boolean | null> = {
    updatedAt: Date.now(),
  }

  if (input.title !== undefined) {
    updates.title = input.title.trim() || getUntitledNoteTitle()
  }
  if (input.content !== undefined) {
    updates.content = input.content
  }
  if (input.encrypted === false) {
    updates.encrypted = null
    updates.keyId = null
  } else if (input.encrypted) {
    updates.encrypted = true
  }
  if (input.keyId) {
    updates.keyId = input.keyId
  }
  if (input.tags !== undefined) {
    const tags = serializeTags(input.tags)
    updates.tags = tags ?? null
  }
  if (input.aiActiveProviderId !== undefined) {
    updates.aiActiveProviderId = input.aiActiveProviderId
  }
  if (input.aiActiveModelId !== undefined) {
    updates.aiActiveModelId = input.aiActiveModelId
  }
  if (input.aiActiveApiKeyId !== undefined) {
    updates.aiActiveApiKeyId = input.aiActiveApiKeyId
  }

  return updates
}

export async function searchNotes(userId: string, searchQuery: string): Promise<Note[]> {
  const term = searchQuery.trim()
  if (!term) return []

  const snapshot = await get(ref(db, notesPath(userId)))
  const allNotes = parseNotes(snapshot.val() ?? {})

  return allNotes.filter((note) => noteMatchesSearch(note, term))
}

export function subscribeToNotes(
  userId: string,
  callback: (notes: Note[]) => void,
): Unsubscribe {
  const notesRef = ref(db, notesPath(userId))

  return onValue(notesRef, (snapshot) => {
    callback(parseNotes(snapshot.val() ?? {}))
  })
}

export function subscribeToTrash(
  userId: string,
  callback: (notes: TrashedNote[]) => void,
): Unsubscribe {
  const trashRef = ref(db, trashPath(userId))

  return onValue(trashRef, (snapshot) => {
    callback(parseTrashedNotes(snapshot.val() ?? {}))
  })
}

export async function createNote(userId: string, input: NoteInput): Promise<string> {
  const now = Date.now()
  const notesRef = ref(db, notesPath(userId))
  const newRef = push(notesRef)

  await set(newRef, buildNotePayload(input, now))
  return newRef.key!
}

export async function updateNote(
  userId: string,
  noteId: string,
  input: Partial<NoteInput>,
): Promise<void> {
  const noteRef = ref(db, `${notesPath(userId)}/${noteId}`)
  await update(noteRef, buildNoteUpdates(input))
}

export async function moveNoteToTrash(userId: string, note: Note): Promise<void> {
  const now = Date.now()
  const payload: Record<string, string | number | boolean> = {
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deletedAt: now,
  }

  if (note.encrypted) payload.encrypted = true
  if (note.keyId) payload.keyId = note.keyId

  const tags = serializeTags(note.tags)
  if (tags) payload.tags = tags
  if (note.aiActiveProviderId) payload.aiActiveProviderId = note.aiActiveProviderId
  if (note.aiActiveModelId) payload.aiActiveModelId = note.aiActiveModelId
  if (note.aiActiveApiKeyId) payload.aiActiveApiKeyId = note.aiActiveApiKeyId

  await set(ref(db, `${trashPath(userId)}/${note.id}`), payload)
  await remove(ref(db, `${notesPath(userId)}/${note.id}`))
}

export async function restoreNoteFromTrash(userId: string, note: TrashedNote): Promise<void> {
  const now = Date.now()
  const payload: Record<string, string | number | boolean> = {
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: now,
  }

  if (note.encrypted) payload.encrypted = true
  if (note.keyId) payload.keyId = note.keyId

  const tags = serializeTags(note.tags)
  if (tags) payload.tags = tags
  if (note.aiActiveProviderId) payload.aiActiveProviderId = note.aiActiveProviderId
  if (note.aiActiveModelId) payload.aiActiveModelId = note.aiActiveModelId
  if (note.aiActiveApiKeyId) payload.aiActiveApiKeyId = note.aiActiveApiKeyId

  await set(ref(db, `${notesPath(userId)}/${note.id}`), payload)
  await remove(ref(db, `${trashPath(userId)}/${note.id}`))
}

export async function permanentlyDeleteNote(userId: string, noteId: string): Promise<void> {
  await remove(ref(db, `${trashPath(userId)}/${noteId}`))
}

export async function emptyTrash(userId: string): Promise<void> {
  await remove(ref(db, trashPath(userId)))
}

export async function moveNotesToTrash(userId: string, notes: Note[]): Promise<void> {
  await Promise.all(notes.map((note) => moveNoteToTrash(userId, note)))
}

export async function restoreNotesFromTrash(userId: string, notes: TrashedNote[]): Promise<void> {
  await Promise.all(notes.map((note) => restoreNoteFromTrash(userId, note)))
}

export async function permanentlyDeleteNotes(userId: string, noteIds: string[]): Promise<void> {
  await Promise.all(noteIds.map((noteId) => permanentlyDeleteNote(userId, noteId)))
}

export async function importNotes(userId: string, inputs: NoteInput[]): Promise<string[]> {
  const ids: string[] = []

  for (const input of inputs) {
    const id = await createNote(userId, input)
    ids.push(id)
  }

  return ids
}