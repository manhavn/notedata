<script lang="ts">
  import { untrack } from 'svelte'
  import {
    deleteApiKey,
    listApiKeys,
    maskApiKey,
    upsertApiKey,
    type StoredApiKey,
  } from '../ai-api-keys'
  import {
    applyChatSettingsToProvider,
    cloneAiProvider,
    createDefaultProvider,
    createModelId,
    deleteAiModel,
    deleteAiProvider,
    getActiveModel,
    listModels,
    listProviders,
    providerToChatSettings,
    saveAiModel,
    saveAiProvider,
    setActiveAiModel,
    setActiveAiProvider,
    validateAiProvider,
    type AiProvider,
    type AiProviderModel,
  } from '../ai-providers'
  import { aiProviderState } from '../ai-providers.svelte'
  import { parseCurlToAiSettings } from '../parse-curl-ai'
  import { authState } from '../auth.svelte'
  import { confirm } from '../dialog.svelte'
  import { t } from '../i18n.svelte'
  import AiFormModal from './AiFormModal.svelte'
  import AiPickerModal, { type PickerItem } from './AiPickerModal.svelte'
  import PasswordInput from './PasswordInput.svelte'

  export type AiSettingsModal = 'provider' | 'apiKey' | 'model' | null
  type AiSettingsFormModal = AiSettingsModal

  interface Props {
    openModal: AiSettingsModal
    activateOnSelect?: boolean
    onClose: () => void
    onChanged: () => void
  }

  let {
    openModal = $bindable(),
    activateOnSelect = false,
    onClose,
    onChanged,
  }: Props = $props()

  let draft = $state<AiProvider>(createDefaultProvider())
  let draftReady = $state(false)
  let apiKeys = $state<StoredApiKey[]>([])
  let apiKeyLabelDraft = $state('')
  let apiKeyValueDraft = $state('')
  let editingApiKeyId = $state<string | null>(null)
  let modelLabelDraft = $state('')
  let modelValueDraft = $state('')
  let editingModelId = $state<string | null>(null)
  let curlInput = $state('')
  let showCurlImport = $state(false)
  let importNotice = $state<string | null>(null)
  let saveNotice = $state<string | null>(null)
  let error = $state<string | null>(null)
  let saving = $state(false)
  let openSettingsForm = $state<AiSettingsFormModal>(null)

  const providers = $derived(listProviders(aiProviderState.settings))
  const models = $derived(listModels(aiProviderState.settings))
  const activeProviderId = $derived(aiProviderState.settings.activeProviderId)
  const activeModelId = $derived(aiProviderState.settings.activeModelId)
  const providerPickerItems = $derived<PickerItem[]>(
    providers.map((provider) => ({
      id: provider.id,
      label: provider.name,
      meta: provider.completionsUrl,
      badge: provider.id === activeProviderId ? t('aiProviderActiveBadge') : undefined,
    })),
  )

  const providerFormTitle = $derived(
    draft.id in aiProviderState.settings.providers ? draft.name : t('aiProviderAdd'),
  )
  const apiKeyFormTitle = $derived(
    editingApiKeyId ? t('aiApiKeyEditLabel') : t('aiApiKeyAdd'),
  )
  const modelFormTitle = $derived(
    editingModelId && modelLabelDraft.trim()
      ? modelLabelDraft.trim()
      : t('aiProviderModelAdd'),
  )

  const apiKeyPickerItems = $derived<PickerItem[]>([
    {
      id: '',
      label: t('aiProviderApiKeyNone'),
      meta: t('aiPickerNoApiKeyHint'),
      manageActions: false,
    },
    ...apiKeys.map((key) => ({
      id: key.id,
      label: key.label,
      meta: maskApiKey(key.value),
      badge: key.id === draft.apiKeyId ? t('aiProviderActiveBadge') : undefined,
    })),
  ])

  const modelPickerItems = $derived<PickerItem[]>(
    models.map((model) => ({
      id: model.id,
      label: model.label,
      meta: model.value,
      badge: model.id === activeModelId ? t('aiProviderActiveBadge') : undefined,
    })),
  )

  function refreshApiKeys() {
    apiKeys = listApiKeys()
  }

  function resetApiKeyDraft() {
    apiKeyLabelDraft = ''
    apiKeyValueDraft = ''
    editingApiKeyId = null
  }

  function resetModelDraft() {
    modelLabelDraft = ''
    modelValueDraft = ''
    editingModelId = null
  }

  function loadProvider(provider: AiProvider | null) {
    draft = provider ? cloneAiProvider(provider) : createDefaultProvider()
    resetModelDraft()
    draftReady = true
  }

  $effect(() => {
    if (!aiProviderState.loaded || draftReady) return

    untrack(() => {
      const active =
        (activeProviderId && aiProviderState.settings.providers[activeProviderId]) ||
        providers[0] ||
        null
      loadProvider(active)
    })
  })

  $effect(() => {
    if (!openModal) {
      openSettingsForm = null
    }
  })

  function closeSettingsForm() {
    openSettingsForm = null
    error = null
    saveNotice = null
  }

  function setNumberField(field: keyof AiProvider, value: string) {
    draft = {
      ...draft,
      [field]: value.trim() === '' ? null : Number(value),
    }
  }

  function mapValidationError(code: string | null): string | null {
    if (!code) return null
    const map: Record<string, string> = {
      AI_PROVIDER_NAME_REQUIRED: t('aiProviderNameRequired'),
      AI_PROVIDER_MODEL_REQUIRED: t('aiProviderModelRequired'),
      AI_SETTINGS_COMPLETIONS_URL_REQUIRED: t('aiSettingsCompletionsUrlRequired'),
      AI_SETTINGS_COMPLETIONS_URL_INVALID: t('aiSettingsCompletionsUrlInvalid'),
      AI_SETTINGS_AUTH_HEADER_REQUIRED: t('aiSettingsAuthHeaderRequired'),
      AI_SETTINGS_INVALID_JSON: t('aiSettingsInvalidJson'),
      AI_API_KEY_LABEL_REQUIRED: t('aiApiKeyLabelRequired'),
      AI_API_KEY_VALUE_REQUIRED: t('aiApiKeyRequired'),
      AI_SETTINGS_CURL_INVALID: t('aiSettingsCurlInvalid'),
      AI_SETTINGS_CURL_NO_URL: t('aiSettingsCurlNoUrl'),
      AI_SETTINGS_CURL_NO_BODY: t('aiSettingsCurlNoBody'),
      AI_SETTINGS_CURL_INVALID_JSON: t('aiSettingsCurlInvalidJson'),
      AI_SETTINGS_CURL_NO_MODEL: t('aiSettingsCurlNoModel'),
    }
    return map[code] ?? t('toastOperationFailed')
  }

  function importFromCurl() {
    importNotice = null
    error = null

    try {
      const currentSettings = providerToChatSettings(
        draft,
        '',
        aiProviderState.settings,
        getActiveModel(aiProviderState.settings),
      )
      const result = parseCurlToAiSettings(curlInput, currentSettings)
      const applied = applyChatSettingsToProvider(draft, result.settings, aiProviderState.settings)
      draft = applied.provider

      const userId = authState.user?.uid
      if (userId) {
        for (const [id, model] of Object.entries(applied.models)) {
          if (!(id in aiProviderState.settings.models)) {
            void saveAiModel(userId, model)
          }
        }
        if (applied.activeModelId) {
          void setActiveAiModel(userId, applied.activeModelId)
        }
      }

      if (result.apiKeyDraft.trim()) {
        editingApiKeyId = null
        apiKeyLabelDraft = ''
        apiKeyValueDraft = result.apiKeyDraft
        openSettingsForm = 'apiKey'
      }

      const notices = [t('aiSettingsCurlImported')]
      if (result.warnings.includes('AI_SETTINGS_CURL_ENV_KEY')) {
        notices.push(t('aiSettingsCurlEnvKey'))
      }
      importNotice = notices.join(' ')
      curlInput = ''
      showCurlImport = false
    } catch (err) {
      const code = err instanceof Error ? err.message : 'AI_SETTINGS_CURL_INVALID'
      error = mapValidationError(code)
    }
  }

  async function saveProvider(makeActive = false) {
    const userId = authState.user?.uid
    if (!userId) {
      error = t('toastOperationFailed')
      return false
    }

    const validationError = mapValidationError(validateAiProvider(draft, aiProviderState.settings))
    if (validationError) {
      error = validationError
      return false
    }

    saving = true
    error = null
    saveNotice = null

    try {
      await saveAiProvider(userId, draft)

      const shouldActivate =
        makeActive || !activeProviderId || Object.keys(aiProviderState.settings.providers).length === 0
      if (shouldActivate) {
        await setActiveAiProvider(userId, draft.id)
      }

      saveNotice = draft.apiKeyId ? t('aiProviderSaved') : t('aiSettingsSavedWithoutKey')
      onChanged()
      closeSettingsForm()
      return true
    } catch {
      error = t('toastOperationFailed')
      return false
    } finally {
      saving = false
    }
  }

  function openAddProvider() {
    loadProvider(createDefaultProvider(''))
    saveNotice = null
    error = null
    openSettingsForm = 'provider'
  }

  async function removeProviderById(providerId: string) {
    const userId = authState.user?.uid
    if (!userId || !(providerId in aiProviderState.settings.providers)) return

    const provider = aiProviderState.settings.providers[providerId]
    const accepted = await confirm({
      title: t('aiProviderDeleteTitle'),
      message: t('aiProviderDeleteMessage', { name: provider.name }),
      confirmLabel: t('delete'),
      variant: 'danger',
    })
    if (!accepted) return

    saving = true
    error = null

    try {
      await deleteAiProvider(userId, providerId)
      const remaining = listProviders(aiProviderState.settings)
      const next =
        (activeProviderId && aiProviderState.settings.providers[activeProviderId]) ||
        remaining[0] ||
        null
      loadProvider(next)
      if (openSettingsForm === 'provider') {
        closeSettingsForm()
      }
      saveNotice = t('aiProviderDeleted')
      onChanged()
    } catch {
      error = t('toastOperationFailed')
    } finally {
      saving = false
    }
  }

  async function handleProviderPick(providerId: string) {
    const provider = aiProviderState.settings.providers[providerId]
    if (!provider) return

    loadProvider(provider)

    if (activateOnSelect) {
      const userId = authState.user?.uid
      if (userId) {
        saving = true
        try {
          await setActiveAiProvider(userId, providerId)
          onChanged()
          onClose()
        } catch {
          error = t('toastOperationFailed')
        } finally {
          saving = false
        }
      }
    }
  }

  function handleProviderEdit(providerId: string) {
    const provider = aiProviderState.settings.providers[providerId]
    if (!provider) return
    loadProvider(provider)
    saveNotice = null
    error = null
    openSettingsForm = 'provider'
  }

  async function handleApiKeyPick(apiKeyId: string) {
    draft = { ...draft, apiKeyId: apiKeyId || null }

    if (activateOnSelect) {
      const userId = authState.user?.uid
      const provider = draft
      if (userId && provider.id in aiProviderState.settings.providers) {
        saving = true
        try {
          await saveAiProvider(userId, provider)
          onChanged()
          onClose()
        } catch {
          error = t('toastOperationFailed')
        } finally {
          saving = false
        }
      }
    }
  }

  function openAddApiKey() {
    resetApiKeyDraft()
    saveNotice = null
    error = null
    openSettingsForm = 'apiKey'
  }

  function handleApiKeyEdit(apiKeyId: string) {
    const key = apiKeys.find((item) => item.id === apiKeyId)
    if (!key) return
    editingApiKeyId = key.id
    apiKeyLabelDraft = key.label
    apiKeyValueDraft = key.value
    saveNotice = null
    error = null
    openSettingsForm = 'apiKey'
  }

  async function handleModelPick(modelId: string) {
    if (!(modelId in aiProviderState.settings.models)) return

    const userId = authState.user?.uid
    if (!userId) return

    saving = true
    error = null

    try {
      await setActiveAiModel(userId, modelId)
      onChanged()
      if (activateOnSelect) {
        onClose()
      }
    } catch {
      error = t('toastOperationFailed')
    } finally {
      saving = false
    }
  }

  function openAddModel() {
    resetModelDraft()
    saveNotice = null
    error = null
    openSettingsForm = 'model'
  }

  function handleModelEdit(modelId: string) {
    const model = aiProviderState.settings.models[modelId]
    if (!model) return
    editingModelId = model.id
    modelLabelDraft = model.label
    modelValueDraft = model.value
    saveNotice = null
    error = null
    openSettingsForm = 'model'
  }

  async function saveApiKeyEntry() {
    error = null

    try {
      const saved = upsertApiKey({
        id: editingApiKeyId ?? undefined,
        label: apiKeyLabelDraft,
        value: apiKeyValueDraft,
      })
      refreshApiKeys()
      draft = { ...draft, apiKeyId: saved.id }
      resetApiKeyDraft()

      const userId = authState.user?.uid
      if (userId && draft.id in aiProviderState.settings.providers) {
        saving = true
        try {
          await saveAiProvider(userId, draft)
        } finally {
          saving = false
        }
      }

      saveNotice = t('aiApiKeyEntrySaved')
      onChanged()
      closeSettingsForm()
    } catch (err) {
      const code = err instanceof Error ? err.message : 'AI_API_KEY_VALUE_REQUIRED'
      error = mapValidationError(code)
    }
  }

  async function removeApiKeyEntry(key: StoredApiKey) {
    const accepted = await confirm({
      title: t('aiApiKeyDeleteTitle'),
      message: t('aiApiKeyDeleteMessage', { label: key.label }),
      confirmLabel: t('delete'),
      variant: 'danger',
    })
    if (!accepted) return

    deleteApiKey(key.id)
    refreshApiKeys()
    if (draft.apiKeyId === key.id) {
      draft = { ...draft, apiKeyId: null }
    }
    if (editingApiKeyId === key.id) {
      resetApiKeyDraft()
      if (openSettingsForm === 'apiKey') {
        closeSettingsForm()
      }
    }
    onChanged()
  }

  async function saveModelEntry() {
    error = null
    const label = modelLabelDraft.trim()
    const value = modelValueDraft.trim()
    if (!label) {
      error = t('aiProviderModelLabelRequired')
      return
    }
    if (!value) {
      error = t('aiProviderModelValueRequired')
      return
    }

    const userId = authState.user?.uid
    if (!userId) {
      error = t('toastOperationFailed')
      return
    }

    const modelId = editingModelId ?? createModelId()
    const model: AiProviderModel = { id: modelId, label, value }

    saving = true
    try {
      await saveAiModel(userId, model)

      if (!aiProviderState.settings.activeModelId) {
        await setActiveAiModel(userId, modelId)
      }

      resetModelDraft()
      saveNotice = t('aiProviderModelSaved')
      onChanged()
      closeSettingsForm()
    } catch {
      error = t('toastOperationFailed')
    } finally {
      saving = false
    }
  }

  async function removeModelEntry(model: AiProviderModel) {
    const userId = authState.user?.uid
    if (!userId) return

    const accepted = await confirm({
      title: t('aiProviderModelDeleteTitle'),
      message: t('aiProviderModelDeleteMessage', { label: model.label }),
      confirmLabel: t('delete'),
      variant: 'danger',
    })
    if (!accepted) return

    saving = true
    error = null

    try {
      await deleteAiModel(userId, model.id)

      if (editingModelId === model.id) {
        resetModelDraft()
        if (openSettingsForm === 'model') {
          closeSettingsForm()
        }
      }

      onChanged()
    } catch {
      error = t('toastOperationFailed')
    } finally {
      saving = false
    }
  }

  refreshApiKeys()
</script>

{#if openModal === 'provider'}
  <AiPickerModal
    open={true}
    manageMode
    title={t('aiPickerManageProviders')}
    subtitle={t('aiPickerManageProvidersHint')}
    items={providerPickerItems}
    selectedId={activeProviderId}
    emptyLabel={t('aiPickerProvidersEmpty')}
    addLabel={t('aiProviderAdd')}
    onClose={onClose}
    onSelect={handleProviderPick}
    onAdd={openAddProvider}
    onEdit={handleProviderEdit}
    onDelete={removeProviderById}
  />
{:else if openModal === 'apiKey'}
  <AiPickerModal
    open={true}
    manageMode
    title={t('aiPickerManageApiKeys')}
    subtitle={t('aiPickerManageApiKeysHint')}
    items={apiKeyPickerItems}
    selectedId={draft.apiKeyId ?? ''}
    emptyLabel={t('aiApiKeyVaultEmpty')}
    addLabel={t('aiApiKeyAdd')}
    onClose={onClose}
    onSelect={handleApiKeyPick}
    onAdd={openAddApiKey}
    onEdit={handleApiKeyEdit}
    onDelete={async (id) => {
      const key = apiKeys.find((item) => item.id === id)
      if (key) await removeApiKeyEntry(key)
    }}
  />
{:else if openModal === 'model'}
  <AiPickerModal
    open={true}
    manageMode
    title={t('aiPickerManageModels')}
    subtitle={t('aiPickerManageModelsHint')}
    items={modelPickerItems}
    selectedId={activeModelId}
    emptyLabel={t('aiProviderModelsEmpty')}
    addLabel={t('aiProviderModelAdd')}
    onClose={onClose}
    onSelect={handleModelPick}
    onAdd={openAddModel}
    onEdit={handleModelEdit}
    onDelete={async (id) => {
      const model = aiProviderState.settings.models[id]
      if (model) await removeModelEntry(model)
    }}
  />
{/if}

{#if openSettingsForm === 'provider'}
  <AiFormModal
    open={true}
    large
    title={providerFormTitle}
    subtitle={t('aiPickerManageProvidersHint')}
    onClose={closeSettingsForm}
  >
    {#snippet body()}
      <div class="modal-form">
        <label class="field">
          <span>{t('aiProviderName')}</span>
          <input type="text" bind:value={draft.name} maxlength="64" placeholder={t('aiProviderNamePlaceholder')} />
        </label>

        <div class="import-head">
          <h4>{t('aiSettingsCurlImport')}</h4>
          <button type="button" class="mini-btn" onclick={() => (showCurlImport = !showCurlImport)}>
            {showCurlImport ? t('aiSettingsCurlHide') : t('aiSettingsCurlShow')}
          </button>
        </div>
        {#if showCurlImport}
          <p class="hint">{t('aiSettingsCurlHint')}</p>
          <label class="field">
            <span>{t('aiSettingsCurlLabel')}</span>
            <textarea class="mono" bind:value={curlInput} rows="5" spellcheck="false"></textarea>
          </label>
          <button type="button" class="mini-btn" onclick={importFromCurl} disabled={!curlInput.trim()}>
            {t('aiSettingsCurlApply')}
          </button>
        {/if}
        {#if importNotice}<p class="notice success">{importNotice}</p>{/if}

        <label class="field">
          <span>{t('aiSettingsCompletionsUrl')}</span>
          <input type="url" bind:value={draft.completionsUrl} />
        </label>

        <label class="field">
          <span>{t('aiSettingsAuthHeaderName')}</span>
          <input type="text" bind:value={draft.authHeaderName} />
        </label>
        <label class="field">
          <span>{t('aiSettingsAuthHeaderPrefix')}</span>
          <input type="text" bind:value={draft.authHeaderPrefix} />
        </label>

        <div class="field-grid">
          <label class="field">
            <span>{t('aiSettingsTemperature')}</span>
            <input
              type="number"
              value={draft.temperature ?? ''}
              oninput={(e) => setNumberField('temperature', e.currentTarget.value)}
              placeholder={t('aiSettingsOptional')}
            />
          </label>
          <label class="field">
            <span>{t('aiSettingsMaxTokens')}</span>
            <input
              type="number"
              value={draft.maxTokens ?? ''}
              oninput={(e) => setNumberField('maxTokens', e.currentTarget.value)}
              placeholder={t('aiSettingsOptional')}
            />
          </label>
          <label class="field">
            <span>{t('aiSettingsTopP')}</span>
            <input
              type="number"
              value={draft.topP ?? ''}
              oninput={(e) => setNumberField('topP', e.currentTarget.value)}
              placeholder={t('aiSettingsOptional')}
            />
          </label>
          <label class="field">
            <span>{t('aiSettingsFrequencyPenalty')}</span>
            <input
              type="number"
              value={draft.frequencyPenalty ?? ''}
              oninput={(e) => setNumberField('frequencyPenalty', e.currentTarget.value)}
              placeholder={t('aiSettingsOptional')}
            />
          </label>
          <label class="field">
            <span>{t('aiSettingsPresencePenalty')}</span>
            <input
              type="number"
              value={draft.presencePenalty ?? ''}
              oninput={(e) => setNumberField('presencePenalty', e.currentTarget.value)}
              placeholder={t('aiSettingsOptional')}
            />
          </label>
        </div>

        <label class="checkbox">
          <input type="checkbox" bind:checked={draft.stream} />
          <span>{t('aiSettingsStream')}</span>
        </label>

        <label class="field">
          <span>{t('aiSettingsSystemPrompt')}</span>
          <textarea bind:value={draft.systemPrompt} rows="5"></textarea>
        </label>

        <label class="field">
          <span>{t('aiSettingsExtraHeaders')}</span>
          <textarea class="mono" bind:value={draft.extraHeaders} rows="3" spellcheck="false"></textarea>
        </label>
        <label class="field">
          <span>{t('aiSettingsExtraBody')}</span>
          <textarea class="mono" bind:value={draft.extraBody} rows="3" spellcheck="false"></textarea>
        </label>

        {#if error}<p class="notice error">{error}</p>{/if}
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="modal-actions">
        <button type="button" class="action-btn primary" onclick={() => saveProvider(false)} disabled={saving}>
          {saving ? t('saving') : t('aiProviderSave')}
        </button>
        <button type="button" class="action-btn" onclick={closeSettingsForm} disabled={saving}>
          {t('cancel')}
        </button>
      </div>
    {/snippet}
  </AiFormModal>
{:else if openSettingsForm === 'apiKey'}
  <AiFormModal
    open={true}
    title={apiKeyFormTitle}
    subtitle={t('aiApiKeyVaultHint')}
    onClose={closeSettingsForm}
  >
    {#snippet body()}
      <div class="modal-form">
        <label class="field">
          <span>{t('aiApiKeyLabelName')}</span>
          <input type="text" bind:value={apiKeyLabelDraft} placeholder={t('aiApiKeyLabelPlaceholder')} />
        </label>
        <label class="field">
          <span>{editingApiKeyId ? t('aiApiKeyReplace') : t('aiApiKeyLabel')}</span>
          <PasswordInput bind:value={apiKeyValueDraft} placeholder={t('aiApiKeyPlaceholder')} autocomplete="off" />
        </label>
        {#if error}<p class="notice error">{error}</p>{/if}
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="modal-actions">
        <button type="button" class="action-btn primary" onclick={saveApiKeyEntry} disabled={saving}>
          {saving ? t('saving') : editingApiKeyId ? t('aiApiKeySave') : t('aiApiKeyAdd')}
        </button>
        <button type="button" class="action-btn" onclick={closeSettingsForm}>
          {t('cancel')}
        </button>
      </div>
    {/snippet}
  </AiFormModal>
{:else if openSettingsForm === 'model'}
  <AiFormModal
    open={true}
    title={modelFormTitle}
    subtitle={t('aiProviderModelsHint')}
    onClose={closeSettingsForm}
  >
    {#snippet body()}
      <div class="modal-form">
        <label class="field">
          <span>{t('aiProviderModelLabel')}</span>
          <input type="text" bind:value={modelLabelDraft} placeholder={t('aiProviderModelLabelPlaceholder')} />
        </label>
        <label class="field">
          <span>{t('aiProviderModelValue')}</span>
          <input type="text" bind:value={modelValueDraft} placeholder={t('aiProviderModelValuePlaceholder')} />
        </label>
        {#if error}<p class="notice error">{error}</p>{/if}
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="modal-actions">
        <button type="button" class="action-btn primary" onclick={saveModelEntry} disabled={saving}>
          {saving ? t('saving') : editingModelId ? t('save') : t('aiProviderModelAdd')}
        </button>
        <button type="button" class="action-btn" onclick={closeSettingsForm}>
          {t('cancel')}
        </button>
      </div>
    {/snippet}
  </AiFormModal>
{/if}

<style>
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }

  .field span {
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--text);
  }

  .field input,
  .field textarea {
    width: 100%;
    padding: 0.5rem 0.62rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 0.82rem;
  }

  .field textarea.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.76rem;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .checkbox {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
  }

  .import-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .import-head h4 {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .hint {
    margin: 0;
    font-size: 0.76rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .notice {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .notice.success {
    color: var(--success);
    font-weight: 600;
  }

  .notice.error {
    color: var(--danger);
  }

  .mini-btn,
  .action-btn {
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
  }

  .action-btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .action-btn:disabled,
  .mini-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .modal-actions .action-btn {
    flex: 1;
    min-width: 7rem;
    text-align: center;
  }

  @media (max-width: 768px) {
    .field-grid {
      grid-template-columns: 1fr;
    }

    .modal-actions {
      flex-direction: column;
    }
  }
</style>