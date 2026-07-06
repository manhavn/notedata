<script lang="ts">
  import {
    authState,
    logout,
    refreshEmailVerificationStatus,
    resendEmailVerification,
  } from '../auth.svelte'
  import { t } from '../i18n.svelte'
  import LocaleThemeControls from './LocaleThemeControls.svelte'

  let resending = $state(false)
  let checking = $state(false)
  let resendSuccess = $state(false)
  let checkSuccess = $state(false)
  let localError = $state<string | null>(null)

  const userEmail = $derived(authState.user?.email ?? '')

  async function handleResend() {
    resending = true
    resendSuccess = false
    localError = null
    authState.error = null

    try {
      await resendEmailVerification()
      resendSuccess = true
    } catch {
      localError = authState.error ?? t('authErrorGeneric')
    } finally {
      resending = false
    }
  }

  async function handleCheckStatus() {
    checking = true
    localError = null
    checkSuccess = false
    authState.error = null

    try {
      const verified = await refreshEmailVerificationStatus()
      if (verified) {
        checkSuccess = true
      } else {
        localError = t('emailVerificationStillPending')
      }
    } catch {
      localError = authState.error ?? t('authErrorGeneric')
    } finally {
      checking = false
    }
  }

  async function handleLogout() {
    await logout()
  }
</script>

<div class="verify-page">
  <div class="verify-toolbar">
    <LocaleThemeControls />
  </div>

  <div class="verify-card">
    <div class="brand">
      <div class="logo">✉</div>
      <h1>{t('emailVerificationTitle')}</h1>
      <p>{t('emailVerificationHint', { email: userEmail })}</p>
    </div>

    {#if checkSuccess}
      <p class="success" role="status">{t('emailVerificationSuccess')}</p>
    {:else if resendSuccess}
      <p class="success" role="status">{t('emailVerificationResent')}</p>
    {/if}

    {#if localError}
      <p class="error" role="alert">{localError}</p>
    {/if}

    <div class="actions">
      <button type="button" class="primary-btn" onclick={handleResend} disabled={resending || checking}>
        {resending ? t('processing') : t('resendVerificationEmail')}
      </button>
      <button type="button" class="secondary-btn" onclick={handleCheckStatus} disabled={resending || checking}>
        {checking ? t('processing') : t('checkVerificationStatus')}
      </button>
      <button type="button" class="ghost-btn" onclick={handleLogout}>
        {t('logout')}
      </button>
    </div>
  </div>
</div>

<style>
  .verify-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background:
      radial-gradient(circle at 20% 20%, rgba(245, 158, 11, 0.12), transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1), transparent 40%),
      var(--bg);
  }

  .verify-toolbar {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 20;
  }

  .verify-card {
    width: min(100%, 480px);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: var(--shadow-lg);
  }

  .brand {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .logo {
    width: 56px;
    height: 56px;
    margin: 0 auto 1rem;
    border-radius: 16px;
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
    font-size: 1.5rem;
    display: grid;
    place-items: center;
  }

  .brand h1 {
    margin: 0 0 0.75rem;
    font-size: 1.5rem;
    color: var(--text);
  }

  .brand p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .primary-btn,
  .secondary-btn,
  .ghost-btn {
    width: 100%;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, background 0.2s, border-color 0.2s;
  }

  .primary-btn {
    border: none;
    background: linear-gradient(135deg, var(--accent), #f97316);
    color: #fff;
  }

  .secondary-btn {
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
  }

  .secondary-btn:hover:not(:disabled) {
    background: var(--surface);
  }

  .ghost-btn {
    border: none;
    background: transparent;
    color: var(--text-muted);
  }

  .ghost-btn:hover:not(:disabled) {
    color: var(--text);
  }

  .primary-btn:disabled,
  .secondary-btn:disabled,
  .ghost-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .error {
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    background: var(--danger-bg);
    color: var(--danger);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .success {
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    background: var(--success-bg);
    color: var(--success);
    font-size: 0.875rem;
    line-height: 1.5;
  }
</style>