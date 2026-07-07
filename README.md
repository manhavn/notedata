# NoteData

> **Tiếng Việt:** Xem [README_vi.md](README_vi.md) để đọc bản tiếng Việt.

A personal notes app built with **Svelte 5 + Vite**, using **Firebase Authentication** and **Firebase Realtime Database**. Each user can only access their own data.

## Features

### Authentication

- Sign up / sign in with Email + Password
- Sign up / sign in with Google
- **Sign-up confirm password** — re-enter password on registration; client-side mismatch check before calling Firebase
- **Show/hide password** — eye toggle on auth and account password fields
- **Keyboard-friendly auth** — Enter submits the form; Tab order is email → password → eye → submit (forgot-password link sits below submit)
- **Forgot password** — Firebase sends a reset link by email (`sendPasswordResetEmail`)
- **Email verification** — after email/password sign-up, Firebase sends a verification link (`sendEmailVerification`); the app unlocks after the user verifies
- **Account settings** — display name (shown in the top bar), sign-in method chips, email verification status, change email (`verifyBeforeUpdateEmail`), change/add password, resend verification
- **Source code link** — GitHub repo link on the auth screen and in Account settings
- **Auth feature flags** — optionally disable sign-up, forgot password, change email, or change/add password via `VITE_DISABLE_*` env variables (UI + actions)
- Login required before using the app

### Notes

- Create, edit, and save notes
- **Tags** — comma-separated tags per note; add/remove in the editor; included in import/export
- **Search** — find notes by title or tag from the top bar (debounced; works alongside sort and pagination)
- **Sort** — title A–Z / Z–A, created/updated ascending or descending; preference saved in `localStorage` (`notedata-note-sort`)
- **Content view modes** — **TXT / MD / HTML** segmented toggle (same style as EN / VI): plain-text edit, Markdown preview (GFM via `marked`), or raw HTML preview (sanitized via DOMPurify)
- **Unsaved drafts** — edits are kept in memory while you switch notes; sidebar and editor show indicators; **Cancel edit** discards changes without saving (cleared on save or page reload)
- **Collapsible editor header** — collapse the title/tags toolbar for more writing space
- **Move to trash** — delete link in the editor header
- Realtime sync scoped by `userId`
- Paginated note list with **Load more** (20 items per page)
- Soft delete via **Trash** — restore, permanently delete, or **Empty trash**; quick **↩ restore** and **× delete** buttons on each trashed note in the sidebar
- **Mobile layout** — hamburger menu opens/closes the sidebar overlay on small screens

### AI chat assistant

- **Floating chat box** in the note editor — ask an AI to draft, edit, or summarize the current note
- **Provider-agnostic** — works with any **OpenAI-compatible** chat-completions API (custom URL, model, auth headers)
- **Import from cURL** — paste a `curl` command to auto-fill endpoint, authentication, model, and request params
- **Browser-only credentials** — API key and all AI settings live in `localStorage` (`notedata-ai-chat-settings`); never sent to Firebase
- **Save without API key** — store endpoint and model first, paste the API key and save again when ready
- **Note context** — system prompt template supports `{{noteTitle}}` and `{{noteContent}}` placeholders
- **Insert into note** — append the assistant reply to the editor content
- **Hidden on encrypted lock** — chat is unavailable until the note is unlocked
- **Disable via env** — set `VITE_DISABLE_AI_CHAT=true` to hide the chat box (default `false`, enabled)

### Bulk actions

- Checkbox selection per note and **Select all** (visible items)
- Bulk move to trash
- Bulk export selected notes as JSON
- Bulk restore or permanently delete in Trash

### Import / Export

- **Export** selected notes to a `.json` file
- **Import** notes from JSON (array, `{ notes: [...] }`, or NoteData export format)

### Note encryption

- Encrypt **note content** (title stays plain text for the sidebar list)
- Multiple **passcodes (6–32 characters)** per browser, stored in `localStorage` (`notedata-encryption-keys`) — never sent to Firebase
- **Manage keys** from the lock icon in the header (create, list, delete)
- **Save flow:** pick a saved key or enter a one-time passcode (enter twice to confirm)
- **Unlock flow:** default screen is manual passcode entry; switch to **Choose from saved keys** if needed
- Passcode entry uses a text field plus an on-screen numeric keypad; optional **auto-focus** toggle (`notedata-passcode-autofocus`)
- AES-GCM encryption via Web Crypto API; database stores `encrypted: true` and `keyId` only
- Wrong passcode shows a generic error on the note — no hints in the modal (anti-enumeration)

### Dark mode

- **Dark mode by default** on first visit
- Sun / moon icon toggle in the top bar (segmented control, same style as EN / VI) and on the auth screen
- Preference saved in `localStorage` under `notedata-theme` (`dark` or `light`)
- Theme colors are driven by CSS variables in `src/app.css` via `data-theme` on `<html>`

### Internationalization (i18n)

- **English by default**, with **Vietnamese** available
- **EN / VI** toggle in the header and on the auth screen
- Preference saved in `localStorage` under `notedata-locale` (`en` or `vi`)
- UI strings, confirmations, auth errors, and import messages are translated
- Translation files live in `src/lib/i18n/translations.ts`

### Deployment

- Build and deploy to Firebase Hosting
- Deploy Realtime Database security rules per user

## Requirements

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- A Google account to create a project in [Firebase Console](https://console.firebase.google.com/)

---

## Step-by-step setup

This guide helps you run the project with **any Firebase project**, not just the default one.

### Step 1: Create a new Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Name the project, follow the setup wizard, and finish creation
4. Note the **Project ID** (e.g. `my-notes-app`)

### Step 2: Enable Firebase Realtime Database

1. In Firebase Console, go to **Build → Realtime Database**
2. Click **Create Database**
3. Choose a region close to you (e.g. `asia-southeast1`)
4. Choose **Start in test mode** temporarily (you will deploy secure rules later)
5. Copy the **Database URL**, which looks like:

```
https://<project-id>-default-rtdb.<region>.firebasedatabase.app
```

Example:

```
https://my-notes-app-default-rtdb.asia-southeast1.firebasedatabase.app
```

### Step 3: Enable Firebase Authentication

1. Go to **Build → Authentication → Get started**
2. Open the **Sign-in method** tab and enable:

#### Email/Password

- Select **Email/Password**
- Turn on **Enable**
- Save

#### Google

- Select **Google**
- Turn on **Enable**
- Choose a **Project support email**
- Save

#### Password reset email (Forgot password)

The app uses Firebase **`sendPasswordResetEmail`**. After the user submits their email on the auth screen, Firebase emails a one-time reset link (if that email uses email/password sign-in).

Configure the email in Firebase Console:

1. Go to **Build → Authentication → Templates**
2. Open **Password reset**
3. Customize (recommended):
   - **Sender name** — e.g. `NoteData`
   - **Subject** and **body** — keep the `%LINK%` placeholder so the reset button/link works
   - **Reply-to** (optional)
4. Save

By default, the link opens a **Firebase-hosted** page where the user sets a new password, then returns to sign in on your app. You do not need a custom backend for this flow.

> **Google-only accounts:** If the user signed up with Google and never added a password, the reset email may not help them sign in with email/password. They should use **Sign in with Google**, or open **Account settings** (user icon in the top bar) and use **Add password**.

#### Email verification (email/password sign-up)

The app uses Firebase **`sendEmailVerification`** immediately after `createUserWithEmailAndPassword`. Until `emailVerified` is true, the user sees a dedicated verification screen (not the notes UI).

Configure the email in Firebase Console:

1. Go to **Build → Authentication → Templates**
2. Open **Email address verification**
3. Customize (recommended):
   - **Sender name** — e.g. `NoteData`
   - **Subject** and **body** — keep the `%LINK%` placeholder
4. Save

Flow:

1. User registers with email/password
2. Firebase emails a verification link
3. User opens the link (Firebase-hosted page by default)
4. User returns to the app and taps **Check verification status** (reloads the auth profile)
5. After verification, the main app opens

Google sign-in accounts **never** enter this gate — Firebase treats their email as already verified. If a Google user changes email later, `verifyBeforeUpdateEmail` still requires opening the **new** inbox (handled in Account settings).

#### Email address change (Account settings)

The app uses Firebase **`verifyBeforeUpdateEmail`** (not a direct `updateEmail` swap). The new address receives a verification link; the account email changes only after the user opens that link.

Before sending the link, the app **re-authenticates** the user:

- Email/password account → current password
- Google-only account → Google popup (`reauthenticateWithPopup`)

Configure the template:

1. Go to **Authentication → Templates**
2. Open **Email address change**
3. Keep the `%LINK%` placeholder in the body
4. Save

#### Account settings (in-app)

After sign-in, open the **user icon** in the top bar (right side):

| Feature | Firebase API | Notes |
|---------|--------------|-------|
| Display name | `updateProfile` | Shown in the top bar; falls back to email if empty |
| Change email | `reauthenticate` + `verifyBeforeUpdateEmail` | Verification link sent to the new inbox |
| Change password | `reauthenticateWithCredential` + `updatePassword` | Email/password accounts only |
| Add password | `linkWithCredential` | Google-only accounts can link email/password sign-in |
| Resend verification | `sendEmailVerification` | Email/password accounts only, when not yet verified |

Beyond enabling **Email/Password** and **Google**, customize the three templates above: **Password reset**, **Email address verification**, and **Email address change**.

### Step 4: Create a Web App and get the config

1. Go to **Project settings** (gear icon)
2. Open **General → Your apps**
3. Click **Web** (`</>`) to add a new app
4. Set a nickname (e.g. `notedata-web`) and click **Register app**
5. Copy the values from `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### Step 5: Configure authorized domains

Required for **Google sign-in**, **password reset**, **email verification**, **email change** links, and other auth redirects.

1. Go to **Authentication → Settings → Authorized domains**
2. Make sure these are listed:
   - `localhost` (for local development)
   - Your hosting domain (e.g. `my-notes-app.web.app` and `my-notes-app.firebaseapp.com`)

Firebase usually adds the hosting domain automatically after the first deploy. If reset links or Google login fail on production, add the missing domain here first.

### Step 6: Clone the project and install dependencies

```bash
git clone <repository-url>
cd notedata
npm install
```

### Step 7: Create the `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in the values from Firebase Console (Step 4):

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional — set to true to disable auth features (UI + actions)
VITE_DISABLE_SIGNUP_EMAIL_PASSWORD=false
VITE_DISABLE_SIGNUP_GOOGLE=false
VITE_DISABLE_FORGOT_PASSWORD=false
VITE_DISABLE_CHANGE_EMAIL=false
VITE_DISABLE_CHANGE_PASSWORD=false

# Optional — set to true to hide the AI chat box in the note editor
VITE_DISABLE_AI_CHAT=false
```

> **Note:** `VITE_*` variables are embedded into the frontend at build time. Do not commit `.env` to git.

#### Disable auth features (optional)

You can temporarily turn off specific auth flows without changing code. Set a variable to `true` (also accepts `1` or `yes`, case-insensitive) before starting the dev server or running a production build.

| Variable | When `true` | UI | Blocked action |
|----------|-------------|-----|----------------|
| `VITE_DISABLE_SIGNUP_EMAIL_PASSWORD` | Disable email/password sign-up | Hides the **Sign up** tab | `register()` |
| `VITE_DISABLE_SIGNUP_GOOGLE` | Disable Google sign-up | Hides the Google button on the sign-up tab | `loginWithGoogle('signup')` |
| `VITE_DISABLE_FORGOT_PASSWORD` | Disable forgot password | Hides **Forgot password?** | `requestPasswordReset()` |
| `VITE_DISABLE_CHANGE_EMAIL` | Disable change email | Hides the change-email section in Account settings | `requestEmailChange()` |
| `VITE_DISABLE_CHANGE_PASSWORD` | Disable change/add password | Hides the password section in Account settings | `changeAccountPassword()`, `addAccountPassword()` |

**Notes:**

- **Sign-in is not disabled** — only sign-up and account-management flows listed above are affected.
- **Google sign-in still works** when only `VITE_DISABLE_SIGNUP_GOOGLE` is `true`; the Google button remains on the sign-in tab.
- Flags are read at **build time**. After editing `.env`, restart `npm run dev` or run `npm run build` again before deploying.
- Implementation lives in `src/lib/auth-features.ts`; guards are applied in `src/lib/auth.svelte.ts` and the auth/account UI components.

Example — close registration and forgot password on a private instance:

```env
VITE_DISABLE_SIGNUP_EMAIL_PASSWORD=true
VITE_DISABLE_SIGNUP_GOOGLE=true
VITE_DISABLE_FORGOT_PASSWORD=true
```

#### Disable AI chat (optional)

Set `VITE_DISABLE_AI_CHAT=true` to hide the **AI** chat button in the note editor. Default is `false` (chat enabled). Read at build time via `src/lib/ai-features.ts`.

```env
VITE_DISABLE_AI_CHAT=true
```

### Step 8: Link Firebase CLI to your project

Log in to Firebase CLI:

```bash
firebase login
```

Link the local project to your Firebase project:

```bash
firebase use --add
```

Select the project you created. `.firebaserc` will be updated, for example:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Or edit `.firebaserc` directly if you already know the Project ID.

### Step 9: Deploy database rules

The project includes `database.rules.json` so each user can only read/write their own data:

```
users/{userId}/notes/{noteId}
```

Deploy the rules:

```bash
npm run firebase:deploy:database
```

### Step 10: Run development server

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

Try:

1. Register with email/password — check inbox for the **verification** email and open the link
2. Tap **Check verification status** on the verification screen to enter the app
3. Or sign in with Google (skips email verification)
4. Try **Forgot password?** on the login screen (below the submit button)
5. On sign-up, try the **confirm password** field and the **show/hide password** eye icon
6. Create and save a note — add tags, search, sort, switch **TXT / MD / HTML** preview, and try **Cancel edit** on unsaved changes
7. Open **Account settings** from the top-bar user icon to set a display name or change email
8. Open a note and click **AI** — import a cURL example or fill **Completions URL** + **Model**, save settings, then add your API key and chat

### Step 11: Deploy to Firebase Hosting

```bash
npm run firebase:deploy:hosting
```

This command will:

1. Run `npm run build` (output goes to `dist/`)
2. Deploy `dist/` to Firebase Hosting

After deploy, Firebase provides a URL like:

```
https://your-project-id.web.app
```

---

## Data structure

```
users/
  {userId}/
    notes/
      {noteId}/
        title: string
        content: string
        tags?: string (comma-separated in Firebase)
        createdAt: number (timestamp)
        updatedAt: number (timestamp)
        encrypted?: boolean
        keyId?: string
    trash/
      {noteId}/
        title: string
        content: string
        tags?: string (comma-separated in Firebase)
        createdAt: number (timestamp)
        updatedAt: number (timestamp)
        deletedAt: number (timestamp)
        encrypted?: boolean
        keyId?: string
```

---

## Import / Export format

Export produces a JSON file like:

```json
{
  "version": 1,
  "exportedAt": 1710000000000,
  "notes": [
    {
      "title": "My note",
      "content": "Note content",
      "tags": ["work", "ideas"],
      "createdAt": 1710000000000,
      "updatedAt": 1710000000000
    }
  ]
}
```

Import also accepts:

- A plain array: `[{ "title": "...", "content": "...", "tags": ["..."] }]`
- A single note object with `title` and `content` (optional `tags` array or comma-separated string)

Imported notes are created as new entries in Firebase (new IDs).

---

## AI chat assistant

### Quick start

1. Open a note (not in trash; encrypted notes must be **unlocked** first)
2. Click the **AI** button at the bottom-right of the editor
3. On first use, open **AI settings** (gear icon) or the settings panel opens automatically
4. Optional: expand **Import from cURL**, paste a chat-completions `curl` command, click **Parse & apply**
5. Set **Completions URL** and **Model** (required), adjust auth headers and generation params if needed
6. Click **Save settings** — you can save **without an API key** and add it later
7. Paste your **API key**, save again, then send messages in the chat panel
8. Use **Insert into note** on assistant replies to append text to the note

### Settings overview

| Field | Description |
|-------|-------------|
| Completions URL | Full chat-completions endpoint (e.g. `https://api.example.com/v1/chat/completions`) |
| API key | Bearer or custom auth value; stored only in this browser |
| Auth header name / prefix | e.g. `Authorization` + `Bearer `, or `x-api-key` with empty prefix |
| Model | Model id sent in the JSON body |
| Temperature, max tokens, top P, penalties | Optional generation params (omit field = not sent) |
| Stream | `stream` flag in the request body |
| System prompt | Template with `{{noteTitle}}` and `{{noteContent}}` |
| Extra headers / body | JSON objects merged into the request for provider-specific options |

### Import from cURL

Paste a command like:

```bash
curl https://api.example.com/v1/chat/completions \
  -H "Authorization: Bearer $YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"your-model","messages":[{"role":"user","content":"Hello"}]}'
```

The parser fills URL, auth header, model, and known body fields. Environment-variable placeholders (e.g. `$YOUR_API_KEY`) are not stored — enter the real key manually before chatting.

### Storage

| Data | Storage key | Sent to Firebase? |
|------|-------------|-------------------|
| AI settings + API key | `notedata-ai-chat-settings` | No |

### Disable the chat box

```env
VITE_DISABLE_AI_CHAT=true
```

Restart `npm run dev` or rebuild before deploy. Implementation: `src/lib/ai-features.ts`.

---

## Dark mode & i18n

### How it works

| Setting | Default | Storage key | Values |
|---------|---------|-------------|--------|
| Theme | `dark` | `notedata-theme` | `dark`, `light` |
| Language | `en` | `notedata-locale` | `en`, `vi` |

Initialization runs in `src/main.ts` via `initTheme()` and `initLocale()` before the app mounts.

### Change defaults

- Default theme: edit `initTheme()` in `src/lib/theme.svelte.ts`
- Default language: edit `initLocale()` in `src/lib/i18n.svelte.ts`
- HTML fallback: `data-theme="dark"` and `lang="en"` in `index.html`

### Add or edit translations

1. Open `src/lib/i18n/translations.ts`
2. Add the same key to both `en` and `vi` objects
3. Use it in components with `t('yourKey')` from `src/lib/i18n.svelte.ts`
4. For dynamic text, use placeholders: `t('selectedCount', { count: 3 })`

Example:

```ts
import { t } from '../i18n.svelte'

t('loadMore')
t('importSuccess', { count: 5 })
```

### Add a new language

1. Add a new locale object in `src/lib/i18n/translations.ts` (copy the `en` keys)
2. Extend the `Locale` type and `translations` export
3. Add a button in `src/lib/components/LocaleThemeControls.svelte`
4. Update `setLocale()` / `initLocale()` to accept the new locale code

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build production output to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run check` | Run TypeScript + Svelte checks |
| `npm run lint` | Run oxlint + `npm run check` (manual code quality script) |
| `npm run firebase:deploy:database` | Deploy Realtime Database rules |
| `npm run firebase:deploy:hosting` | Build + deploy Firebase Hosting |

---

## Switch to another Firebase project (quick checklist)

To use a new Firebase project:

1. Create a new project in Firebase Console
2. Enable **Realtime Database** and copy `databaseURL`
3. Enable **Authentication**: Email/Password + Google
4. Customize **Authentication → Templates**: Password reset, Email address verification, Email address change
5. Create a **Web app** and copy `firebaseConfig`
6. Update `.env` with the new config
7. Run `firebase use --add` or edit `.firebaserc`
8. Run `npm run firebase:deploy:database`
9. Run `npm run dev` to test locally (including forgot password)
10. Run `npm run firebase:deploy:hosting` to deploy
11. Confirm **Authorized domains** includes your hosting URL

---

## Troubleshooting

### `auth/invalid-api-key` or the app cannot connect to Firebase

- Double-check `.env` and remove extra whitespace
- Restart the dev server after editing `.env`

### Google sign-in fails / popup blocked

- Enable the Google provider in Authentication
- Allow popups in your browser
- Make sure the current domain is in **Authorized domains**

### Forgot password: no email received

- Check **spam/junk** folder
- Confirm **Email/Password** is enabled in Authentication → Sign-in method
- The account may be **Google-only** (no password set) — use Google sign-in or **Add password** in Account settings
- Firebase does not reveal whether an email is registered (anti-enumeration); the app always shows a generic success message
- Verify **Password reset** template is saved under Authentication → Templates
- On production, ensure the site domain is in **Authorized domains**

### Password reset link does not open or shows an error

- Add both `your-project.web.app` and `your-project.firebaseapp.com` to **Authorized domains**
- Do not remove `%LINK%` from the Password reset email template

### Email verification: stuck on the verification screen

- Open the verification link from the registration email (check spam)
- Tap **Check verification status** after opening the link — the app reloads the Firebase user profile
- Customize **Authentication → Templates → Email address verification**
- Use **Resend verification email** if the first message expired or was lost

### Email change: verification sent but address unchanged

- This is expected until the user opens the link in the **new** inbox
- Check **Email address change** template and **Authorized domains**

### `Permission denied` when reading/writing notes

- Database rules not deployed yet: run `npm run firebase:deploy:database`
- User is not signed in
- Rules do not match the `users/{uid}/notes` structure

### Cannot decrypt a note after changing browser or clearing storage

- Encryption keys live only in the current browser's `localStorage`
- Notes locked with a **one-time passcode** require remembering that exact code
- Export keys or use saved keys consistently on the same device

### AI chat: button missing

- Check `VITE_DISABLE_AI_CHAT` is not `true` in `.env`; rebuild or restart dev server after changes
- Chat is hidden for **read-only** views (trash) and **locked encrypted** notes

### AI chat: request fails or CORS error

- Confirm **Completions URL**, **Model**, and **API key** in AI settings
- The provider must allow browser requests from your origin (CORS), or use a proxy you control
- API key and settings are browser-only — they are not validated by NoteData's backend

### Blank page or 404 after hosting deploy

- Run `npm run firebase:deploy:hosting` again
- Check that `firebase.json` points `public` to `dist`
- Check the SPA rewrite to `/index.html`

---

## Project structure

```
src/
  lib/
    firebase.ts          # Initialize Firebase from env variables
    auth-features.ts     # VITE_DISABLE_* auth feature flags
    ai-features.ts       # VITE_DISABLE_AI_CHAT feature flag
    ai-settings.ts       # AI chat settings in localStorage
    ai-chat.ts           # OpenAI-compatible chat-completions client
    parse-curl-ai.ts     # Parse cURL into AI settings
    auth.svelte.ts       # Login, register, verification, password/email changes, profile
    theme.svelte.ts      # Dark/light theme state and persistence
    i18n.svelte.ts       # Locale state, t(), date formatting
    i18n/
      translations.ts    # English and Vietnamese strings
    notes.ts             # Note CRUD, trash, search, sort, bulk operations
    note-io.ts           # JSON import/export helpers
    draft-content.ts     # In-memory unsaved note content drafts
    markdown.ts          # Markdown and HTML preview rendering (DOMPurify)
    pagination.ts        # Page size for load-more lists
    passcode.ts          # Passcode length constants
    passcode-focus.svelte.ts  # Auto-focus passcode input preference
    crypto.ts            # AES-GCM encrypt/decrypt (Web Crypto)
    encryption-keys.ts   # Passcode CRUD in localStorage
    portal.ts            # Portal action for modals
    components/
      AuthPage.svelte             # Login, register, forgot password
      PasswordInput.svelte        # Password field with show/hide toggle
      LocaleThemeControls.svelte  # EN/VI and sun/moon theme segmented toggles
      KeyManagerModal.svelte      # Create/delete encryption keys
      KeySelectModal.svelte       # Pick key or passcode when save/unlock
      PasscodePad.svelte          # Passcode entry with keypad
      UserAccountModal.svelte     # Display name, email, and password management
      EmailVerificationScreen.svelte  # Post-sign-up email verification gate
      EditorAiChat.svelte           # Floating AI chat in the note editor
      EditorAiSettings.svelte       # AI provider settings and cURL import
      ...                # NotesApp, NoteEditor, NoteSidebar, TrashSidebar, ...
scripts/
  run-manual-lint.sh     # oxlint + svelte-check manual lint script
database.rules.json      # Security rules for notes and trash
firebase.json            # Firebase Hosting + Database config
.env.example             # Environment variable template
public/
  favicon.svg            # App icon
```

---

## Recommended IDE

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) extension