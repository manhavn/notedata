function parseEnvFlag(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

export const aiFeatures = {
  disableAiChat: parseEnvFlag(import.meta.env.VITE_DISABLE_AI_CHAT),
} as const