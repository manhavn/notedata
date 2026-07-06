import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
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
  profileTick: 0,
})

export function getUserDisplayLabel(user: User | null | undefined): string {
  if (!user) return ''
  const name = user.displayName?.trim()
  return name || user.email || ''
}

export function userHasPasswordProvider(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === 'password')
}

export function userHasGoogleProvider(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === 'google.com')
}

async function refreshAuthUser() {
  const user = auth.currentUser
  if (user) {
    await user.reload()
  }
  authState.user = auth.currentUser
  authState.profileTick += 1
}

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

export async function requestPasswordReset(email: string) {
  setError(null)
  try {
    await sendPasswordResetEmail(auth, email.trim())
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

export async function saveDisplayName(displayName: string) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')

  setError(null)
  try {
    const trimmed = displayName.trim()
    await updateProfile(user, { displayName: trimmed || null })
    await refreshAuthUser()
  } catch (err) {
    const message = getAuthErrorMessage(err)
    setError(message)
    throw err
  }
}

export async function addAccountPassword(newPassword: string) {
  const user = auth.currentUser
  if (!user?.email) throw new Error('No email')

  setError(null)
  try {
    if (userHasPasswordProvider(user)) {
      throw { code: 'auth/provider-already-linked' }
    }
    const credential = EmailAuthProvider.credential(user.email, newPassword)
    await linkWithCredential(user, credential)
    await refreshAuthUser()
  } catch (err) {
    const message = getAuthErrorMessage(err)
    setError(message)
    throw err
  }
}

export async function changeAccountPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser
  if (!user?.email) throw new Error('No email')

  setError(null)
  try {
    if (!userHasPasswordProvider(user)) {
      throw { code: 'auth/invalid-credential' }
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, newPassword)
    await refreshAuthUser()
  } catch (err) {
    const message = getAuthErrorMessage(err)
    setError(message)
    throw err
  }
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
  'auth/requires-recent-login': 'authRequiresRecentLogin',
  'auth/provider-already-linked': 'authProviderAlreadyLinked',
  'auth/credential-already-in-use': 'authCredentialAlreadyInUse',
}

function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code
  const key = code ? authErrorMap[code] : undefined
  return t(key ?? 'authErrorGeneric')
}