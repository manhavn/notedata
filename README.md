# NoteData

> **Tiếng Việt:** Xem [README_vi.md](README_vi.md) để đọc bản tiếng Việt.

A personal notes app built with **Svelte 5 + Vite**, using **Firebase Authentication** and **Firebase Realtime Database**. Each user can only access their own data.

## Features

### Authentication

- Sign up / sign in with Email + Password
- Sign up / sign in with Google
- Login required before using the app

### Notes

- Create, edit, and save notes
- Realtime sync scoped by `userId`
- Paginated note list with **Load more** (20 items per page)
- Soft delete via **Trash** — restore or permanently delete later

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
- Multiple **6-digit passcodes** per browser, stored in `localStorage` (`notedata-encryption-keys`) — never sent to Firebase
- **Manage keys** from the lock icon in the header (create, list, delete)
- **Save flow:** pick a saved key or enter a one-time passcode (enter twice to confirm)
- **Unlock flow:** default screen is manual passcode entry; switch to **Choose from saved keys** if needed
- AES-GCM encryption via Web Crypto API; database stores `encrypted: true` and `keyId` only
- Wrong passcode shows a generic error on the note — no hints in the modal (anti-enumeration)

### Dark mode

- **Dark mode by default** on first visit
- Toggle switch in the header (between email and Sign out) and on the auth screen
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

### Step 5: Configure authorized domains (for production)

1. Go to **Authentication → Settings → Authorized domains**
2. Make sure these are listed:
   - `localhost` (for local development)
   - Your hosting domain (e.g. `my-notes-app.web.app`)

Firebase usually adds the hosting domain automatically after the first deploy.

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
```

> **Note:** `VITE_*` variables are embedded into the frontend at build time. Do not commit `.env` to git.

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

1. Register with email/password
2. Or sign in with Google
3. Create and save a note

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
        createdAt: number (timestamp)
        updatedAt: number (timestamp)
        encrypted?: boolean
        keyId?: string
    trash/
      {noteId}/
        title: string
        content: string
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
      "createdAt": 1710000000000,
      "updatedAt": 1710000000000
    }
  ]
}
```

Import also accepts:

- A plain array: `[{ "title": "...", "content": "..." }]`
- A single note object with `title` and `content`

Imported notes are created as new entries in Firebase (new IDs).

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
4. Create a **Web app** and copy `firebaseConfig`
5. Update `.env` with the new config
6. Run `firebase use --add` or edit `.firebaserc`
7. Run `npm run firebase:deploy:database`
8. Run `npm run dev` to test locally
9. Run `npm run firebase:deploy:hosting` to deploy

---

## Troubleshooting

### `auth/invalid-api-key` or the app cannot connect to Firebase

- Double-check `.env` and remove extra whitespace
- Restart the dev server after editing `.env`

### Google sign-in fails / popup blocked

- Enable the Google provider in Authentication
- Allow popups in your browser
- Make sure the current domain is in **Authorized domains**

### `Permission denied` when reading/writing notes

- Database rules not deployed yet: run `npm run firebase:deploy:database`
- User is not signed in
- Rules do not match the `users/{uid}/notes` structure

### Cannot decrypt a note after changing browser or clearing storage

- Encryption keys live only in the current browser's `localStorage`
- Notes locked with a **one-time passcode** require remembering that exact code
- Export keys or use saved keys consistently on the same device

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
    auth.svelte.ts       # Login, register, Google auth
    theme.svelte.ts      # Dark/light theme state and persistence
    i18n.svelte.ts       # Locale state, t(), date formatting
    i18n/
      translations.ts    # English and Vietnamese strings
    notes.ts             # Note CRUD, trash, bulk operations
    note-io.ts           # JSON import/export helpers
    pagination.ts        # Page size for load-more lists
    crypto.ts            # AES-GCM encrypt/decrypt (Web Crypto)
    encryption-keys.ts   # Passcode CRUD in localStorage
    portal.ts            # Portal action for modals
    components/
      LocaleThemeControls.svelte  # EN/VI toggle and dark mode switch
      KeyManagerModal.svelte      # Create/delete encryption keys
      KeySelectModal.svelte       # Pick key or passcode when save/unlock
      PasscodePad.svelte          # iPhone-style 6-digit pad
      ...                # AuthPage, NotesApp, NoteSidebar, TrashSidebar, ...
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