import { get, onValue, ref, set, update, type Unsubscribe } from 'firebase/database'
import { db } from './firebase'

export const USER_SETTING_DISABLE_AI_CHAT = 'disableAiChat'
export const USER_SETTING_PERSIST_AI_CHAT_LOCAL = 'persistAiChatLocal'
export const USER_SETTING_PERSIST_NOTE_DRAFT_LOCAL = 'persistNoteDraftLocal'

export type UserSettings = {
  disableAiChat: boolean
  persistAiChatLocal: boolean
  persistNoteDraftLocal: boolean
}

const DEFAULT_USER_SETTINGS: UserSettings = {
  disableAiChat: false,
  persistAiChatLocal: false,
  persistNoteDraftLocal: false,
}

function settingsPath(userId: string) {
  return `users/${userId}/settings`
}

function parseUserSettings(data: Record<string, unknown> | null | undefined): UserSettings {
  if (!data) return { ...DEFAULT_USER_SETTINGS }

  return {
    disableAiChat: data[USER_SETTING_DISABLE_AI_CHAT] === true,
    persistAiChatLocal: data[USER_SETTING_PERSIST_AI_CHAT_LOCAL] === true,
    persistNoteDraftLocal: data[USER_SETTING_PERSIST_NOTE_DRAFT_LOCAL] === true,
  }
}

export function subscribeToUserSettings(
  userId: string,
  callback: (settings: UserSettings) => void,
): Unsubscribe {
  const settingsRef = ref(db, settingsPath(userId))

  return onValue(settingsRef, (snapshot) => {
    callback(parseUserSettings(snapshot.val()))
  })
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const snapshot = await get(ref(db, settingsPath(userId)))
  return parseUserSettings(snapshot.val())
}

export async function getRawUserSettings(userId: string): Promise<Record<string, unknown>> {
  const snapshot = await get(ref(db, settingsPath(userId)))
  const value = snapshot.val()

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

export async function overwriteUserSettings(
  userId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  await set(ref(db, settingsPath(userId)), settings)
}

export async function setUserDisableAiChat(userId: string, disabled: boolean): Promise<void> {
  await update(ref(db, settingsPath(userId)), {
    [USER_SETTING_DISABLE_AI_CHAT]: disabled,
  })
}

export async function setUserPersistAiChatLocal(userId: string, enabled: boolean): Promise<void> {
  await update(ref(db, settingsPath(userId)), {
    [USER_SETTING_PERSIST_AI_CHAT_LOCAL]: enabled,
  })
}

export async function setUserPersistNoteDraftLocal(userId: string, enabled: boolean): Promise<void> {
  await update(ref(db, settingsPath(userId)), {
    [USER_SETTING_PERSIST_NOTE_DRAFT_LOCAL]: enabled,
  })
}