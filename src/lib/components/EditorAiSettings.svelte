<script lang="ts">
  import {
    cloneAiChatSettings,
    DEFAULT_AI_SETTINGS,
    getAiChatSettings,
    maskApiKey,
    resetAiChatSettings,
    saveAiChatSettings,
    validateAiChatSettings,
    type AiChatSettings,
  } from '../ai-settings'
  import { openAccountSettings } from '../account-modal.svelte'
  import { aiFeatures } from '../ai-features'
  import { parseCurlToAiSettings } from '../parse-curl-ai'
  import { t } from '../i18n.svelte'
  import { isUserAiChatEnabled } from '../user-settings.svelte'
  import PasswordInput from './PasswordInput.svelte'

  interface Props {
    canCancel?: boolean
    onSaved: () => void
    onCancel?: () => void
  }

  let { canCancel = false, onSaved, onCancel }: Props = $props()

  let draft = $state<AiChatSettings>(cloneAiChatSettings(getAiChatSettings()))
  let apiKeyDraft = $state('')
  let curlInput = $state('')
  let showCurlImport = $state(false)
  let importNotice = $state<string | null>(null)
  let saveNotice = $state<string | null>(null)
  let error = $state<string | null>(null)

  const savedApiKeyMask = $derived(maskApiKey(draft.apiKey))

  function setNumberField(field: keyof AiChatSettings, value: string) {
    draft = {
      ...draft,
      [field]: value.trim() === '' ? null : Number(value),
    }
  }

  function mapValidationError(code: string | null): string | null {
    if (!code) return null
    const map: Record<string, string> = {
      AI_SETTINGS_COMPLETIONS_URL_REQUIRED: t('aiSettingsCompletionsUrlRequired'),
      AI_SETTINGS_COMPLETIONS_URL_INVALID: t('aiSettingsCompletionsUrlInvalid'),
      AI_SETTINGS_MODEL_REQUIRED: t('aiSettingsModelRequired'),
      AI_SETTINGS_API_KEY_REQUIRED: t('aiApiKeyRequired'),
      AI_SETTINGS_AUTH_HEADER_REQUIRED: t('aiSettingsAuthHeaderRequired'),
      AI_SETTINGS_INVALID_JSON: t('aiSettingsInvalidJson'),
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
      const result = parseCurlToAiSettings(curlInput, draft)
      draft = cloneAiChatSettings(result.settings)
      if (result.apiKeyDraft) {
        apiKeyDraft = result.apiKeyDraft
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

  function saveSettings() {
    const next = cloneAiChatSettings(draft)
    if (apiKeyDraft.trim()) {
      next.apiKey = apiKeyDraft.trim()
    }

    const validationError = mapValidationError(validateAiChatSettings(next))
    if (validationError) {
      error = validationError
      return
    }

    saveAiChatSettings(next)
    draft = cloneAiChatSettings(next)
    apiKeyDraft = ''
    error = null
    saveNotice = next.apiKey ? null : t('aiSettingsSavedWithoutKey')
    onSaved()
  }

  function restoreDefaults() {
    draft = cloneAiChatSettings(DEFAULT_AI_SETTINGS)
    apiKeyDraft = ''
    error = null
  }

  function clearStoredSettings() {
    draft = resetAiChatSettings()
    apiKeyDraft = ''
    error = null
    onSaved()
  }

  function openAiChatAccountSettings() {
    openAccountSettings('aiChat')
  }
</script>

<div class="ai-settings">
  <section class="ai-settings-section ai-settings-import">
    <div class="ai-settings-import-head">
      <h4>{t('aiSettingsCurlImport')}</h4>
      <button
        type="button"
        class="ai-settings-import-toggle"
        onclick={() => (showCurlImport = !showCurlImport)}
      >
        {showCurlImport ? t('aiSettingsCurlHide') : t('aiSettingsCurlShow')}
      </button>
    </div>
    {#if showCurlImport}
      <p class="ai-settings-hint">{t('aiSettingsCurlHint')}</p>
      <label class="ai-settings-field">
        <span>{t('aiSettingsCurlLabel')}</span>
        <textarea
          class="mono"
          bind:value={curlInput}
          rows="6"
          spellcheck="false"
          placeholder={t('aiSettingsCurlPlaceholder')}
        ></textarea>
      </label>
      <button
        type="button"
        class="ai-settings-import-btn"
        onclick={importFromCurl}
        disabled={!curlInput.trim()}
      >
        {t('aiSettingsCurlApply')}
      </button>
    {/if}
    {#if importNotice}
      <p class="ai-settings-notice">{importNotice}</p>
    {/if}
  </section>

  <section class="ai-settings-section">
    <h4>{t('aiSettingsEndpoint')}</h4>
    <label class="ai-settings-field">
      <span>{t('aiSettingsCompletionsUrl')}</span>
      <input
        type="url"
        bind:value={draft.completionsUrl}
        placeholder="https://inference.poolside.ai/v1/chat/completions"
      />
    </label>
  </section>

  <section class="ai-settings-section">
    <h4>{t('aiSettingsAuth')}</h4>
    {#if savedApiKeyMask}
      <p class="ai-settings-saved-key">{t('aiApiKeySaved', { mask: savedApiKeyMask })}</p>
    {/if}
    <label class="ai-settings-field">
      <span>{apiKeyDraft || !draft.apiKey ? t('aiApiKeyLabel') : t('aiApiKeyReplace')}</span>
      <PasswordInput
        bind:value={apiKeyDraft}
        placeholder={t('aiApiKeyPlaceholder')}
        autocomplete="off"
      />
    </label>
    <label class="ai-settings-field">
      <span>{t('aiSettingsAuthHeaderName')}</span>
      <input type="text" bind:value={draft.authHeaderName} placeholder="Authorization" />
    </label>
    <label class="ai-settings-field">
      <span>{t('aiSettingsAuthHeaderPrefix')}</span>
      <input type="text" bind:value={draft.authHeaderPrefix} placeholder="Bearer " />
    </label>
  </section>

  <section class="ai-settings-section">
    <h4>{t('aiSettingsModelSection')}</h4>
    <label class="ai-settings-field">
      <span>{t('aiSettingsModel')}</span>
      <input type="text" bind:value={draft.model} placeholder="poolside/laguna-m.1" />
    </label>
    <div class="ai-settings-grid">
      <label class="ai-settings-field">
        <span>{t('aiSettingsTemperature')}</span>
        <input
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={draft.temperature ?? ''}
          oninput={(event) => setNumberField('temperature', event.currentTarget.value)}
          placeholder={t('aiSettingsOptional')}
        />
      </label>
      <label class="ai-settings-field">
        <span>{t('aiSettingsMaxTokens')}</span>
        <input
          type="number"
          min="1"
          step="1"
          value={draft.maxTokens ?? ''}
          oninput={(event) => setNumberField('maxTokens', event.currentTarget.value)}
          placeholder={t('aiSettingsOptional')}
        />
      </label>
      <label class="ai-settings-field">
        <span>{t('aiSettingsTopP')}</span>
        <input
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={draft.topP ?? ''}
          oninput={(event) => setNumberField('topP', event.currentTarget.value)}
          placeholder={t('aiSettingsOptional')}
        />
      </label>
      <label class="ai-settings-field">
        <span>{t('aiSettingsFrequencyPenalty')}</span>
        <input
          type="number"
          min="-2"
          max="2"
          step="0.1"
          value={draft.frequencyPenalty ?? ''}
          oninput={(event) => setNumberField('frequencyPenalty', event.currentTarget.value)}
          placeholder={t('aiSettingsOptional')}
        />
      </label>
      <label class="ai-settings-field">
        <span>{t('aiSettingsPresencePenalty')}</span>
        <input
          type="number"
          min="-2"
          max="2"
          step="0.1"
          value={draft.presencePenalty ?? ''}
          oninput={(event) => setNumberField('presencePenalty', event.currentTarget.value)}
          placeholder={t('aiSettingsOptional')}
        />
      </label>
    </div>
    <label class="ai-settings-checkbox">
      <input type="checkbox" bind:checked={draft.stream} />
      <span>{t('aiSettingsStream')}</span>
    </label>
  </section>

  <section class="ai-settings-section">
    <h4>{t('aiSettingsPromptSection')}</h4>
    <p class="ai-settings-hint">{t('aiSettingsPromptHint')}</p>
    <label class="ai-settings-field">
      <span>{t('aiSettingsSystemPrompt')}</span>
      <textarea bind:value={draft.systemPrompt} rows="7"></textarea>
    </label>
  </section>

  <section class="ai-settings-section">
    <h4>{t('aiSettingsAdvanced')}</h4>
    <p class="ai-settings-hint">{t('aiSettingsAdvancedHint')}</p>
    <label class="ai-settings-field">
      <span>{t('aiSettingsExtraHeaders')}</span>
      <textarea class="mono" bind:value={draft.extraHeaders} rows="4" spellcheck="false"></textarea>
    </label>
    <label class="ai-settings-field">
      <span>{t('aiSettingsExtraBody')}</span>
      <textarea class="mono" bind:value={draft.extraBody} rows="4" spellcheck="false"></textarea>
    </label>
  </section>

  {#if saveNotice}
    <p class="ai-settings-notice">{saveNotice}</p>
  {/if}

  {#if error}
    <p class="ai-settings-error">{error}</p>
  {/if}

  <footer class="ai-settings-actions">
    {#if !aiFeatures.disableAiChat}
      <button
        type="button"
        class="action-chip"
        class:on={isUserAiChatEnabled()}
        onclick={openAiChatAccountSettings}
        title={t('aiSettingsToggleAccountHint')}
      >
        <span class="action-chip-dot" aria-hidden="true"></span>
        <span class="action-chip-label">
          {isUserAiChatEnabled() ? t('aiSettingsToggleAccountOn') : t('aiSettingsToggleAccountOff')}
        </span>
      </button>
    {/if}

    <div class="action-row action-row-main" class:single={!(canCancel && onCancel)}>
      <button type="button" class="action-btn primary" onclick={saveSettings}>
        {t('aiSettingsSave')}
      </button>
      {#if canCancel && onCancel}
        <button type="button" class="action-btn" onclick={onCancel}>
          {t('cancel')}
        </button>
      {/if}
    </div>

    <div class="action-row action-row-secondary">
      <button type="button" class="action-btn" onclick={restoreDefaults}>
        {t('aiSettingsRestoreDefaults')}
      </button>
      <button type="button" class="action-btn danger" onclick={clearStoredSettings}>
        {t('aiSettingsClearStored')}
      </button>
    </div>
  </footer>
</div>

<style>
  .ai-settings {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.85rem 1rem 1rem;
    overflow-y: auto;
    max-height: min(58vh, 460px);
  }

  .ai-settings-section {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  .ai-settings-section:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
  }

  .ai-settings-section h4 {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .ai-settings-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .ai-settings-field span {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text);
  }

  .ai-settings-field input,
  .ai-settings-field textarea {
    width: 100%;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 0.84rem;
    line-height: 1.45;
  }

  .ai-settings-field textarea {
    resize: vertical;
    min-height: 4.5rem;
  }

  .ai-settings-field textarea.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.78rem;
  }

  .ai-settings-field input:focus,
  .ai-settings-field textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--input-focus-ring);
  }

  .ai-settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .ai-settings-checkbox {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.82rem;
    color: var(--text);
    cursor: pointer;
  }

  .ai-settings-hint,
  .ai-settings-saved-key {
    margin: 0;
    font-size: 0.76rem;
    line-height: 1.45;
    color: var(--text-muted);
  }

  .ai-settings-saved-key {
    color: var(--success);
    font-weight: 600;
  }

  .ai-settings-import-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .ai-settings-import-toggle,
  .ai-settings-import-btn {
    padding: 0.4rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-muted);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
  }

  .ai-settings-import-btn {
    align-self: flex-start;
    color: var(--text);
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  }

  .ai-settings-import-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ai-settings-notice {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.45;
    color: var(--success);
    font-weight: 600;
  }

  .ai-settings-error {
    margin: 0;
    font-size: 0.8rem;
    color: var(--danger);
  }

  .ai-settings-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.75rem;
    margin-top: 0.1rem;
    border-top: 1px solid var(--border);
  }

  .action-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .action-row.single {
    grid-template-columns: 1fr;
  }

  .action-btn,
  .action-chip {
    min-height: 2.35rem;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s,
      color 0.2s,
      opacity 0.2s;
  }

  .action-btn {
    width: 100%;
    padding: 0.55rem 0.65rem;
    line-height: 1.25;
    text-align: center;
  }

  .action-btn:hover {
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
    background: var(--surface);
  }

  .action-btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .action-btn.primary:hover {
    background: color-mix(in srgb, var(--accent) 88%, #000);
    border-color: color-mix(in srgb, var(--accent) 88%, #000);
    color: #fff;
  }

  .action-btn.danger {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 35%, var(--border));
    background: var(--danger-bg);
  }

  .action-btn.danger:hover {
    border-color: color-mix(in srgb, var(--danger) 55%, var(--border));
    background: color-mix(in srgb, var(--danger) 10%, var(--danger-bg));
    color: var(--danger);
  }

  .action-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.55rem 0.75rem;
    color: var(--text-muted);
    text-align: left;
  }

  .action-chip:hover {
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
    color: var(--text);
    background: var(--surface);
  }

  .action-chip.on {
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
    background: color-mix(in srgb, var(--accent) 8%, var(--bg));
    color: var(--text);
  }

  .action-chip-dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: var(--text-muted);
    flex-shrink: 0;
  }

  .action-chip.on .action-chip-dot {
    background: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .action-chip-label {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 480px) {
    .ai-settings-grid {
      grid-template-columns: 1fr;
    }
  }
</style>