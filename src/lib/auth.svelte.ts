import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { t } from './i18n.svelte'
import type { TranslationKey } from './i18n/translations'
import { auth } from './firebase'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const authState = $state({
  user: null as User | null,
  loading: true,
  error: null as string | null,
})

onAuthStateChanged(auth, (user) => {
  authState.user = user
  authState.loading = false
})

function setError(message: string | null) {
  authState.error = message
}

export async function login(email: string, password: string) {
  setError(null)
  try {
    await signInWithEmailAndPassword(auth, email, password)
  } catch (err) {
    setError(getAuthErrorMessage(err))
    throw err
  }
}

export async function register(email: string, password: string) {
  setError(null)
  try {
    await createUserWithEmailAndPassword(auth, email, password)
  } catch (err) {
    setError(getAuthErrorMessage(err))
    throw err
  }
}

export async function loginWithGoogle() {
  setError(null)
  try {
    await signInWithPopup(auth, googleProvider)
  } catch (err) {
    setError(getAuthErrorMessage(err))
    throw err
  }
}

export async function logout() {
  setError(null)
  await signOut(auth)
}

const authErrorMap: Record<string, TranslationKey> = {
  'auth/invalid-email': 'authInvalidEmail',
  'auth/user-disabled': 'authUserDisabled',
  'auth/user-not-found': 'authWrongCredentials',
  'auth/wrong-password': 'authWrongCredentials',
  'auth/invalid-credential': 'authWrongCredentials',
  'auth/email-already-in-use': 'authEmailInUse',
  'auth/weak-password': 'authWeakPassword',
  'auth/too-many-requests': 'authTooManyRequests',
  'auth/popup-closed-by-user': 'authPopupClosed',
  'auth/cancelled-popup-request': 'authPopupPending',
  'auth/account-exists-with-different-credential': 'authAccountExists',
  'auth/popup-blocked': 'authPopupBlocked',
}

function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code
  const key = code ? authErrorMap[code] : undefined
  return t(key ?? 'authErrorGeneric')
}