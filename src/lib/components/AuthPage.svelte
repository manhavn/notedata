<script lang="ts">
  import {
    authFeatures,
    authState,
    login,
    loginWithGoogle,
    register,
    requestPasswordReset,
  } from '../auth.svelte'
  import { t } from '../i18n.svelte'
  import LocaleThemeControls from './LocaleThemeControls.svelte'
  import PasswordInput from './PasswordInput.svelte'

  let mode = $state<'login' | 'register' | 'reset'>('login')
  let email = $state('')
  let password = $state('')
  let confirmPassword = $state('')
  let submitting = $state(false)
  let googleSubmitting = $state(false)
  let resetSubmitting = $state(false)
  let resetSuccess = $state(false)

  const showRegisterTab = $derived(!authFeatures.disableSignupEmailPassword)
  const showGoogleAuth = $derived(
    mode === 'login' || !authFeatures.disableSignupGoogle,
  )
  const showForgotPassword = $derived(
    mode === 'login' && !authFeatures.disableForgotPassword,
  )

  $effect(() => {
    if (mode === 'reset' && authFeatures.disableForgotPassword) {
      mode = 'login'
    }
    if (mode === 'register' && authFeatures.disableSignupEmailPassword) {
      mode = 'login'
    }
  })

  function openResetMode() {
    if (authFeatures.disableForgotPassword) return
    mode = 'reset'
    authState.error = null
    resetSuccess = false
    password = ''
    confirmPassword = ''
  }

  function openAuthMode(nextMode: 'login' | 'register') {
    if (nextMode === 'register' && authFeatures.disableSignupEmailPassword) return
    mode = nextMode
    authState.error = null
    resetSuccess = false
    confirmPassword = ''
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return

    if (mode === 'register') {
      if (authFeatures.disableSignupEmailPassword) return
      if (!confirmPassword) return
      if (password !== confirmPassword) {
        authState.error = t('registerPasswordMismatch')
        return
      }
    }

    authState.error = null
    submitting = true
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password)
      }
    } catch {
      // Error is handled in auth store
    } finally {
      submitting = false
    }
  }

  async function handleResetSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (!email.trim()) return

    resetSubmitting = true
    resetSuccess = false
    authState.error = null

    try {
      await requestPasswordReset(email.trim())
      resetSuccess = true
    } catch {
      // Error is handled in auth store
    } finally {
      resetSubmitting = false
    }
  }

  async function handleGoogleAuth() {
    if (mode === 'register' && authFeatures.disableSignupGoogle) return
    googleSubmitting = true
    try {
      await loginWithGoogle(mode === 'register' ? 'signup' : 'login')
    } catch {
      // Error is handled in auth store
    } finally {
      googleSubmitting = false
    }
  }

  function handleFormKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter') return
    const target = e.target
    if (!(target instanceof HTMLInputElement)) return

    e.preventDefault()
    target.form?.requestSubmit()
  }
</script>

<div class="auth-page">
  <div class="auth-toolbar">
    <LocaleThemeControls />
  </div>

  <div class="auth-card">
    <div class="brand">
      <div class="logo">N</div>
      <h1>{t('appName')}</h1>
      <p>{t('appTagline')}</p>
    </div>

    {#if mode === 'reset' && !authFeatures.disableForgotPassword}
      <h2 class="reset-title">{t('resetPassword')}</h2>
      <p class="reset-hint">{t('resetPasswordHint')}</p>

      <form onsubmit={handleResetSubmit}>
        <label>
          <span>{t('email')}</span>
          <input
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            autocomplete="email"
            required
            onkeydown={handleFormKeydown}
          />
        </label>

        {#if resetSuccess}
          <p class="success" role="status">{t('resetPasswordSent')}</p>
        {/if}

        {#if authState.error}
          <p class="error" role="alert">{authState.error}</p>
        {/if}

        <button type="submit" class="submit" disabled={resetSubmitting}>
          {resetSubmitting ? t('processing') : t('resetPassword')}
        </button>

        <button type="button" class="link-btn back-btn" onclick={() => openAuthMode('login')}>
          {t('backToLogin')}
        </button>
      </form>
    {:else}
      {#if showRegisterTab}
        <div class="tabs">
          <button
            type="button"
            class:active={mode === 'login'}
            onclick={() => openAuthMode('login')}
          >
            {t('login')}
          </button>
          <button
            type="button"
            class:active={mode === 'register'}
            onclick={() => openAuthMode('register')}
          >
            {t('register')}
          </button>
        </div>
      {/if}

      {#if showGoogleAuth}
        <button
          type="button"
          class="google-btn"
          onclick={handleGoogleAuth}
          disabled={submitting || googleSubmitting}
        >
          <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {googleSubmitting
            ? t('processing')
            : mode === 'login'
              ? t('signInGoogle')
              : t('signUpGoogle')}
        </button>

        <div class="divider">
          <span>{t('or')}</span>
        </div>
      {/if}

      <form onsubmit={handleSubmit}>
        <label>
          <span>{t('email')}</span>
          <input
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            autocomplete="email"
            required
            onkeydown={handleFormKeydown}
          />
        </label>

        <label>
          <span>{t('password')}</span>
          {#key mode}
            <PasswordInput
              bind:value={password}
              placeholder="••••••••"
              autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
              minlength={6}
              required
              onkeydown={handleFormKeydown}
            />
          {/key}
        </label>

        {#if mode === 'register'}
          <label>
            <span>{t('confirmPassword')}</span>
            <PasswordInput
              bind:value={confirmPassword}
              placeholder="••••••••"
              autocomplete="new-password"
              minlength={6}
              required
              onkeydown={handleFormKeydown}
            />
          </label>
        {/if}

        {#if authState.error}
          <p class="error" role="alert">{authState.error}</p>
        {/if}

        <button type="submit" class="submit" disabled={submitting || googleSubmitting}>
          {submitting ? t('processing') : mode === 'login' ? t('login') : t('createAccount')}
        </button>

        {#if showForgotPassword}
          <button type="button" class="link-btn forgot-btn" onclick={openResetMode}>
            {t('forgotPassword')}
          </button>
        {/if}
      </form>
    {/if}
  </div>

  <a
    class="source-link"
    href="https://github.com/manhavn/notedata"
    target="_blank"
    rel="noopener noreferrer"
  >
    {t('sourceCode')}
  </a>
</div>

<style>
  .auth-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background:
      radial-gradient(circle at 20% 20%, rgba(245, 158, 11, 0.12), transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1), transparent 40%),
      var(--bg);
  }

  .auth-toolbar {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 20;
  }

  .auth-card {
    width: min(100%, 420px);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: var(--shadow-lg);
  }

  .brand {
    text-align: center;
    margin-bottom: 2rem;
  }

  .logo {
    width: 56px;
    height: 56px;
    margin: 0 auto 1rem;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--accent), #f97316);
    color: white;
    font-size: 1.75rem;
    font-weight: 700;
    display: grid;
    place-items: center;
  }

  .brand h1 {
    margin: 0 0 0.5rem;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text);
  }

  .brand p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .reset-title {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
    color: var(--text);
  }

  .reset-hint {
    margin: 0 0 1.25rem;
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.25rem;
    background: var(--bg);
    border-radius: 12px;
  }

  .tabs button {
    padding: 0.65rem 1rem;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--text-muted);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tabs button.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  .google-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .google-btn:hover:not(:disabled) {
    background: var(--bg);
  }

  .google-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .google-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1.25rem 0;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  label span {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text);
  }

  .link-btn {
    border: none;
    background: transparent;
    color: var(--accent);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    text-align: right;
  }

  .link-btn:hover {
    text-decoration: underline;
  }

  .back-btn,
  .forgot-btn {
    width: 100%;
    text-align: center;
    margin-top: 0.25rem;
    font-size: 0.9rem;
  }

  input {
    padding: 0.75rem 1rem;
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

  .error {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    background: var(--danger-bg);
    color: var(--danger);
    font-size: 0.875rem;
  }

  .success {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    background: var(--success-bg);
    color: var(--success);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .submit {
    margin-top: 0.5rem;
    padding: 0.85rem 1rem;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--accent), #f97316);
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
  }

  .submit:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .source-link {
    position: fixed;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s;
  }

  .source-link:hover {
    color: var(--accent);
    text-decoration: underline;
  }
</style>