<script lang="ts">
  import { localeState, setLocale, t } from '../i18n.svelte'
  import { themeState, setTheme } from '../theme.svelte'
  import type { Locale } from '../i18n/translations'

  function selectLocale(locale: Locale) {
    setLocale(locale)
  }
</script>

<div class="controls">
  <div class="lang-toggle" role="group" aria-label="Language">
    <button
      type="button"
      class:active={localeState.locale === 'en'}
      onclick={() => selectLocale('en')}
    >
      EN
    </button>
    <button
      type="button"
      class:active={localeState.locale === 'vi'}
      onclick={() => selectLocale('vi')}
    >
      VI
    </button>
  </div>

  <label class="theme-switch" title={t('darkMode')}>
    <input
      type="checkbox"
      checked={themeState.mode === 'dark'}
      onchange={() => setTheme(themeState.mode === 'dark' ? 'light' : 'dark')}
    />
    <span class="slider" aria-hidden="true"></span>
  </label>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .lang-toggle {
    display: flex;
    padding: 0.2rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
  }

  .lang-toggle button {
    min-width: 34px;
    padding: 0.3rem 0.45rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .lang-toggle button.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  .theme-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 44px;
    height: 24px;
    cursor: pointer;
  }

  .theme-switch input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: var(--border);
    transition: background 0.2s;
  }

  .slider::before {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s;
  }

  .theme-switch input:checked + .slider {
    background: linear-gradient(135deg, var(--accent), #f97316);
  }

  .theme-switch input:checked + .slider::before {
    transform: translateX(20px);
  }
</style>