<script lang="ts">
  import { chatCompletion, type ChatMessage } from '../ai-chat'
  import { decryptApiKeyValue } from '../ai-api-keys'
  import {
    apiKeyState,
    clearUnlockedApiKey,
    getApiKeyById,
    isApiKeyUnlocked,
    setUnlockedApiKey,
  } from '../ai-api-keys.svelte'
  import { getActiveModel, getActiveProvider } from '../ai-providers'
  import { aiChatSettingsState } from '../ai-providers.svelte'
  import { aiFeatures } from '../ai-features'
  import { openAccountSettings } from '../account-modal.svelte'
  import {
    getAiChatSettings,
    hasAiChatSettingsSaved,
    isAiChatConfigured,
    renderSystemPrompt,
  } from '../ai-settings'
  import { t } from '../i18n.svelte'
  import { toastError, toastSuccess } from '../toast.svelte'
  import { isUserAiChatEnabled } from '../user-settings.svelte'
  import EditorAiSettings, { type AiSettingsModal } from './EditorAiSettings.svelte'
  import KeySelectModal, { type PasscodeSubmit } from './KeySelectModal.svelte'

  interface Props {
    noteTitle: string
    noteContent: string
    disabled?: boolean
    onInsert: (text: string) => void
    onManageEncryptionKeys?: () => void
  }

  let {
    noteTitle,
    noteContent,
    disabled = false,
    onInsert,
    onManageEncryptionKeys,
  }: Props = $props()

  interface UiMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
  }

  let open = $state(false)
  let openModal = $state<AiSettingsModal>(null)
  let configured = $state(isAiChatConfigured())
  let settingsSaved = $state(hasAiChatSettingsSaved())
  let input = $state('')
  let messages = $state<UiMessage[]>([])
  let loading = $state(false)
  let error = $state<string | null>(null)
  let abortController = $state<AbortController | null>(null)
  let messagesEl = $state<HTMLDivElement | undefined>(undefined)
  let toolbarTick = $state(0)
  let unlockModalOpen = $state(false)
  let pendingSendPrompt = $state<string | null>(null)
  let unlockSuggestedKeyId = $state<string | null>(null)
  let unlockNoteKeyId = $state<string | null>(null)

  const activeProvider = $derived(getActiveProvider(aiChatSettingsState.settings))
  const activeModel = $derived(getActiveModel(aiChatSettingsState.settings))
  const activeApiKeyId = $derived(aiChatSettingsState.settings.activeApiKeyId)

  $effect(() => {
    const apiKeyId = activeApiKeyId ?? null
    if (apiKeyState.unlockedApiKeyId && apiKeyState.unlockedApiKeyId !== apiKeyId) {
      clearUnlockedApiKey()
      toolbarTick += 1
    }
  })

  const providerButtonLabel = $derived(activeProvider?.name?.trim() || t('aiProviderSelect'))
  const modelButtonLabel = $derived(activeModel?.label?.trim() || t('aiProviderModelsSection'))
  const apiKeyButtonLabel = $derived.by(() => {
    void toolbarTick
    if (!activeApiKeyId) return t('aiApiKeyNoneLabel')
    const key = getApiKeyById(activeApiKeyId)
    return key?.label?.trim() || t('aiApiKeyNoneLabel')
  })

  function buildSystemPrompt(): string {
    const settings = getAiChatSettings()
    return renderSystemPrompt(settings.systemPrompt, {
      noteTitle: noteTitle,
      noteContent: noteContent,
    })
  }

  function scrollToBottom() {
    if (!messagesEl) return
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  function refreshConfiguredState() {
    configured = isAiChatConfigured()
    settingsSaved = hasAiChatSettingsSaved()
    if (!settingsSaved) {
      openModal = 'provider'
    }
  }

  function handleSettingsChanged() {
    configured = isAiChatConfigured()
    settingsSaved = hasAiChatSettingsSaved()
    toolbarTick += 1
    error = null
  }

  function closeModal() {
    openModal = null
  }

  function openAiChatAccountSettings() {
    openAccountSettings('aiChat')
  }

  function requiresApiKeyUnlock(): boolean {
    return Boolean(activeApiKeyId) && !isApiKeyUnlocked(activeApiKeyId)
  }

  function openUnlockModalForActiveKey(prompt: string | null = null) {
    const apiKeyId = activeApiKeyId
    if (!apiKeyId) return

    const key = getApiKeyById(apiKeyId)
    if (!key) return

    pendingSendPrompt = prompt
    unlockSuggestedKeyId = key.keyId || null
    unlockNoteKeyId = key.keyId || null
    unlockModalOpen = true
  }

  async function handleUnlockSuccess(payload: PasscodeSubmit) {
    unlockModalOpen = false
    const apiKeyId = activeApiKeyId
    if (!apiKeyId) return

    const key = getApiKeyById(apiKeyId)
    if (!key) return

    try {
      const plainValue = await decryptApiKeyValue(key, payload.code)
      setUnlockedApiKey(apiKeyId, plainValue)
      error = null
      toolbarTick += 1

      const queuedPrompt = pendingSendPrompt
      pendingSendPrompt = null
      if (queuedPrompt) {
        input = queuedPrompt
        await sendMessage()
      }
    } catch {
      error = t('wrongPasscode')
      pendingSendPrompt = null
    }
  }

  async function sendMessage() {
    const prompt = input.trim()
    if (!prompt || loading || disabled || !configured) return

    if (requiresApiKeyUnlock()) {
      openUnlockModalForActiveKey(prompt)
      input = ''
      return
    }

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
    }

    messages = [...messages, userMessage]
    input = ''
    loading = true
    error = null
    queueMicrotask(scrollToBottom)

    const controller = new AbortController()
    abortController = controller

    const apiMessages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ]

    const streamResponse = getAiChatSettings().stream
    const assistantId = crypto.randomUUID()

    if (streamResponse) {
      messages = [...messages, { id: assistantId, role: 'assistant', content: '' }]
      queueMicrotask(scrollToBottom)
    }

    try {
      const reply = await chatCompletion(apiMessages, {
        signal: controller.signal,
        onChunk: streamResponse
          ? (content) => {
              messages = messages.map((message) =>
                message.id === assistantId ? { ...message, content } : message,
              )
              queueMicrotask(scrollToBottom)
            }
          : undefined,
      })

      if (streamResponse) {
        messages = messages.map((message) =>
          message.id === assistantId ? { ...message, content: reply } : message,
        )
      } else {
        messages = [
          ...messages,
          {
            id: assistantId,
            role: 'assistant',
            content: reply,
          },
        ]
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (streamResponse) {
          messages = messages.filter(
            (message) => message.id !== assistantId || message.content.trim(),
          )
        }
        return
      }
      error = err instanceof Error ? err.message : t('aiChatError')
      messages = messages.filter(
        (message) => message.id !== userMessage.id && message.id !== assistantId,
      )
      input = prompt
    } finally {
      loading = false
      abortController = null
      queueMicrotask(scrollToBottom)
    }
  }

  function stopGeneration() {
    abortController?.abort()
    loading = false
    abortController = null
  }

  function clearChat() {
    if (loading) stopGeneration()
    messages = []
    error = null
    input = ''
    clearUnlockedApiKey()
    toolbarTick += 1
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  function formatChatMessage(message: UiMessage): string {
    const roleLabel = message.role === 'user' ? t('aiChatYou') : t('aiChatAssistant')
    return `${roleLabel}:\n${message.content.trim()}`
  }

  function formatAllChatMessages(): string {
    return messages.map(formatChatMessage).join('\n\n')
  }

  async function copyAllChat() {
    const text = formatAllChatMessages().trim()
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      toastSuccess(t('aiChatCopied'))
    } catch {
      toastError(t('aiChatCopyFailed'))
    }
  }

  function insertAllToNote() {
    const text = formatAllChatMessages().trim()
    if (!text) return
    onInsert(text)
  }

  function toggleOpen() {
    const wasOpen = open
    open = !open
    if (wasOpen) {
      clearUnlockedApiKey()
      toolbarTick += 1
    } else {
      refreshConfiguredState()
      queueMicrotask(scrollToBottom)
    }
  }
</script>

<div class="ai-chat" class:open>
  {#if open}
    <section class="ai-chat-panel" aria-label={t('aiChat')}>
      {#if !configured}
        <div class="ai-chat-messages">
          <p class="ai-chat-empty">{t('aiChatNeedApiKey')}</p>
          <div class="ai-chat-setup-actions">
            <button type="button" class="ai-chat-setup-btn" onclick={() => (openModal = 'provider')}>
              {t('aiPickerManageProviders')}
            </button>
            <button type="button" class="ai-chat-setup-btn" onclick={() => (openModal = 'apiKey')}>
              {t('aiPickerManageApiKeys')}
            </button>
          </div>
        </div>
      {:else}
        <div class="ai-chat-messages" bind:this={messagesEl}>
          {#if messages.length === 0}
            <p class="ai-chat-empty">{t('aiChatEmpty')}</p>
          {:else}
            {#each messages as message (message.id)}
              <article class="ai-chat-message" class:user={message.role === 'user'}>
                <span class="ai-chat-role">
                  {message.role === 'user' ? t('aiChatYou') : t('aiChatAssistant')}
                </span>
                <p>{message.content}</p>
                <button
                  type="button"
                  class="ai-chat-insert"
                  onclick={() => onInsert(message.content)}
                >
                  {t('aiChatInsert')}
                </button>
              </article>
            {/each}
          {/if}

          {#if loading}
            <article class="ai-chat-message ai-chat-typing" aria-label={t('aiChatTyping')}>
              <span class="ai-chat-role">{t('aiChatAssistant')}</span>
              <p class="ai-chat-typing-dots" aria-hidden="true">
                <span></span><span></span><span></span>
              </p>
            </article>
          {/if}
        </div>

        {#if error}
          <p class="ai-chat-error">{error}</p>
        {/if}
      {/if}

      <footer class="ai-chat-footer">
        {#if configured}
          <textarea
            class="ai-chat-input"
            bind:value={input}
            placeholder={t('aiChatPlaceholder')}
            rows="2"
            disabled={loading || disabled}
            onkeydown={handleKeydown}
          ></textarea>
        {/if}

        <div class="ai-chat-actions">
          <div class="ai-chat-toolbar">
            <button
              type="button"
              class="ai-toolbar-btn ai-toolbar-picker"
              onclick={() => (openModal = 'provider')}
              title={providerButtonLabel}
            >
              <span class="ai-toolbar-picker-label">{providerButtonLabel}</span>
            </button>
            <button
              type="button"
              class="ai-toolbar-btn ai-toolbar-picker"
              onclick={() => (openModal = 'model')}
              title={modelButtonLabel}
            >
              <span class="ai-toolbar-picker-label">{modelButtonLabel}</span>
            </button>
            <button
              type="button"
              class="ai-toolbar-btn ai-toolbar-picker"
              onclick={() => (openModal = 'apiKey')}
              title={apiKeyButtonLabel}
            >
              <span class="ai-toolbar-picker-label">{apiKeyButtonLabel}</span>
            </button>
          </div>
          {#if configured}
            {#if loading}
              <button type="button" class="ai-chat-stop" onclick={stopGeneration}>
                {t('aiChatStop')}
              </button>
            {:else}
              <button
                type="button"
                class="ai-chat-send"
                onclick={sendMessage}
                disabled={!input.trim() || disabled}
              >
                {t('aiChatSend')}
              </button>
            {/if}
          {/if}
        </div>
      </footer>
    </section>
  {/if}

  <div class="ai-chat-controls">
    {#if open}
      {#if !aiFeatures.disableAiChat && messages.length === 0}
        <button
          type="button"
          class="ai-toolbar-setup"
          onclick={openAiChatAccountSettings}
          title={t('aiSettingsToggleAccountHint')}
          aria-label={isUserAiChatEnabled()
            ? t('aiSettingsToggleAccountOn')
            : t('aiSettingsToggleAccountOff')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.63-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58ZM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6Z"
            />
          </svg>
        </button>
      {/if}
      {#if messages.length > 0}
      <button
        type="button"
        class="ai-chat-action"
        onclick={copyAllChat}
        title={t('aiChatCopyAll')}
      >
        {t('aiChatCopyAll')}
      </button>
      <button
        type="button"
        class="ai-chat-action"
        onclick={insertAllToNote}
        title={t('aiChatInsertAll')}
      >
        {t('aiChatInsertAll')}
      </button>
      <button
        type="button"
        class="ai-chat-action"
        onclick={clearChat}
        disabled={loading}
        title={t('aiChatClear')}
      >
        {t('aiChatClear')}
      </button>
      {/if}
    {/if}
    <button
      type="button"
      class="ai-chat-toggle"
      onclick={toggleOpen}
      disabled={disabled}
      aria-expanded={open}
      aria-label={open ? t('aiChatClose') : t('aiChatOpen')}
      title={open ? t('aiChatClose') : t('aiChatOpen')}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z"
          fill="currentColor"
        />
      </svg>
      <span>{t('aiChat')}</span>
    </button>
  </div>
</div>

<EditorAiSettings
  bind:openModal
  activateOnSelect={true}
  onClose={closeModal}
  onChanged={handleSettingsChanged}
  onManageEncryptionKeys={onManageEncryptionKeys}
/>

<KeySelectModal
  open={unlockModalOpen}
  title={t('selectKeyToUnlockApiKey')}
  subtitle={t('aiApiKeyUnlockHint')}
  suggestedKeyId={unlockSuggestedKeyId}
  noteKeyId={unlockNoteKeyId}
  onClose={() => {
    unlockModalOpen = false
    pendingSendPrompt = null
  }}
  onSuccess={handleUnlockSuccess}
  onManageKeys={onManageEncryptionKeys}
/>

<style>
  .ai-chat {
    position: absolute;
    right: 1rem;
    bottom: 1rem;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.75rem;
    max-width: min(460px, calc(100% - 2rem));
  }

  .ai-chat-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .ai-chat-action {
    display: inline-flex;
    align-items: center;
    padding: 0.55rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text-muted);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
    white-space: nowrap;
    transition:
      border-color 0.2s,
      color 0.2s;
  }

  .ai-chat-action:hover:not(:disabled) {
    color: var(--text);
    border-color: var(--accent);
  }

  .ai-chat-action:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ai-chat-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
    transition:
      border-color 0.2s,
      background 0.2s;
  }

  .ai-chat-toggle svg {
    width: 1rem;
    height: 1rem;
    color: var(--accent);
  }

  .ai-chat-toggle:hover:not(:disabled) {
    border-color: var(--accent);
  }

  .ai-chat-toggle:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ai-chat-panel {
    width: min(440px, calc(100vw - 2rem));
    max-height: min(78vh, 620px);
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  .ai-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ai-chat-empty {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .ai-chat-setup-actions {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-top: 0.75rem;
  }

  .ai-chat-setup-btn {
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }

  .ai-chat-setup-btn:hover {
    border-color: var(--accent);
  }

  .ai-chat-message {
    margin: 0;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    background: color-mix(in srgb, var(--text-muted) 10%, transparent);
  }

  .ai-chat-message.user {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .ai-chat-role {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .ai-chat-message p {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.88rem;
    line-height: 1.55;
    color: var(--text);
  }

  .ai-chat-typing-dots {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 1.35rem;
  }

  .ai-chat-typing-dots span {
    width: 0.42rem;
    height: 0.42rem;
    border-radius: 50%;
    background: var(--text-muted);
    animation: ai-chat-typing-bounce 1.2s ease-in-out infinite;
  }

  .ai-chat-typing-dots span:nth-child(2) {
    animation-delay: 0.15s;
  }

  .ai-chat-typing-dots span:nth-child(3) {
    animation-delay: 0.3s;
  }

  @keyframes ai-chat-typing-bounce {
    0%,
    60%,
    100% {
      transform: translateY(0);
      opacity: 0.45;
    }
    30% {
      transform: translateY(-0.28rem);
      opacity: 1;
    }
  }

  .ai-chat-insert {
    margin-top: 0.5rem;
    padding: 0.3rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }

  .ai-chat-insert:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  .ai-chat-error {
    margin: 0;
    padding: 0 1rem 0.5rem;
    font-size: 0.8rem;
    color: var(--danger);
  }

  .ai-chat-footer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem 1rem;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .ai-chat-input {
    width: 100%;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: 0.88rem;
    line-height: 1.45;
    resize: vertical;
    min-height: 3.25rem;
  }

  .ai-chat-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--input-focus-ring);
  }

  .ai-chat-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .ai-chat-toolbar {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: nowrap;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .ai-toolbar-setup {
    display: grid;
    place-items: center;
    width: 2.15rem;
    height: 2.15rem;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text-muted);
    cursor: pointer;
    flex-shrink: 0;
    box-shadow: var(--shadow-lg);
    transition:
      border-color 0.2s,
      color 0.2s;
  }

  .ai-toolbar-setup svg {
    width: 1rem;
    height: 1rem;
  }

  .ai-toolbar-setup:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  .ai-toolbar-btn {
    padding: 0.38rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-muted);
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
  }

  .ai-toolbar-picker {
    flex: 1 1 0;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .ai-toolbar-picker-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ai-toolbar-btn:hover:not(:disabled) {
    color: var(--text);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  }

  .ai-toolbar-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ai-chat-send,
  .ai-chat-stop {
    padding: 0.45rem 0.9rem;
    border: none;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }

  .ai-chat-send {
    background: var(--accent);
    color: white;
  }

  .ai-chat-send:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ai-chat-stop {
    background: var(--danger-bg);
    color: var(--danger);
    border: 1px solid color-mix(in srgb, var(--danger) 35%, var(--border));
  }

  @media (max-width: 480px) {
    .ai-chat-toolbar {
      width: 100%;
    }

    .ai-toolbar-picker {
      flex: 1 1 0;
      min-width: 0;
      padding-inline: 0.4rem;
    }

  }
</style>