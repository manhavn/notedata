const DEFAULT_MIN_PASSCODE_LENGTH = 6
const DEFAULT_MAX_PASSCODE_LENGTH = 32

function parseEnvPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value.trim(), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

const rawMin = parseEnvPositiveInt(
  import.meta.env.VITE_MIN_PASSCODE_LENGTH,
  DEFAULT_MIN_PASSCODE_LENGTH,
)
const rawMax = parseEnvPositiveInt(
  import.meta.env.VITE_MAX_PASSCODE_LENGTH,
  DEFAULT_MAX_PASSCODE_LENGTH,
)

export const MIN_PASSCODE_LENGTH = Math.min(rawMin, rawMax)
export const MAX_PASSCODE_LENGTH = Math.max(rawMin, rawMax)

export const passcodeLengthParams = {
  min: MIN_PASSCODE_LENGTH,
  max: MAX_PASSCODE_LENGTH,
} as const