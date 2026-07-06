<script lang="ts">
  import { t } from '../i18n.svelte'

  interface Props {
    value?: string
    placeholder?: string
    autocomplete?: 'current-password' | 'new-password' | 'off'
    minlength?: number
    required?: boolean
    onkeydown?: (event: KeyboardEvent) => void
  }

  let {
    value = $bindable(''),
    placeholder = '',
    autocomplete,
    minlength,
    required = false,
    onkeydown,
  }: Props = $props()

  let visible = $state(false)

  function toggleVisibility() {
    visible = !visible
  }
</script>

<div class="password-input">
  <input
    type={visible ? 'text' : 'password'}
    bind:value
    {placeholder}
    autocomplete={autocomplete}
    minlength={minlength}
    {required}
    {onkeydown}
  />
  <button
    type="button"
    class="toggle-btn"
    onclick={toggleVisibility}
    aria-label={visible ? t('hidePassword') : t('showPassword')}
    aria-pressed={visible}
  >
    {#if visible}
      <svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M1 1l22 22"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    {:else}
      <svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
      </svg>
    {/if}
  </button>
</div>

<style>
  .password-input {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    width: 100%;
    padding: 0.75rem 2.75rem 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--input-focus-ring);
  }

  .toggle-btn {
    position: absolute;
    right: 0.35rem;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.2s, background 0.2s;
  }

  .toggle-btn:hover {
    color: var(--text);
    background: var(--surface);
  }

  .eye-icon {
    width: 18px;
    height: 18px;
  }
</style>