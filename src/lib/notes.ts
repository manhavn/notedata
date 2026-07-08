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
import type { ImportedNoteInput, Note, NoteContentViewMode, NoteInput, TrashedNote } from './types'

function notesPath(userId: string) {
  return `users/${userId}/notes`
}

function noteContentsPath(userId: string) {
  return `users/${userId}/noteContents`
}

function trashPath(userId: string) {
  return `users/${userId}/trash`
}

function trashContentsPath(userId: string) {
  return `users/${userId}/trashContents`
}

const migratingContentIds = new Set<string>()

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

function parseContentViewMode(value: unknown): NoteContentViewMode | undefined {
  return value === 'txt' || value === 'md' || value === 'html' ? value : undefined
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

type RawNoteRecord = Omit<Note, 'id'> & { tags?: unknown; contentViewMode?: unknown }

function parseNoteListRecord(
  id: string,
  note: RawNoteRecord,
): Note {
  const { tags: rawTags, contentViewMode: rawContentViewMode, content: _content, ...rest } = note
  const tags = parseTags(rawTags)
  const aiFields = parseNoteAiActiveFields(rest as Record<string, unknown>)
  const contentViewMode = parseContentViewMode(rawContentViewMode)

  const base = tags
    ? { id, ...rest, ...aiFields, tags }
    : { id, ...rest, ...aiFields }

  return contentViewMode ? { ...base, contentViewMode } : base
}

function parseContentValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    return typeof record.content === 'string' ? record.content : ''
  }
  return ''
}

async function migrateLegacyNoteContent(
  userId: string,
  noteId: string,
  content: string,
): Promise<void> {
  const contentRef = ref(db, `${noteContentsPath(userId)}/${noteId}`)
  const existing = await get(contentRef)

  if (!existing.exists()) {
    await set(contentRef, content)
  }

  await update(ref(db, `${notesPath(userId)}/${noteId}`), { content: null })
}

async function migrateLegacyTrashContent(
  userId: string,
  noteId: string,
  content: string,
): Promise<void> {
  const contentRef = ref(db, `${trashContentsPath(userId)}/${noteId}`)
  const existing = await get(contentRef)

  if (!existing.exists()) {
    await set(contentRef, content)
  }

  await update(ref(db, `${trashPath(userId)}/${noteId}`), { content: null })
}

function scheduleLegacyContentMigration(
  userId: string,
  data: Record<string, RawNoteRecord>,
  inTrash: boolean,
): void {
  for (const [id, note] of Object.entries(data)) {
    if (typeof note.content !== 'string') continue
    if (migratingContentIds.has(id)) continue

    migratingContentIds.add(id)
    const migrate = inTrash ? migrateLegacyTrashContent : migrateLegacyNoteContent
    void migrate(userId, id, note.content).finally(() => migratingContentIds.delete(id))
  }
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

function parseNotes(data: Record<string, RawNoteRecord>): Note[] {
  return sortNotes(
    Object.entries(data).map(([id, note]) => parseNoteListRecord(id, note)),
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
    .map(([id, note]) => parseNoteListRecord(id, note) as TrashedNote)
    .sort((a, b) => b.deletedAt - a.deletedAt)
}

function buildNoteMetadataPayload(input: NoteInput, now: number) {
  const payload: Record<string, string | number | boolean | null> = {
    title: input.title.trim() || getUntitledNoteTitle(),
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

  if (input.aiActiveProviderId !== undefined) {
    payload.aiActiveProviderId = input.aiActiveProviderId
  }
  if (input.aiActiveModelId !== undefined) {
    payload.aiActiveModelId = input.aiActiveModelId
  }
  if (input.aiActiveApiKeyId !== undefined) {
    payload.aiActiveApiKeyId = input.aiActiveApiKeyId
  }
  if (input.contentViewMode) {
    payload.contentViewMode = input.contentViewMode
  }

  return payload
}

function buildTrashMetadataPayload(note: Note, deletedAt: number) {
  const payload: Record<string, string | number | boolean> = {
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deletedAt,
  }

  if (note.encrypted) payload.encrypted = true
  if (note.keyId) payload.keyId = note.keyId

  const tags = serializeTags(note.tags)
  if (tags) payload.tags = tags
  if (note.aiActiveProviderId) payload.aiActiveProviderId = note.aiActiveProviderId
  if (note.aiActiveModelId) payload.aiActiveModelId = note.aiActiveModelId
  if (note.aiActiveApiKeyId) payload.aiActiveApiKeyId = note.aiActiveApiKeyId
  if (note.contentViewMode) payload.contentViewMode = note.contentViewMode

  return payload
}

function shouldBumpUpdatedAt(input: Partial<NoteInput>): boolean {
  return (
    input.title !== undefined ||
    input.content !== undefined ||
    input.tags !== undefined ||
    input.encrypted !== undefined ||
    input.keyId !== undefined
  )
}

function buildNoteMetadataUpdates(input: Partial<NoteInput>) {
  const updates: Record<string, string | number | boolean | null> = {}

  if (shouldBumpUpdatedAt(input)) {
    updates.updatedAt = Date.now()
  }

  if (input.title !== undefined) {
    updates.title = input.title.trim() || getUntitledNoteTitle()
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
  if (input.contentViewMode !== undefined) {
    updates.contentViewMode = input.contentViewMode
  }

  return updates
}

export async function fetchNoteContent(userId: string, noteId: string): Promise<string> {
  const contentRef = ref(db, `${noteContentsPath(userId)}/${noteId}`)
  const snapshot = await get(contentRef)

  if (snapshot.exists()) {
    return parseContentValue(snapshot.val())
  }

  const legacyRef = ref(db, `${notesPath(userId)}/${noteId}/content`)
  const legacy = await get(legacyRef)
  return parseContentValue(legacy.val())
}

export async function fetchTrashNoteContent(userId: string, noteId: string): Promise<string> {
  const contentRef = ref(db, `${trashContentsPath(userId)}/${noteId}`)
  const snapshot = await get(contentRef)

  if (snapshot.exists()) {
    return parseContentValue(snapshot.val())
  }

  const legacyRef = ref(db, `${trashPath(userId)}/${noteId}/content`)
  const legacy = await get(legacyRef)
  return parseContentValue(legacy.val())
}

export async function fetchNoteContents(
  userId: string,
  noteIds: string[],
  inTrash = false,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    noteIds.map(async (noteId) => {
      const content = inTrash
        ? await fetchTrashNoteContent(userId, noteId)
        : await fetchNoteContent(userId, noteId)
      return [noteId, content] as const
    }),
  )

  return Object.fromEntries(entries)
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
    const data = snapshot.val() ?? {}
    scheduleLegacyContentMigration(userId, data, false)
    callback(parseNotes(data))
  })
}

export function subscribeToTrash(
  userId: string,
  callback: (notes: TrashedNote[]) => void,
): Unsubscribe {
  const trashRef = ref(db, trashPath(userId))

  return onValue(trashRef, (snapshot) => {
    const data = snapshot.val() ?? {}
    scheduleLegacyContentMigration(userId, data, true)
    callback(parseTrashedNotes(data))
  })
}

export async function createNote(userId: string, input: NoteInput): Promise<string> {
  const now = Date.now()
  const notesRef = ref(db, notesPath(userId))
  const newRef = push(notesRef)
  const noteId = newRef.key!

  await set(newRef, buildNoteMetadataPayload(input, now))
  await set(ref(db, `${noteContentsPath(userId)}/${noteId}`), input.content)
  return noteId
}

export async function updateNote(
  userId: string,
  noteId: string,
  input: Partial<NoteInput>,
): Promise<void> {
  const metadataUpdates = buildNoteMetadataUpdates(input)

  if (Object.keys(metadataUpdates).length > 0) {
    const noteRef = ref(db, `${notesPath(userId)}/${noteId}`)
    await update(noteRef, metadataUpdates)
  }

  if (input.content !== undefined) {
    await set(ref(db, `${noteContentsPath(userId)}/${noteId}`), input.content)
  }
}

async function resolveNoteContent(userId: string, note: Note): Promise<string> {
  if (note.content !== undefined) return note.content
  return fetchNoteContent(userId, note.id)
}

async function resolveTrashNoteContent(userId: string, note: TrashedNote): Promise<string> {
  if (note.content !== undefined) return note.content
  return fetchTrashNoteContent(userId, note.id)
}

export async function moveNoteToTrash(userId: string, note: Note): Promise<void> {
  const now = Date.now()
  const content = await resolveNoteContent(userId, note)

  await set(ref(db, `${trashPath(userId)}/${note.id}`), buildTrashMetadataPayload(note, now))
  await set(ref(db, `${trashContentsPath(userId)}/${note.id}`), content)
  await remove(ref(db, `${noteContentsPath(userId)}/${note.id}`))
  await remove(ref(db, `${notesPath(userId)}/${note.id}`))
}

export async function restoreNoteFromTrash(userId: string, note: TrashedNote): Promise<void> {
  const now = Date.now()
  const content = await resolveTrashNoteContent(userId, note)
  const payload = buildNoteMetadataPayload(
    {
      title: note.title,
      content,
      tags: note.tags,
      encrypted: note.encrypted,
      keyId: note.keyId,
      aiActiveProviderId: note.aiActiveProviderId,
      aiActiveModelId: note.aiActiveModelId,
      aiActiveApiKeyId: note.aiActiveApiKeyId,
      contentViewMode: note.contentViewMode,
    },
    now,
  )

  payload.createdAt = note.createdAt

  await set(ref(db, `${notesPath(userId)}/${note.id}`), payload)
  await set(ref(db, `${noteContentsPath(userId)}/${note.id}`), content)
  await remove(ref(db, `${trashContentsPath(userId)}/${note.id}`))
  await remove(ref(db, `${trashPath(userId)}/${note.id}`))
}

export async function permanentlyDeleteNote(userId: string, noteId: string): Promise<void> {
  await remove(ref(db, `${trashPath(userId)}/${noteId}`))
  await remove(ref(db, `${trashContentsPath(userId)}/${noteId}`))
}

export async function emptyTrash(userId: string): Promise<void> {
  await remove(ref(db, trashPath(userId)))
  await remove(ref(db, trashContentsPath(userId)))
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

export async function importNotes(userId: string, inputs: ImportedNoteInput[]): Promise<string[]> {
  const ids: string[] = []

  for (const { createdAt, updatedAt, ...input } of inputs) {
    const now = Date.now()
    const notesRef = ref(db, notesPath(userId))
    const newRef = push(notesRef)
    const noteId = newRef.key!

    const payload = buildNoteMetadataPayload(input, updatedAt ?? now)
    if (createdAt !== undefined) {
      payload.createdAt = createdAt
    }
    if (updatedAt !== undefined) {
      payload.updatedAt = updatedAt
    }

    await set(newRef, payload)
    await set(ref(db, `${noteContentsPath(userId)}/${noteId}`), input.content)
    ids.push(noteId)
  }

  return ids
}