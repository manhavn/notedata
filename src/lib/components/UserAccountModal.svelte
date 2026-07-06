<script lang="ts">
  import { untrack } from 'svelte'
  import {
    addAccountPassword,
    authState,
    changeAccountPassword,
    getUserDisplayLabel,
    logout,
    saveDisplayName,
    userHasGoogleProvider,
    userHasPasswordProvider,
  } from '../auth.svelte'
  import { t } from '../i18n.svelte'

  interface Props {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  let displayName = $state('')
  let currentPassword = $state('')
  let newPassword = $state('')
  let confirmPassword = $state('')
  let profileError = $state<string | null>(null)
  let profileSuccess = $state<string | null>(null)
  let passwordError = $state<string | null>(null)
  let passwordSuccess = $state<string | null>(null)
  let savingProfile = $state(false)
  let savingPassword = $state(false)

  const user = $derived(authState.user)
  const hasPassword = $derived(user ? userHasPasswordProvider(user) : false)
  const hasGoogle = $derived(user ? userHasGoogleProvider(user) : false)
  const topbarPreview = $derived(getUserDisplayLabel(user, authState.profileTick))

  $effect(() => {
    if (!open) return
    untrack(() => {
      displayName = user?.displayName?.trim() ?? ''
      currentPassword = ''
      newPassword = ''
      confirmPassword = ''
      profileError = null
      profileSuccess = null
      passwordError = null
      passwordSuccess = null
    })
  })

  function handleClose() {
    onClose()
  }

  async function handleLogout() {
    handleClose()
    await logout()
  }

  async function handleSaveDisplayName() {
    profileError = null
    profileSuccess = null
    savingProfile = true

    try {
      await saveDisplayName(displayName)
      profileSuccess = t('displayNameSaved')
    } catch {
      profileError = authState.error ?? t('authErrorGeneric')
    } finally {
      savingProfile = false
    }
  }

  async function handleSavePassword() {
    passwordError = null
    passwordSuccess = null

    if (newPassword.length < 6) {
      passwordError = t('authWeakPassword')
      return
    }

    if (newPassword !== confirmPassword) {
      passwordError = t('passwordMismatch')
      return
    }

    savingPassword = true

    try {
      if (hasPassword) {
        await changeAccountPassword(currentPassword, newPassword)
        passwordSuccess = t('passwordChanged')
      } else {
        await addAccountPassword(newPassword)
        passwordSuccess = t('passwordAdded')
      }
      currentPassword = ''
      newPassword = ''
      confirmPassword = ''
    } catch {
      passwordError = authState.error ?? t('authErrorGeneric')
    } finally {
      savingPassword = false
    }
  }
</script>

{#if open && user}
  <button type="button" class="overlay" aria-label={t('closeMenu')} onclick={handleClose}></button>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
    <div class="modal-header">
      <h2 id="account-modal-title">{t('accountSettings')}</h2>
      <button type="button" class="close-btn" onclick={handleClose} aria-label={t('cancel')}>
        <svg class="close-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M18 6L6 18M6 6l12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <section class="profile-card">
      <div class="avatar" aria-hidden="true">
        {#if user.photoURL}
          <img src={user.photoURL} alt="" />
        {:else}
          <svg viewBox="0 0 24 24">
            <path
              d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        {/if}
      </div>
      <div class="profile-meta">
        <strong class="profile-name">{topbarPreview}</strong>
        <span class="profile-email">{user.email}</span>
      </div>
    </section>

    <section class="section">
      <h3>{t('signInMethods')}</h3>
      <div class="method-list">
        {#if hasGoogle}
          <span class="method-chip google">{t('signInGoogleMethod')}</span>
        {/if}
        {#if hasPassword}
          <span class="method-chip password">{t('signInPasswordMethod')}</span>
        {/if}
      </div>
    </section>

    <section class="section">
      <h3>{t('displayName')}</h3>
      <p class="hint">{t('displayNameHint')}</p>
      <label class="field">
        <input
          type="text"
          bind:value={displayName}
          placeholder={t('displayNamePlaceholder')}
          maxlength="64"
          autocomplete="name"
        />
      </label>
      {#if profileError}
        <p class="error">{profileError}</p>
      {/if}
      {#if profileSuccess}
        <p class="success">{profileSuccess}</p>
      {/if}
      <button
        type="button"
        class="primary-btn"
        onclick={handleSaveDisplayName}
        disabled={savingProfile}
      >
        {savingProfile ? t('saving') : t('save')}
      </button>
    </section>

    <section class="section">
      <h3>{hasPassword ? t('changePassword') : t('addPassword')}</h3>
      <p class="hint">{hasPassword ? t('changePasswordHint') : t('addPasswordHint')}</p>

      {#if hasPassword}
        <label class="field">
          <span>{t('currentPassword')}</span>
          <input
            type="password"
            bind:value={currentPassword}
            autocomplete="current-password"
          />
        </label>
      {/if}

      <label class="field">
        <span>{t('newPassword')}</span>
        <input type="password" bind:value={newPassword} autocomplete="new-password" />
      </label>

      <label class="field">
        <span>{t('confirmNewPassword')}</span>
        <input type="password" bind:value={confirmPassword} autocomplete="new-password" />
      </label>

      {#if passwordError}
        <p class="error">{passwordError}</p>
      {/if}
      {#if passwordSuccess}
        <p class="success">{passwordSuccess}</p>
      {/if}

      <button
        type="button"
        class="primary-btn"
        onclick={handleSavePassword}
        disabled={savingPassword}
      >
        {savingPassword ? t('processing') : hasPassword ? t('changePassword') : t('addPassword')}
      </button>
    </section>

    <section class="section logout-section">
      <button type="button" class="logout-btn" onclick={handleLogout}>
        <svg class="logout-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {t('logout')}
      </button>
    </section>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    border: none;
    background: var(--overlay);
    z-index: 30;
    cursor: pointer;
  }

  .modal {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(94vw, 560px);
    max-height: 90vh;
    overflow-y: auto;
    padding: 1.75rem;
    border: 1px solid var(--border);
    border-radius: 22px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    z-index: 31;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.35rem;
  }

  .close-btn {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: var(--bg);
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.2s, background 0.2s;
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: var(--surface);
    color: var(--text);
  }

  .close-icon {
    width: 18px;
    height: 18px;
  }

  .profile-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.1rem;
    margin-bottom: 1.25rem;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--bg);
  }

  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(245, 158, 11, 0.12);
    color: var(--accent);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar svg {
    width: 34px;
    height: 34px;
  }

  .profile-meta {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .profile-name {
    font-size: 1.05rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profile-email {
    font-size: 0.9rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .section {
    padding-top: 1.1rem;
    margin-top: 1.1rem;
    border-top: 1px solid var(--border);
  }

  .section h3 {
    margin: 0 0 0.45rem;
    font-size: 1rem;
  }

  .hint {
    margin: 0 0 0.85rem;
    color: var(--text-muted);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .method-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .method-chip {
    padding: 0.3rem 0.65rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .method-chip.google {
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
  }

  .method-chip.password {
    background: rgba(245, 158, 11, 0.12);
    color: var(--accent);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.85rem;
  }

  .field span {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .field input {
    width: 100%;
    padding: 0.7rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
  }

  .field input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--input-focus-ring);
  }

  .primary-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .primary-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .error {
    margin: 0 0 0.75rem;
    color: var(--danger);
    font-size: 0.88rem;
  }

  .success {
    margin: 0 0 0.75rem;
    color: var(--success);
    font-size: 0.88rem;
  }

  .logout-section {
    padding-bottom: 0;
  }

  .logout-btn {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.08);
    color: var(--danger);
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .logout-btn:hover {
    background: rgba(239, 68, 68, 0.14);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .logout-icon {
    width: 18px;
    height: 18px;
  }
</style>