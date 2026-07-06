import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initLocale } from './lib/i18n.svelte'
import { initPasscodeFocus } from './lib/passcode-focus.svelte'
import { initTheme } from './lib/theme.svelte'

initTheme()
initLocale()
initPasscodeFocus()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
