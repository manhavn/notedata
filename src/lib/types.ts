export interface Note {
  id: string
  title: string
  content: string
  tags?: string[]
  createdAt: number
  updatedAt: number
  encrypted?: boolean
  keyId?: string
}

export interface TrashedNote extends Note {
  deletedAt: number
}

export interface NoteInput {
  title: string
  content: string
  tags?: string[]
  encrypted?: boolean
  keyId?: string
}

export interface EncryptionKey {
  id: string
  label: string
  code: string
  createdAt: number
}