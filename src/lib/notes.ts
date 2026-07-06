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
import type { Note, NoteInput } from './types'

function notesPath(userId: string) {
  return `users/${userId}/notes`
}

export function subscribeToNotes(
  userId: string,
  callback: (notes: Note[]) => void,
): Unsubscribe {
  const notesRef = ref(db, notesPath(userId))

  return onValue(notesRef, (snapshot) => {
    const data = snapshot.val() ?? {}
    const notes = Object.entries(data)
      .map(([id, note]) => ({
        id,
        ...(note as Omit<Note, 'id'>),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)

    callback(notes)
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

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  const noteRef = ref(db, `${notesPath(userId)}/${noteId}`)
  await remove(noteRef)
}