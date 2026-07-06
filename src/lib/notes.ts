import {
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

function parseNotes(data: Record<string, Omit<Note, 'id'>>): Note[] {
  return Object.entries(data)
    .map(([id, note]) => ({ id, ...note }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

function parseTrashedNotes(data: Record<string, Omit<TrashedNote, 'id'>>): TrashedNote[] {
  return Object.entries(data)
    .map(([id, note]) => ({ id, ...note }))
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

  return updates
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