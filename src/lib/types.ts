export interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface TrashedNote extends Note {
  deletedAt: number
}

export interface NoteInput {
  title: string
  content: string
}