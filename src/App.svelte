<script lang="ts">
  import { authState, userNeedsEmailVerification } from './lib/auth.svelte'
  import './lib/user-settings.svelte'
  import './lib/ai-providers.svelte'
  import './lib/ai-api-keys.svelte'
  import { t } from './lib/i18n.svelte'
  import DialogModal from './lib/components/DialogModal.svelte'
  import ToastContainer from './lib/components/ToastContainer.svelte'

  const pendingEmailVerification = $derived.by(() => {
    void authState.profileTick
    return authState.user ? userNeedsEmailVerification(authState.user) : false
  })
</script>

{#if authState.loading}
  <div class="loading">
    <div class="spinner"></div>
    <p>{t('loading')}</p>
  </div>
{:else if authState.user}
  {#if pendingEmailVerification}
    {#await import('./lib/components/EmailVerificationScreen.svelte')}
      <div class="loading">
        <div class="spinner"></div>
        <p>{t('loading')}</p>
      </div>
    {:then { default: EmailVerificationScreen }}
      <EmailVerificationScreen />
    {/await}
  {:else}
    {#await import('./lib/components/NotesApp.svelte')}
      <div class="loading">
        <div class="spinner"></div>
        <p>{t('loading')}</p>
      </div>
    {:then { default: NotesApp }}
      <NotesApp />
    {/await}
  {/if}
{:else}
  {#await import('./lib/components/AuthPage.svelte')}
    <div class="loading">
      <div class="spinner"></div>
      <p>{t('loading')}</p>
    </div>
  {:then { default: AuthPage }}
    <AuthPage />
  {/await}
{/if}

<DialogModal />
<ToastContainer />

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