<script lang="ts">
  import { flip } from 'svelte/animate'
  import { fly } from 'svelte/transition'
  import { t } from '../i18n.svelte'
  import { portal } from '../portal'
  import { dismissToast, pauseToast, resumeToast, toastState } from '../toast.svelte'
</script>

<div class="toast-viewport" use:portal aria-live="polite" aria-relevant="additions">
  {#each toastState.items as item (item.id)}
    <div
      class="toast"
      class:variant-success={item.variant === 'success'}
      class:variant-error={item.variant === 'error'}
      class:variant-warning={item.variant === 'warning'}
      class:variant-info={item.variant === 'info'}
      role="status"
      in:fly={{ x: 320, duration: 340, opacity: 0 }}
      out:fly={{ x: 320, duration: 260, opacity: 0 }}
      animate:flip={{ duration: 300 }}
      onmouseenter={() => pauseToast(item.id)}
      onmouseleave={() => resumeToast(item.id)}
    >
      <div class="toast-icon" aria-hidden="true">
        {#if item.variant === 'success'}
          <svg viewBox="0 0 24 24">
            <path
              d="M20 6L9 17l-5-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {:else if item.variant === 'error'}
          <svg viewBox="0 0 24 24">
            <path
              d="M15 9l-6 6M9 9l6 6"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        {:else if item.variant === 'warning'}
          <svg viewBox="0 0 24 24">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path
              d="M12 10v6M12 7h.01"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        {/if}
      </div>

      <p class="toast-message">{item.message}</p>

      <button
        type="button"
        class="toast-close"
        aria-label={t('toastDismiss')}
        onclick={() => dismissToast(item.id)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M18 6L6 18M6 6l12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <span
        class="toast-progress"
        style:--toast-duration="{item.duration}ms"
        aria-hidden="true"
      ></span>
    </div>
  {/each}
</div>

<style>
  .toast-viewport {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 110;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    width: min(92vw, 380px);
    pointer-events: none;
  }

  .toast {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: start;
    gap: 0.75rem;
    padding: 0.9rem 0.85rem 1rem;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    pointer-events: auto;
  }

  .toast-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    margin-top: 0.05rem;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .toast-icon svg {
    width: 18px;
    height: 18px;
  }

  .variant-success .toast-icon {
    background: var(--success-bg);
    color: var(--success);
  }

  .variant-error .toast-icon {
    background: var(--danger-bg);
    color: var(--danger);
  }

  .variant-warning .toast-icon {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
  }

  .variant-info .toast-icon {
    background: color-mix(in srgb, var(--text-muted) 16%, transparent);
    color: var(--text-muted);
  }

  .toast-message {
    margin: 0.2rem 0 0;
    color: var(--text);
    font-size: 0.9rem;
    line-height: 1.45;
    text-align: left;
  }

  .toast-close {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    flex-shrink: 0;
  }

  .toast-close svg {
    width: 14px;
    height: 14px;
  }

  .toast-close:hover {
    background: var(--bg);
    color: var(--text);
  }

  .toast-progress {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    transform-origin: left center;
    animation: toast-progress var(--toast-duration) linear forwards;
    background: currentColor;
    opacity: 0.55;
  }

  .variant-success .toast-progress {
    color: var(--success);
  }

  .variant-error .toast-progress {
    color: var(--danger);
  }

  .variant-warning .toast-progress {
    color: var(--accent);
  }

  .variant-info .toast-progress {
    color: var(--text-muted);
  }

  .toast:hover .toast-progress {
    animation-play-state: paused;
  }

  @keyframes toast-progress {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }

  @media (max-width: 768px) {
    .toast-viewport {
      top: auto;
      right: 0.75rem;
      left: 0.75rem;
      bottom: 0.85rem;
      width: auto;
    }
  }
</style>