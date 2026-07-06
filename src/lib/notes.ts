import {
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database'
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

  await set(newRef, {
    title: input.title.trim() || 'Ghi chú không tiêu đề',
    content: input.content,
    createdAt: now,
    updatedAt: now,
  })

  return newRef.key!
}

export async function updateNote(
  userId: string,
  noteId: string,
  input: Partial<NoteInput>,
): Promise<void> {
  const noteRef = ref(db, `${notesPath(userId)}/${noteId}`)
  const updates: Record<string, string | number> = { updatedAt: Date.now() }

  if (input.title !== undefined) {
    updates.title = input.title.trim() || 'Ghi chú không tiêu đề'
  }
  if (input.content !== undefined) {
    updates.content = input.content
  }

  await update(noteRef, updates)
}

export async function moveNoteToTrash(userId: string, note: Note): Promise<void> {
  const now = Date.now()

  await set(ref(db, `${trashPath(userId)}/${note.id}`), {
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deletedAt: now,
  })

  await remove(ref(db, `${notesPath(userId)}/${note.id}`))
}

export async function restoreNoteFromTrash(userId: string, note: TrashedNote): Promise<void> {
  const now = Date.now()

  await set(ref(db, `${notesPath(userId)}/${note.id}`), {
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: now,
  })

  await remove(ref(db, `${trashPath(userId)}/${note.id}`))
}

export async function permanentlyDeleteNote(userId: string, noteId: string): Promise<void> {
  await remove(ref(db, `${trashPath(userId)}/${noteId}`))
}

export async function emptyTrash(userId: string): Promise<void> {
  await remove(ref(db, trashPath(userId)))
}