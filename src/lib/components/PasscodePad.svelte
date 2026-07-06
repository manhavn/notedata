<script lang="ts">
  import { t } from '../i18n.svelte'
  import { MAX_PASSCODE_LENGTH, MIN_PASSCODE_LENGTH } from '../passcode'

  interface Props {
    title: string
    subtitle?: string
    error?: string | null
    onComplete: (code: string) => void
    onCancel?: () => void
  }

  let { title, subtitle = '', error = null, onComplete, onCancel }: Props = $props()

  let code = $state('')
  let lengthError = $state<string | null>(null)

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
      lengthError = t('passcodeTooShort')
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

  export function reset() {
    code = ''
    lengthError = null
  }
</script>

<div class="passcode-pad">
  <div class="header">
    {#if onCancel}
      <button type="button" class="cancel-btn" onclick={onCancel}>×</button>
    {/if}
    <h3>{title}</h3>
    {#if subtitle}
      <p>{subtitle}</p>
    {/if}
  </div>

  <div class="code-field">
    <input
      type="password"
      class="code-input"
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
    position: relative;
    margin-bottom: 1.25rem;
  }

  .cancel-btn {
    position: absolute;
    top: -0.25rem;
    right: 0;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
  }

  .header h3 {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text);
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