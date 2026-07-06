<script lang="ts">
  import { authState } from './lib/auth.svelte'
  import { t } from './lib/i18n.svelte'
  import AuthPage from './lib/components/AuthPage.svelte'
  import NotesApp from './lib/components/NotesApp.svelte'
</script>

{#if authState.loading}
  <div class="loading">
    <div class="spinner"></div>
    <p>{t('loading')}</p>
  </div>
{:else if authState.user}
  <NotesApp />
{:else}
  <AuthPage />
{/if}

<style>
  .loading {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    background: var(--bg);
    color: var(--text-muted);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>