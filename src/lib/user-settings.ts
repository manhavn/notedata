import { get, onValue, ref, update, type Unsubscribe } from 'firebase/database'
import { db } from './firebase'

export const USER_SETTING_DISABLE_AI_CHAT = 'disableAiChat'

export type UserSettings = {
  disableAiChat: boolean
}

const DEFAULT_USER_SETTINGS: UserSettings = {
  disableAiChat: false,
}

function settingsPath(userId: string) {
  return `users/${userId}/settings`
}

function parseUserSettings(data: Record<string, unknown> | null | undefined): UserSettings {
  if (!data) return { ...DEFAULT_USER_SETTINGS }

  return {
    disableAiChat: data[USER_SETTING_DISABLE_AI_CHAT] === true,
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

export async function setUserDisableAiChat(userId: string, disabled: boolean): Promise<void> {
  await update(ref(db, settingsPath(userId)), {
    [USER_SETTING_DISABLE_AI_CHAT]: disabled,
  })
}