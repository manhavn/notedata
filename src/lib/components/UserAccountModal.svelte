<script lang="ts">
  import { tick, untrack } from 'svelte'
  import { aiFeatures } from '../ai-features'
  import type { AccountModalFocusSection } from '../account-modal.svelte'
  import {
    addAccountPassword,
    authFeatures,
    authState,
    changeAccountPassword,
    getUserDisplayLabel,
    logout,
    refreshEmailVerificationStatus,
    requestEmailChange,
    resendEmailVerification,
    saveDisplayName,
    userHasGoogleProvider,
    userHasPasswordProvider,
    userNeedsEmailVerification,
    userShowsEmailVerificationStatus,
  } from '../auth.svelte'
  import { getApiKeyById } from '../ai-api-keys.svelte'
  import { getActiveModel, getActiveProvider } from '../ai-providers'
  import { aiChatSettingsState } from '../ai-providers.svelte'
  import { hasAiChatSettingsSaved } from '../ai-settings'
  import { countAiChatDrafts, draftAiChatStore, purgeAllAiChatDrafts } from '../draft-ai-chat'
  import { countNoteDrafts, draftContentStore, purgeAllNoteDrafts } from '../draft-content'
  import { clearUnlockedApiKey } from '../ai-api-keys.svelte'
  import { confirm } from '../dialog.svelte'
  import { exportUserSettings, importUserSettings, readSettingsFromFile } from '../settings-io'
  import { t } from '../i18n.svelte'
  import EditorAiSettings, { type AiSettingsModal } from './EditorAiSettings.svelte'
  import {
    saveUserAutoUnlockAfterSave,
    saveUserDisableAiChat,
    saveUserPersistAiChatLocal,
    saveUserPersistNoteDraftLocal,
    userSettingsState,
  } from '../user-settings.svelte'
  import { toastError, toastSuccess, toastWarning } from '../toast.svelte'
  import PasswordInput from './PasswordInput.svelte'

  interface Props {
    open: boolean
    focusSection?: AccountModalFocusSection
    onClose: () => void
  }

  let { open, focusSection = null, onClose }: Props = $props()

  let displayName = $state('')
  let newEmail = $state('')
  let emailCurrentPassword = $state('')
  let currentPassword = $state('')
  let newPassword = $state('')
  let confirmPassword = $state('')
  let savingProfile = $state(false)
  let savingEmail = $state(false)
  let savingPassword = $state(false)
  let resendingVerification = $state(false)
  let savingAiChat = $state(false)
  let savingAiChatHistoryLocal = $state(false)
  let savingNoteDraftLocal = $state(false)
  let savingAutoUnlockAfterSave = $state(false)
  let clearingAiChatDrafts = $state(false)
  let clearingNoteDrafts = $state(false)
  let aiChatDraftCount = $state(0)
  let noteDraftCount = $state(0)
  let aiChatSectionEl = $state<HTMLElement | undefined>(undefined)
  let aiChatSectionHighlight = $state(false)
  let globalAiModal = $state<AiSettingsModal>(null)
  let globalAiToolbarTick = $state(0)
  let exportingSettings = $state(false)
  let importingSettings = $state(false)
  let settingsImportInput = $state<HTMLInputElement | undefined>(undefined)

  const globalActiveProvider = $derived(getActiveProvider(aiChatSettingsState.settings))
  const globalActiveModel = $derived(getActiveModel(aiChatSettingsState.settings))
  const globalActiveApiKeyId = $derived(aiChatSettingsState.settings.activeApiKeyId)
  const globalDefaultsConfigured = $derived(hasAiChatSettingsSaved())
  const globalProviderButtonLabel = $derived(
    globalActiveProvider?.name?.trim() || t('aiProviderSelect'),
  )
  const globalModelButtonLabel = $derived(
    globalActiveModel?.label?.trim() || t('aiProviderModelsSection'),
  )
  const globalApiKeyButtonLabel = $derived.by(() => {
    void globalAiToolbarTick
    if (!globalActiveApiKeyId) return t('aiApiKeyNoneLabel')
    const key = getApiKeyById(globalActiveApiKeyId)
    return key?.label?.trim() || t('aiApiKeyNoneLabel')
  })

  const user = $derived(authState.user)
  const hasPassword = $derived(user ? userHasPasswordProvider(user) : false)
  const hasGoogle = $derived(user ? userHasGoogleProvider(user) : false)
  const needsVerification = $derived.by(() => {
    void authState.profileTick
    return user ? userNeedsEmailVerification(user) : false
  })
  const showsVerificationStatus = $derived(
    user ? userShowsEmailVerificationStatus(user) : false,
  )
  const topbarPreview = $derived(getUserDisplayLabel(user, authState.profileTick))

  function refreshDraftCounts() {
    aiChatDraftCount = countAiChatDrafts()
    noteDraftCount = countNoteDrafts()
  }

  $effect(() => {
    if (!open) return
    void $draftAiChatStore
    void $draftContentStore
    refreshDraftCounts()
  })

  $effect(() => {
    if (!open) return
    untrack(() => {
      displayName = user?.displayName?.trim() ?? ''
      newEmail = ''
      emailCurrentPassword = ''
      currentPassword = ''
      newPassword = ''
      confirmPassword = ''
    })
  })

  $effect(() => {
    if (!open || focusSection !== 'aiChat' || aiFeatures.disableAiChat) return

    void (async () => {
      await tick()
      aiChatSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      aiChatSectionHighlight = true
      if (!globalDefaultsConfigured) {
        globalAiModal = 'provider'
      }
      window.setTimeout(() => {
        aiChatSectionHighlight = false
      }, 1800)
    })()
  })

  function handleClose() {
    onClose()
  }

  async function handleLogout() {
    handleClose()
    await logout()
  }

  async function handleExportSettings() {
    const userId = user?.uid
    if (!userId) return

    exportingSettings = true
    try {
      await exportUserSettings(userId)
      toastSuccess(t('accountSettingsExportSuccess'))
    } catch {
      toastError(t('toastOperationFailed'))
    } finally {
      exportingSettings = false
    }
  }

  function triggerImportSettings() {
    settingsImportInput?.click()
  }

  async function handleImportSettingsFile(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''

    if (!file) return

    const userId = user?.uid
    if (!userId) return

    if (!(await confirm({
      title: t('accountSettingsImportTitle'),
      message: t('accountSettingsImportConfirm'),
      variant: 'default',
      confirmLabel: t('accountSettingsImport'),
    }))) {
      return
    }

    importingSettings = true
    try {
      const settings = await readSettingsFromFile(file)
      await importUserSettings(userId, settings)
      clearUnlockedApiKey()
      toastSuccess(t('accountSettingsImportSuccess'))
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('accountSettingsImportFailed'))
    } finally {
      importingSettings = false
    }
  }

  async function handleSaveDisplayName() {
    savingProfile = true

    try {
      await saveDisplayName(displayName)
      toastSuccess(t('displayNameSaved'))
    } catch {
      toastError(authState.error ?? t('authErrorGeneric'))
    } finally {
      savingProfile = false
    }
  }

  async function handleResendVerification() {
    resendingVerification = true

    try {
      await resendEmailVerification()
      toastSuccess(t('emailVerificationResent'))
    } catch {
      toastError(authState.error ?? t('authErrorGeneric'))
    } finally {
      resendingVerification = false
    }
  }

  async function handleRefreshVerification() {
    resendingVerification = true

    try {
      const verified = await refreshEmailVerificationStatus()
      if (verified) {
        toastSuccess(t('emailVerified'))
      } else {
        toastWarning(t('emailVerificationStillPending'))
      }
    } catch {
      toastError(authState.error ?? t('authErrorGeneric'))
    } finally {
      resendingVerification = false
    }
  }

  async function handleRequestEmailChange() {
    if (!newEmail.trim()) {
      toastError(t('authInvalidEmail'))
      return
    }

    if (hasPassword && !emailCurrentPassword) {
      toastError(t('authWrongCredentials'))
      return
    }

    savingEmail = true

    try {
      await requestEmailChange(
        newEmail,
        hasPassword ? emailCurrentPassword : undefined,
      )
      toastSuccess(t('emailChangeSent'))
      newEmail = ''
      emailCurrentPassword = ''
    } catch {
      toastError(authState.error ?? t('authErrorGeneric'))
    } finally {
      savingEmail = false
    }
  }

  async function handleToggleAiChat() {
    savingAiChat = true
    const nextDisabled = !userSettingsState.disableAiChat

    try {
      await saveUserDisableAiChat(nextDisabled)
      toastSuccess(nextDisabled ? t('accountAiChatDisabledSaved') : t('accountAiChatEnabledSaved'))
    } catch {
      toastError(t('toastOperationFailed'))
    } finally {
      savingAiChat = false
    }
  }

  async function handleTogglePersistAiChatLocal() {
    savingAiChatHistoryLocal = true
    const nextEnabled = !userSettingsState.persistAiChatLocal

    try {
      await saveUserPersistAiChatLocal(nextEnabled)
      toastSuccess(
        nextEnabled
          ? t('accountAiChatHistoryLocalEnabledSaved')
          : t('accountAiChatHistoryLocalDisabledSaved'),
      )
    } catch {
      toastError(t('toastOperationFailed'))
    } finally {
      savingAiChatHistoryLocal = false
    }
  }

  async function handleTogglePersistNoteDraftLocal() {
    savingNoteDraftLocal = true
    const nextEnabled = !userSettingsState.persistNoteDraftLocal

    try {
      await saveUserPersistNoteDraftLocal(nextEnabled)
      toastSuccess(
        nextEnabled
          ? t('accountNoteDraftLocalEnabledSaved')
          : t('accountNoteDraftLocalDisabledSaved'),
      )
    } catch {
      toastError(t('toastOperationFailed'))
    } finally {
      savingNoteDraftLocal = false
    }
  }

  async function handleToggleAutoUnlockAfterSave() {
    savingAutoUnlockAfterSave = true
    const nextEnabled = !userSettingsState.autoUnlockAfterSave

    try {
      await saveUserAutoUnlockAfterSave(nextEnabled)
      toastSuccess(
        nextEnabled
          ? t('accountAutoUnlockAfterSaveEnabledSaved')
          : t('accountAutoUnlockAfterSaveDisabledSaved'),
      )
    } catch {
      toastError(t('toastOperationFailed'))
    } finally {
      savingAutoUnlockAfterSave = false
    }
  }

  async function handleClearAiChatDrafts() {
    if (aiChatDraftCount === 0) return

    if (!(await confirm({
      message: t('accountAiChatHistoryClearConfirm', { count: aiChatDraftCount }),
      variant: 'warning',
      confirmLabel: t('accountAiChatHistoryClear'),
    }))) {
      return
    }

    clearingAiChatDrafts = true
    try {
      const cleared = purgeAllAiChatDrafts()
      refreshDraftCounts()
      toastSuccess(t('accountAiChatHistoryCleared', { count: cleared }))
    } catch {
      toastError(t('toastOperationFailed'))
    } finally {
      clearingAiChatDrafts = false
    }
  }

  async function handleClearNoteDrafts() {
    if (noteDraftCount === 0) return

    if (!(await confirm({
      message: t('accountNoteDraftClearConfirm', { count: noteDraftCount }),
      variant: 'warning',
      confirmLabel: t('accountNoteDraftClear'),
    }))) {
      return
    }

    clearingNoteDrafts = true
    try {
      const cleared = purgeAllNoteDrafts()
      refreshDraftCounts()
      toastSuccess(t('accountNoteDraftCleared', { count: cleared }))
    } catch {
      toastError(t('toastOperationFailed'))
    } finally {
      clearingNoteDrafts = false
    }
  }

  async function handleSavePassword() {
    if (newPassword.length < 6) {
      toastError(t('authWeakPassword'))
      return
    }

    if (newPassword !== confirmPassword) {
      toastError(t('passwordMismatch'))
      return
    }

    savingPassword = true

    try {
      if (hasPassword) {
        await changeAccountPassword(currentPassword, newPassword)
        toastSuccess(t('passwordChanged'))
      } else {
        await addAccountPassword(newPassword)
        toastSuccess(t('passwordAdded'))
      }
      currentPassword = ''
      newPassword = ''
      confirmPassword = ''
    } catch {
      toastError(authState.error ?? t('authErrorGeneric'))
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
        {#if showsVerificationStatus}
          <span class="verification-badge" class:verified={user.emailVerified}>
            {user.emailVerified ? t('emailVerified') : t('emailNotVerified')}
          </span>
        {/if}
      </div>
    </section>

    {#if needsVerification}
      <section class="verification-banner">
        <p>{t('emailVerificationHint', { email: user.email ?? '' })}</p>
        <div class="verification-actions">
          <button
            type="button"
            class="secondary-btn"
            onclick={handleResendVerification}
            disabled={resendingVerification}
          >
            {resendingVerification ? t('processing') : t('resendVerificationEmail')}
          </button>
          <button
            type="button"
            class="secondary-btn"
            onclick={handleRefreshVerification}
            disabled={resendingVerification}
          >
            {resendingVerification ? t('processing') : t('checkVerificationStatus')}
          </button>
        </div>
      </section>
    {/if}

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
      <button
        type="button"
        class="primary-btn"
        onclick={handleSaveDisplayName}
        disabled={savingProfile}
      >
        {savingProfile ? t('saving') : t('save')}
      </button>
    </section>

    {#if !authFeatures.disableChangeEmail}
      <section class="section">
        <h3>{t('changeEmail')}</h3>
        <p class="hint">{t('changeEmailHint')}</p>

        <label class="field">
          <span>{t('currentEmail')}</span>
          <input type="email" value={user.email ?? ''} readonly />
        </label>

        <label class="field">
          <span>{t('newEmail')}</span>
          <input
            type="email"
            bind:value={newEmail}
            placeholder={t('newEmailPlaceholder')}
            autocomplete="email"
          />
        </label>

        {#if hasPassword}
          <label class="field">
            <span>{t('currentPassword')}</span>
            <PasswordInput bind:value={emailCurrentPassword} autocomplete="current-password" />
          </label>
        {:else if hasGoogle}
          <p class="hint reauth-hint">{t('changeEmailGoogleReauthHint')}</p>
        {/if}

        <button
          type="button"
          class="primary-btn"
          onclick={handleRequestEmailChange}
          disabled={savingEmail}
        >
          {savingEmail ? t('processing') : t('changeEmail')}
        </button>
      </section>
    {/if}

    {#if !aiFeatures.disableAiChat}
      <section
        id="account-ai-chat-settings"
        class="section"
        class:section-highlight={aiChatSectionHighlight}
        bind:this={aiChatSectionEl}
      >
        <h3>{t('accountAiChatSection')}</h3>
        <p class="hint">{t('accountAiChatHint')}</p>
        <label class="ai-toggle-row">
          <span class="ai-toggle-copy">
            <strong>{userSettingsState.disableAiChat ? t('accountAiChatOff') : t('accountAiChatOn')}</strong>
            <span>{userSettingsState.disableAiChat ? t('accountAiChatOffHint') : t('accountAiChatOnHint')}</span>
          </span>
          <button
            type="button"
            class="ai-toggle-btn"
            class:on={!userSettingsState.disableAiChat}
            role="switch"
            aria-checked={!userSettingsState.disableAiChat}
            aria-label={userSettingsState.disableAiChat ? t('accountAiChatEnable') : t('accountAiChatDisable')}
            onclick={handleToggleAiChat}
            disabled={savingAiChat || !userSettingsState.loaded}
          >
            <span class="ai-toggle-thumb" aria-hidden="true"></span>
          </button>
        </label>
        <label class="ai-toggle-row">
          <span class="ai-toggle-copy">
            <strong>
              {userSettingsState.persistAiChatLocal
                ? t('accountAiChatHistoryLocalOn')
                : t('accountAiChatHistoryLocalOff')}
            </strong>
            <span>
              {userSettingsState.persistAiChatLocal
                ? t('accountAiChatHistoryLocalOnHint')
                : t('accountAiChatHistoryLocalOffHint')}
            </span>
          </span>
          <button
            type="button"
            class="ai-toggle-btn"
            class:on={userSettingsState.persistAiChatLocal}
            role="switch"
            aria-checked={userSettingsState.persistAiChatLocal}
            aria-label={userSettingsState.persistAiChatLocal
              ? t('accountAiChatHistoryLocalDisable')
              : t('accountAiChatHistoryLocalEnable')}
            onclick={handleTogglePersistAiChatLocal}
            disabled={savingAiChatHistoryLocal || !userSettingsState.loaded || userSettingsState.disableAiChat}
          >
            <span class="ai-toggle-thumb" aria-hidden="true"></span>
          </button>
        </label>
        <div class="storage-cleanup-row">
          <p class="storage-cleanup-meta">
            {t('accountAiChatHistoryStorageCount', { count: aiChatDraftCount })}
          </p>
          <button
            type="button"
            class="secondary-btn storage-cleanup-btn"
            onclick={handleClearAiChatDrafts}
            disabled={clearingAiChatDrafts || aiChatDraftCount === 0}
          >
            {clearingAiChatDrafts ? t('processing') : t('accountAiChatHistoryClear')}
          </button>
        </div>

        {#if !userSettingsState.disableAiChat}
          <div class="ai-defaults-block">
            <h4>{t('accountAiChatDefaultsSection')}</h4>
            <p class="hint">{t('accountAiChatDefaultsHint')}</p>
            {#if !globalDefaultsConfigured}
              <p class="ai-defaults-warning">{t('accountAiChatDefaultsMissing')}</p>
            {/if}
            <div class="ai-defaults-toolbar">
              <button
                type="button"
                class="ai-defaults-btn"
                onclick={() => (globalAiModal = 'provider')}
                title={globalProviderButtonLabel}
              >
                <span class="ai-defaults-btn-label">{globalProviderButtonLabel}</span>
              </button>
              <button
                type="button"
                class="ai-defaults-btn"
                onclick={() => (globalAiModal = 'model')}
                title={globalModelButtonLabel}
              >
                <span class="ai-defaults-btn-label">{globalModelButtonLabel}</span>
              </button>
              <button
                type="button"
                class="ai-defaults-btn"
                onclick={() => (globalAiModal = 'apiKey')}
                title={globalApiKeyButtonLabel}
              >
                <span class="ai-defaults-btn-label">{globalApiKeyButtonLabel}</span>
              </button>
            </div>
          </div>
        {/if}
      </section>
    {/if}

    <section class="section">
      <h3>{t('accountNoteDraftSection')}</h3>
      <p class="hint">{t('accountNoteDraftHint')}</p>
      <label class="ai-toggle-row">
        <span class="ai-toggle-copy">
          <strong>
            {userSettingsState.persistNoteDraftLocal
              ? t('accountNoteDraftLocalOn')
              : t('accountNoteDraftLocalOff')}
          </strong>
          <span>
            {userSettingsState.persistNoteDraftLocal
              ? t('accountNoteDraftLocalOnHint')
              : t('accountNoteDraftLocalOffHint')}
          </span>
        </span>
        <button
          type="button"
          class="ai-toggle-btn"
          class:on={userSettingsState.persistNoteDraftLocal}
          role="switch"
          aria-checked={userSettingsState.persistNoteDraftLocal}
          aria-label={userSettingsState.persistNoteDraftLocal
            ? t('accountNoteDraftLocalDisable')
            : t('accountNoteDraftLocalEnable')}
          onclick={handleTogglePersistNoteDraftLocal}
          disabled={savingNoteDraftLocal || !userSettingsState.loaded}
        >
          <span class="ai-toggle-thumb" aria-hidden="true"></span>
        </button>
      </label>
      <div class="storage-cleanup-row">
        <p class="storage-cleanup-meta">
          {t('accountNoteDraftStorageCount', { count: noteDraftCount })}
        </p>
        <button
          type="button"
          class="secondary-btn storage-cleanup-btn"
          onclick={handleClearNoteDrafts}
          disabled={clearingNoteDrafts || noteDraftCount === 0}
        >
          {clearingNoteDrafts ? t('processing') : t('accountNoteDraftClear')}
        </button>
      </div>
    </section>

    <section class="section">
      <h3>{t('accountEncryptedNotesSection')}</h3>
      <p class="hint">{t('accountEncryptedNotesHint')}</p>
      <label class="ai-toggle-row">
        <span class="ai-toggle-copy">
          <strong>
            {userSettingsState.autoUnlockAfterSave
              ? t('accountAutoUnlockAfterSaveOn')
              : t('accountAutoUnlockAfterSaveOff')}
          </strong>
          <span>
            {userSettingsState.autoUnlockAfterSave
              ? t('accountAutoUnlockAfterSaveOnHint')
              : t('accountAutoUnlockAfterSaveOffHint')}
          </span>
        </span>
        <button
          type="button"
          class="ai-toggle-btn"
          class:on={userSettingsState.autoUnlockAfterSave}
          role="switch"
          aria-checked={userSettingsState.autoUnlockAfterSave}
          aria-label={userSettingsState.autoUnlockAfterSave
            ? t('accountAutoUnlockAfterSaveDisable')
            : t('accountAutoUnlockAfterSaveEnable')}
          onclick={handleToggleAutoUnlockAfterSave}
          disabled={savingAutoUnlockAfterSave || !userSettingsState.loaded}
        >
          <span class="ai-toggle-thumb" aria-hidden="true"></span>
        </button>
      </label>
    </section>

    {#if !authFeatures.disableChangePassword}
      <section class="section">
        <h3>{hasPassword ? t('changePassword') : t('addPassword')}</h3>
        <p class="hint">{hasPassword ? t('changePasswordHint') : t('addPasswordHint')}</p>

        {#if hasPassword}
          <label class="field">
            <span>{t('currentPassword')}</span>
            <PasswordInput bind:value={currentPassword} autocomplete="current-password" />
          </label>
        {/if}

        <label class="field">
          <span>{t('newPassword')}</span>
          <PasswordInput bind:value={newPassword} autocomplete="new-password" />
        </label>

        <label class="field">
          <span>{t('confirmNewPassword')}</span>
          <PasswordInput bind:value={confirmPassword} autocomplete="new-password" />
        </label>

        <button
          type="button"
          class="primary-btn"
          onclick={handleSavePassword}
          disabled={savingPassword}
        >
          {savingPassword ? t('processing') : hasPassword ? t('changePassword') : t('addPassword')}
        </button>
      </section>
    {/if}

    <section class="section settings-io-section">
      <h3>{t('accountSettingsBackupSection')}</h3>
      <p class="hint">{t('accountSettingsBackupHint')}</p>
      <div class="settings-io-actions">
        <button
          type="button"
          class="secondary-btn"
          onclick={handleExportSettings}
          disabled={exportingSettings || importingSettings}
        >
          {exportingSettings ? t('processing') : t('accountSettingsExport')}
        </button>
        <button
          type="button"
          class="secondary-btn"
          onclick={triggerImportSettings}
          disabled={exportingSettings || importingSettings}
        >
          {importingSettings ? t('processing') : t('accountSettingsImport')}
        </button>
      </div>
      <input
        bind:this={settingsImportInput}
        type="file"
        accept="application/json,.json"
        class="hidden-input"
        onchange={handleImportSettingsFile}
      />
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

    <a
      class="source-link"
      href="https://github.com/manhavn/notedata"
      target="_blank"
      rel="noopener noreferrer"
    >
      {t('sourceCode')}
    </a>
  </div>
{/if}

{#if !aiFeatures.disableAiChat}
  <EditorAiSettings
    bind:openModal={globalAiModal}
    activateOnSelect={true}
    scope="global"
    onClose={() => (globalAiModal = null)}
    onChanged={() => {
      globalAiToolbarTick += 1
    }}
  />
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

  .verification-badge {
    display: inline-flex;
    width: fit-content;
    margin-top: 0.15rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgba(239, 68, 68, 0.12);
    color: var(--danger);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .verification-badge.verified {
    background: var(--success-bg);
    color: var(--success);
  }

  .verification-banner {
    margin-bottom: 1.25rem;
    padding: 1rem 1.1rem;
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 14px;
    background: rgba(59, 130, 246, 0.06);
  }

  .verification-banner p {
    margin: 0 0 0.75rem;
    color: var(--text-muted);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .verification-banner p:last-child {
    margin-bottom: 0;
  }

  .verification-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .secondary-btn {
    flex: 1;
    min-width: 10rem;
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .secondary-btn:hover:not(:disabled) {
    background: var(--bg);
  }

  .secondary-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
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

  .field input:read-only {
    cursor: default;
    color: var(--text-muted);
    background: var(--surface);
  }

  .reauth-hint {
    margin-top: -0.35rem;
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

  .settings-io-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .hidden-input {
    display: none;
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

  .source-link {
    display: block;
    margin-top: 1.25rem;
    text-align: center;
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

  .section-highlight {
    border-radius: 14px;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.35);
    transition: box-shadow 0.3s ease;
  }

  .ai-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 1rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
    cursor: pointer;
  }

  .ai-toggle-copy {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .ai-toggle-copy strong {
    font-size: 0.92rem;
    color: var(--text);
  }

  .ai-toggle-copy span {
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .ai-toggle-btn {
    position: relative;
    width: 46px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.45);
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .ai-toggle-btn.on {
    background: var(--accent);
  }

  .ai-toggle-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .ai-toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
    transition: transform 0.2s;
  }

  .storage-cleanup-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px dashed color-mix(in srgb, var(--border) 80%, transparent);
  }

  .ai-defaults-block {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed color-mix(in srgb, var(--border) 80%, transparent);
  }

  .ai-defaults-block h4 {
    margin: 0 0 0.35rem;
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text);
  }

  .ai-defaults-warning {
    margin: 0.5rem 0 0;
    font-size: 0.82rem;
    color: var(--danger);
  }

  .ai-defaults-toolbar {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.65rem;
    flex-wrap: wrap;
  }

  .ai-defaults-btn {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-muted);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
  }

  .ai-defaults-btn-label {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ai-defaults-btn:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  .storage-cleanup-meta {
    margin: 0;
    flex: 1;
    min-width: 0;
    color: var(--text-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .storage-cleanup-btn {
    flex: 0 0 auto;
    width: auto;
    min-width: 8.5rem;
    border-color: var(--danger);
    color: var(--text);
  }

  .storage-cleanup-btn:hover:not(:disabled) {
    background: var(--bg);
    border-color: var(--danger);
    color: var(--text);
  }

  .ai-toggle-btn.on .ai-toggle-thumb {
    transform: translateX(20px);
  }
</style>