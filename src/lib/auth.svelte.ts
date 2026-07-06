import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
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

export function getUserDisplayLabel(
  user: User | null | undefined,
  profileRevision = 0,
): string {
  void profileRevision
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

/** Email/password-only sign-ups must verify. Google sign-in is trusted by Firebase. */
export function userNeedsEmailVerification(user: User): boolean {
  if (userHasGoogleProvider(user)) return false
  return userHasPasswordProvider(user) && !user.emailVerified
}

export function userShowsEmailVerificationStatus(user: User): boolean {
  return userHasPasswordProvider(user) && !userHasGoogleProvider(user)
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
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await sendEmailVerification(credential.user)
    await refreshAuthUser()
  } catch (err) {
    setError(getAuthErrorMessage(err))
    throw err
  }
}

export async function resendEmailVerification() {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')

  setError(null)
  try {
    await sendEmailVerification(user)
  } catch (err) {
    const message = getAuthErrorMessage(err)
    setError(message)
    throw err
  }
}

export async function refreshEmailVerificationStatus(): Promise<boolean> {
  await refreshAuthUser()
  return auth.currentUser?.emailVerified ?? false
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

async function reauthenticateForSensitiveAction(currentPassword?: string) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')

  if (userHasPasswordProvider(user)) {
    if (!user.email || !currentPassword) {
      throw { code: 'auth/invalid-credential' }
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    return
  }

  if (userHasGoogleProvider(user)) {
    await reauthenticateWithPopup(user, googleProvider)
    return
  }

  throw { code: 'auth/invalid-credential' }
}

export async function requestEmailChange(newEmail: string, currentPassword?: string) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')

  const trimmed = newEmail.trim()
  if (!trimmed) {
    throw { code: 'auth/invalid-email' }
  }
  if (trimmed.toLowerCase() === user.email?.toLowerCase()) {
    throw { code: 'auth/email-same-as-current' }
  }

  setError(null)
  try {
    await reauthenticateForSensitiveAction(currentPassword)
    await verifyBeforeUpdateEmail(user, trimmed)
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
  'auth/email-same-as-current': 'authEmailSameAsCurrent',
  'auth/operation-not-allowed': 'authOperationNotAllowed',
}

function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code
  const key = code ? authErrorMap[code] : undefined
  return t(key ?? 'authErrorGeneric')
}