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

  <div class="theme-toggle" role="group" aria-label={t('darkMode')}>
    <button
      type="button"
      class:active={themeState.mode === 'light'}
      onclick={() => setTheme('light')}
      aria-label={t('lightMode')}
      title={t('lightMode')}
    >
      <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
    <button
      type="button"
      class:active={themeState.mode === 'dark'}
      onclick={() => setTheme('dark')}
      aria-label={t('darkMode')}
      title={t('darkMode')}
    >
      <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
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

  .theme-toggle {
    display: flex;
    padding: 0.2rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
  }

  .theme-toggle button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
  }

  .theme-toggle button.active {
    background: var(--surface);
    color: var(--accent);
    box-shadow: var(--shadow-sm);
  }

  .theme-icon {
    width: 16px;
    height: 16px;
  }
</style>