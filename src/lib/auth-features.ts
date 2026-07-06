function parseEnvFlag(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

export const authFeatures = {
  disableSignupEmailPassword: parseEnvFlag(import.meta.env.VITE_DISABLE_SIGNUP_EMAIL_PASSWORD),
  disableSignupGoogle: parseEnvFlag(import.meta.env.VITE_DISABLE_SIGNUP_GOOGLE),
  disableForgotPassword: parseEnvFlag(import.meta.env.VITE_DISABLE_FORGOT_PASSWORD),
  disableChangeEmail: parseEnvFlag(import.meta.env.VITE_DISABLE_CHANGE_EMAIL),
  disableChangePassword: parseEnvFlag(import.meta.env.VITE_DISABLE_CHANGE_PASSWORD),
} as const

export function assertAuthFeatureEnabled(enabled: boolean): void {
  if (!enabled) {
    throw { code: 'auth/feature-disabled' }
  }
}