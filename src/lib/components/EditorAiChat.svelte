<script lang="ts">
  import { chatCompletion, type ChatMessage } from '../ai-chat'
  import {
    getAiChatSettings,
    hasAiChatSettingsSaved,
    isAiChatConfigured,
    renderSystemPrompt,
  } from '../ai-settings'
  import { t } from '../i18n.svelte'
  import EditorAiSettings from './EditorAiSettings.svelte'

  interface Props {
    noteTitle: string
    noteContent: string
    disabled?: boolean
    onInsert: (text: string) => void
  }

  let { noteTitle, noteContent, disabled = false, onInsert }: Props = $props()

  interface UiMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
  }

  let open = $state(false)
  let showSettings = $state(false)
  let configured = $state(isAiChatConfigured())
  let settingsSaved = $state(hasAiChatSettingsSaved())
  let input = $state('')
  let messages = $state<UiMessage[]>([])
  let loading = $state(false)
  let error = $state<string | null>(null)
  let abortController = $state<AbortController | null>(null)
  let messagesEl = $state<HTMLDivElement | undefined>(undefined)

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
      showSettings = true
    }
  }

  function handleSettingsSaved() {
    configured = isAiChatConfigured()
    settingsSaved = hasAiChatSettingsSaved()
    if (configured || settingsSaved) {
      showSettings = false
    }
    error = null
  }

  function openSettings() {
    showSettings = true
    error = null
  }

  function closeSettings() {
    if (!configured && !settingsSaved) return
    showSettings = false
    error = null
  }

  async function sendMessage() {
    const prompt = input.trim()
    if (!prompt || loading || disabled || !configured) return

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

    try {
      const reply = await chatCompletion(apiMessages, { signal: controller.signal })
      messages = [
        ...messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply,
        },
      ]
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (err instanceof Error && err.message === 'AI_SETTINGS_API_KEY_REQUIRED') {
        configured = false
        showSettings = true
        error = t('aiApiKeyRequired')
      } else {
        error = err instanceof Error ? err.message : t('aiChatError')
      }
      messages = messages.filter((message) => message.id !== userMessage.id)
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
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  function toggleOpen() {
    open = !open
    if (open) {
      refreshConfiguredState()
      queueMicrotask(scrollToBottom)
    }
  }
</script>

<div class="ai-chat" class:open>
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

  {#if open}
    <section class="ai-chat-panel" aria-label={t('aiChat')}>
      <header class="ai-chat-header">
        <div>
          <h3>{t('aiChat')}</h3>
          <p>{showSettings ? t('aiSettingsSubtitle') : t('aiChatHint')}</p>
        </div>
        <div class="ai-chat-header-actions">
          {#if !showSettings}
            <button type="button" class="ai-chat-icon-btn" onclick={openSettings} title={t('aiSettingsTitle')}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7.4-2.9.9-.7a1 1 0 0 0 .3-1.1l-.8-1.4a1 1 0 0 0-1-.5l-1.1.2a7.2 7.2 0 0 0-1.2-.7l-.2-1.1a1 1 0 0 0-.5-1l-1.4-.8a1 1 0 0 0-1.1.3l-.7.9a7.5 7.5 0 0 0-1.4 0l-.7-.9a1 1 0 0 0-1.1-.3l-1.4.8a1 1 0 0 0-.5 1l-.2 1.1c-.4.2-.8.5-1.2.7l-1.1-.2a1 1 0 0 0-1 .5l-.8 1.4a1 1 0 0 0 .3 1.1l.9.7a7.5 7.5 0 0 0 0 1.4l-.9.7a1 1 0 0 0-.3 1.1l.8 1.4a1 1 0 0 0 1 .5l1.1-.2c.4.3.8.5 1.2.7l.2 1.1a1 1 0 0 0 .5 1l1.4.8a1 1 0 0 0 1.1-.3l.7-.9c.5.1.9.1 1.4 0l.7.9a1 1 0 0 0 1.1.3l1.4-.8a1 1 0 0 0 .5-1l.2-1.1c.4-.2.8-.5 1.2-.7l1.1.2a1 1 0 0 0 1-.5l.8-1.4a1 1 0 0 0-.3-1.1Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button type="button" class="ai-chat-clear" onclick={clearChat} disabled={loading || messages.length === 0}>
              {t('aiChatClear')}
            </button>
          {/if}
        </div>
      </header>

      {#if showSettings}
        <EditorAiSettings
          canCancel={configured || settingsSaved}
          onSaved={handleSettingsSaved}
          onCancel={closeSettings}
        />
      {:else if !configured}
        <div class="ai-chat-messages">
          <p class="ai-chat-empty">{t('aiChatNeedApiKey')}</p>
          <button type="button" class="ai-chat-open-settings" onclick={openSettings}>
            {t('aiSettingsTitle')}
          </button>
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
                {#if message.role === 'assistant'}
                  <button
                    type="button"
                    class="ai-chat-insert"
                    onclick={() => onInsert(message.content)}
                  >
                    {t('aiChatInsert')}
                  </button>
                {/if}
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

        <footer class="ai-chat-footer">
          <textarea
            class="ai-chat-input"
            bind:value={input}
            placeholder={t('aiChatPlaceholder')}
            rows="2"
            disabled={loading || disabled}
            onkeydown={handleKeydown}
          ></textarea>
          <div class="ai-chat-actions">
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
          </div>
        </footer>
      {/if}
    </section>
  {/if}
</div>

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

  .ai-chat-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .ai-chat-header h3 {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text);
  }

  .ai-chat-header p {
    margin: 0.2rem 0 0;
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .ai-chat-header-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .ai-chat-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .ai-chat-icon-btn svg {
    width: 1rem;
    height: 1rem;
  }

  .ai-chat-icon-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--text-muted) 12%, transparent);
  }

  .ai-chat-clear {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0.2rem 0;
  }

  .ai-chat-clear:hover:not(:disabled) {
    color: var(--text);
  }

  .ai-chat-clear:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .ai-chat-open-settings {
    margin-top: 0.75rem;
    padding: 0.45rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }

  .ai-chat-open-settings:hover {
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
    justify-content: flex-end;
  }

  .ai-chat-send,
  .ai-chat-stop {
    padding: 0.45rem 0.9rem;
    border: none;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
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
</style>