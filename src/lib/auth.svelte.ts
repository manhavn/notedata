import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
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

function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code
  switch (code) {
    case 'auth/invalid-email':
      return 'Email không hợp lệ.'
    case 'auth/user-disabled':
      return 'Tài khoản đã bị vô hiệu hóa.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu không đúng.'
    case 'auth/email-already-in-use':
      return 'Email đã được sử dụng.'
    case 'auth/weak-password':
      return 'Mật khẩu phải có ít nhất 6 ký tự.'
    case 'auth/too-many-requests':
      return 'Quá nhiều lần thử. Vui lòng thử lại sau.'
    case 'auth/popup-closed-by-user':
      return 'Đã hủy đăng nhập Google.'
    case 'auth/cancelled-popup-request':
      return 'Cửa sổ đăng nhập Google đang mở.'
    case 'auth/account-exists-with-different-credential':
      return 'Email này đã được đăng ký bằng phương thức khác.'
    case 'auth/popup-blocked':
      return 'Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép popup.'
    default:
      return 'Đã xảy ra lỗi. Vui lòng thử lại.'
  }
}