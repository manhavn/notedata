<script lang="ts">
  import { tick } from 'svelte'
  import { t } from '../i18n.svelte'
  import {
    MAX_PASSCODE_LENGTH,
    MIN_PASSCODE_LENGTH,
    passcodeLengthParams,
  } from '../passcode'
  import { passcodeFocusState, togglePasscodeAutoFocus } from '../passcode-focus.svelte'

  interface Props {
    title: string
    subtitle?: string
    error?: string | null
    showAutoFocusToggle?: boolean
    onComplete: (code: string) => void
    onCancel?: () => void
  }

  let {
    title,
    subtitle = '',
    error = null,
    showAutoFocusToggle = false,
    onComplete,
    onCancel,
  }: Props = $props()

  const autoFocus = $derived(showAutoFocusToggle && passcodeFocusState.enabled)

  let code = $state('')
  let lengthError = $state<string | null>(null)
  let codeInput = $state<HTMLInputElement | undefined>(undefined)

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'enter'] as const
  const canSubmit = $derived(code.length >= MIN_PASSCODE_LENGTH)
  const displayError = $derived(error || lengthError)

  function addDigit(digit: string) {
    if (code.length >= MAX_PASSCODE_LENGTH) return
    code += digit
    lengthError = null
  }

  function removeDigit() {
    code = code.slice(0, -1)
    lengthError = null
  }

  function submit() {
    if (code.length < MIN_PASSCODE_LENGTH) {
      lengthError = t('passcodeTooShort', passcodeLengthParams)
      return
    }

    lengthError = null
    onComplete(code)
  }

  function handleKeyPress(key: (typeof keys)[number]) {
    if (key === 'del') {
      removeDigit()
      return
    }

    if (key === 'enter') {
      submit()
      return
    }

    addDigit(key)
  }

  function handleInput() {
    if (code.length > MAX_PASSCODE_LENGTH) {
      code = code.slice(0, MAX_PASSCODE_LENGTH)
    }
    lengthError = null
  }

  function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  async function focusInput() {
    if (!autoFocus) return
    await tick()
    codeInput?.focus()
  }

  $effect(() => {
    if (autoFocus) {
      void focusInput()
    }
  })

  export function reset() {
    code = ''
    lengthError = null
    void focusInput()
  }
</script>

<div class="passcode-pad">
  <div class="header">
    <div class="title-row">
      <h3>{title}</h3>
      <div class="header-actions">
        {#if showAutoFocusToggle}
          <button
            type="button"
            class="focus-toggle-btn"
            class:active={passcodeFocusState.enabled}
            onclick={togglePasscodeAutoFocus}
            aria-label={t('passcodeAutoFocus')}
            aria-pressed={passcodeFocusState.enabled}
            title={t('passcodeAutoFocus')}
          >
            <svg class="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="3"
                y="6"
                width="18"
                height="12"
                rx="2"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M8 10v4M8 10h3M8 14h3"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        {/if}
        {#if onCancel}
          <button type="button" class="cancel-btn" onclick={onCancel} aria-label={t('cancel')}>
            <svg class="cancel-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        {/if}
      </div>
    </div>
    {#if subtitle}
      <p>{subtitle}</p>
    {/if}
  </div>

  <div class="code-field">
    <input
      type="password"
      class="code-input"
      bind:this={codeInput}
      bind:value={code}
      maxlength={MAX_PASSCODE_LENGTH}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label={title}
      oninput={handleInput}
      onkeydown={handleInputKeydown}
    />
    <p class="length-hint">
      {t('passcodeLengthHint', {
        current: code.length,
        min: MIN_PASSCODE_LENGTH,
        max: MAX_PASSCODE_LENGTH,
      })}
    </p>
  </div>

  {#if displayError}
    <p class="error" role="alert">{displayError}</p>
  {/if}

  <div class="pad">
    {#each keys as key}
      {#if key === 'del'}
        <button type="button" class="pad-key action" onclick={() => handleKeyPress(key)} aria-label="Delete">
          ⌫
        </button>
      {:else if key === 'enter'}
        <button
          type="button"
          class="pad-key action enter"
          class:ready={canSubmit}
          disabled={!canSubmit}
          onclick={() => handleKeyPress(key)}
          aria-label={t('submitPasscode')}
        >
          ↵
        </button>
      {:else}
        <button type="button" class="pad-key" onclick={() => handleKeyPress(key)}>
          {key}
        </button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .passcode-pad {
    width: min(100%, 320px);
    margin: 0 auto;
    text-align: center;
  }

  .header {
    margin-bottom: 1.25rem;
  }

  .title-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .title-row h3 {
    grid-column: 2;
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text);
  }

  .header-actions {
    grid-column: 3;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    justify-self: end;
  }

  .focus-toggle-btn {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    opacity: 0.45;
    cursor: pointer;
    transition: color 0.2s, opacity 0.2s, background 0.2s;
    flex-shrink: 0;
  }

  .focus-toggle-btn:hover {
    opacity: 0.75;
    background: rgba(120, 113, 108, 0.1);
    color: var(--text);
  }

  .focus-toggle-btn.active {
    color: var(--accent);
    opacity: 1;
  }

  .focus-toggle-btn.active:hover {
    background: rgba(245, 158, 11, 0.12);
    color: var(--accent);
  }

  :global([data-theme='dark']) .focus-toggle-btn:hover:not(.active) {
    background: rgba(255, 255, 255, 0.08);
  }

  .toggle-icon {
    width: 18px;
    height: 18px;
  }

  .cancel-btn {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.2s, background 0.2s;
    flex-shrink: 0;
  }

  .cancel-btn:hover {
    background: rgba(120, 113, 108, 0.1);
    color: var(--text);
  }

  :global([data-theme='dark']) .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .cancel-icon {
    width: 18px;
    height: 18px;
  }

  .header p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .code-field {
    margin-bottom: 0.75rem;
  }

  .code-input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.85rem 1rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
    color: var(--text);
    font-size: 1.1rem;
    letter-spacing: 0.12em;
    text-align: center;
  }

  .code-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--input-focus-ring);
  }

  .length-hint {
    margin: 0.45rem 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .error {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: var(--danger);
  }

  .pad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.85rem;
    padding: 0 0.5rem;
  }

  .pad-key {
    width: 72px;
    height: 72px;
    margin: 0 auto;
    border: none;
    border-radius: 999px;
    background: rgba(120, 113, 108, 0.12);
    color: var(--text);
    font-size: 1.75rem;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, opacity 0.15s;
  }

  :global([data-theme='dark']) .pad-key {
    background: rgba(255, 255, 255, 0.08);
  }

  .pad-key:hover:not(:disabled) {
    background: rgba(120, 113, 108, 0.2);
  }

  :global([data-theme='dark']) .pad-key:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
  }

  .pad-key:active:not(:disabled) {
    transform: scale(0.96);
  }

  .pad-key.action {
    font-size: 1.35rem;
    background: transparent;
  }

  .pad-key.action:hover:not(:disabled) {
    background: rgba(120, 113, 108, 0.1);
  }

  .pad-key.enter {
    font-size: 1.55rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .pad-key.enter.ready {
    color: var(--accent);
    background: rgba(245, 158, 11, 0.12);
  }

  .pad-key.enter.ready:hover:not(:disabled) {
    background: rgba(245, 158, 11, 0.2);
  }

  :global([data-theme='dark']) .pad-key.enter.ready {
    background: rgba(245, 158, 11, 0.16);
  }

  .pad-key:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
</style>