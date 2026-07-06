<script lang="ts">
  interface Props {
    title: string
    subtitle?: string
    error?: string | null
    onComplete: (code: string) => void
    onCancel?: () => void
  }

  let { title, subtitle = '', error = null, onComplete, onCancel }: Props = $props()

  const PASSCODE_LENGTH = 6
  let digits = $state<string[]>([])

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

  function addDigit(digit: string) {
    if (digits.length >= PASSCODE_LENGTH) return
    digits = [...digits, digit]
    if (digits.length === PASSCODE_LENGTH) {
      onComplete(digits.join(''))
    }
  }

  function removeDigit() {
    digits = digits.slice(0, -1)
  }

  function handleKeyPress(key: (typeof keys)[number]) {
    if (key === '') return
    if (key === 'del') {
      removeDigit()
      return
    }
    addDigit(key)
  }

  export function reset() {
    digits = []
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

  <div class="dots" aria-hidden="true">
    {#each Array(PASSCODE_LENGTH) as _, index}
      <span class="dot" class:filled={index < digits.length}></span>
    {/each}
  </div>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  <div class="pad">
    {#each keys as key}
      {#if key === ''}
        <span class="pad-spacer"></span>
      {:else if key === 'del'}
        <button type="button" class="pad-key action" onclick={() => handleKeyPress(key)} aria-label="Delete">
          ⌫
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
    margin-bottom: 1.75rem;
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

  .dots {
    display: flex;
    justify-content: center;
    gap: 0.85rem;
    margin-bottom: 1rem;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    border: 1.5px solid var(--text-muted);
    transition: all 0.15s ease;
  }

  .dot.filled {
    background: var(--text);
    border-color: var(--text);
    transform: scale(1.05);
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

  .pad-spacer {
    display: block;
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
    transition: background 0.15s, transform 0.1s;
  }

  :global([data-theme='dark']) .pad-key {
    background: rgba(255, 255, 255, 0.08);
  }

  .pad-key:hover {
    background: rgba(120, 113, 108, 0.2);
  }

  :global([data-theme='dark']) .pad-key:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  .pad-key:active {
    transform: scale(0.96);
  }

  .pad-key.action {
    font-size: 1.35rem;
    background: transparent;
  }

  .pad-key.action:hover {
    background: rgba(120, 113, 108, 0.1);
  }
</style>