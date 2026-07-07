/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_DATABASE_URL: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_DISABLE_SIGNUP_EMAIL_PASSWORD?: string
  readonly VITE_DISABLE_SIGNUP_GOOGLE?: string
  readonly VITE_DISABLE_FORGOT_PASSWORD?: string
  readonly VITE_DISABLE_CHANGE_EMAIL?: string
  readonly VITE_DISABLE_CHANGE_PASSWORD?: string
  readonly VITE_DISABLE_AI_CHAT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}