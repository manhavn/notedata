# NoteData

> **English:** See [README.md](README.md) for the English version.

Ứng dụng ghi chú cá nhân xây dựng bằng **Svelte 5 + Vite**, sử dụng **Firebase Authentication** và **Firebase Realtime Database**. Mỗi người dùng chỉ truy cập được dữ liệu của chính mình.

## Tính năng

### Xác thực

- Đăng ký / đăng nhập bằng Email + Password
- Đăng ký / đăng nhập bằng Google
- Bắt buộc đăng nhập trước khi sử dụng app

### Ghi chú

- Tạo, sửa và lưu ghi chú
- Đồng bộ realtime theo `userId`
- Danh sách phân trang với nút **Tải thêm** (20 ghi chú mỗi lần)
- **Thùng rác** — xóa mềm, có thể khôi phục hoặc xóa vĩnh viễn

### Thao tác hàng loạt

- Checkbox chọn từng ghi chú và **Chọn tất cả** (các mục đang hiển thị)
- Xóa hàng loạt (chuyển vào thùng rác)
- Export hàng loạt các ghi chú đã chọn ra JSON
- Khôi phục hoặc xóa vĩnh viễn hàng loạt trong thùng rác

### Import / Export

- **Export** ghi chú đã chọn thành file `.json`
- **Import** ghi chú từ JSON (mảng, `{ notes: [...] }`, hoặc định dạng export của NoteData)

### Mã hóa ghi chú

- Mã hóa **nội dung ghi chú** (tiêu đề vẫn hiển thị dạng plain text trên sidebar)
- Nhiều **mã 6 chữ số** trên mỗi trình duyệt, lưu trong `localStorage` (`notedata-encryption-keys`) — không gửi lên Firebase
- **Quản lý mã khóa** qua biểu tượng khóa trên header (tạo, xem danh sách, xóa)
- **Khi lưu:** chọn mã đã lưu hoặc nhập mã tự nhập (nhập 2 lần để xác nhận)
- **Khi mở khóa:** mặc định nhập mã thủ công; có thể chuyển sang **Chọn từ danh sách đã lưu**
- Mã hóa AES-GCM qua Web Crypto API; database chỉ lưu `encrypted: true` và `keyId`
- Sai mã chỉ hiện thông báo chung trên ghi chú — không gợi ý trong popup (chống đoán mã)

### Dark mode

- **Mặc định dark mode** khi truy cập lần đầu
- Nút switch ở header (giữa email và Đăng xuất) và màn hình đăng nhập
- Lưu preference trong `localStorage` với key `notedata-theme` (`dark` hoặc `light`)
- Màu sắc dùng CSS variables trong `src/app.css` qua `data-theme` trên `<html>`

### Đa ngôn ngữ (i18n)

- **Mặc định tiếng Anh**, hỗ trợ thêm **tiếng Việt**
- Nút **EN / VI** ở header và màn hình đăng nhập
- Lưu preference trong `localStorage` với key `notedata-locale` (`en` hoặc `vi`)
- Dịch toàn bộ UI, hộp thoại xác nhận, lỗi auth và thông báo import
- File dịch nằm tại `src/lib/i18n/translations.ts`

### Triển khai

- Build và deploy lên Firebase Hosting
- Deploy security rules Realtime Database theo từng user

## Yêu cầu

- [Node.js](https://nodejs.org/) 18 trở lên
- [npm](https://www.npmjs.com/)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- Tài khoản Google để tạo project trên [Firebase Console](https://console.firebase.google.com/)

---

## Hướng dẫn cài đặt từng bước

Tài liệu này giúp bạn chạy project với **bất kỳ Firebase project nào**, không chỉ project mặc định.

### Bước 1: Tạo Firebase project mới

1. Mở [Firebase Console](https://console.firebase.google.com/)
2. Chọn **Add project** (hoặc **Tạo dự án**)
3. Đặt tên project, làm theo các bước hướng dẫn và tạo xong
4. Ghi lại **Project ID** (ví dụ: `my-notes-app`)

### Bước 2: Bật Firebase Realtime Database

1. Trong Firebase Console, vào **Build → Realtime Database**
2. Chọn **Create Database**
3. Chọn region gần bạn (ví dụ: `asia-southeast1`)
4. Chọn **Start in test mode** tạm thời (sẽ deploy rules bảo mật ở bước sau)
5. Copy **Database URL**, có dạng:

```
https://<project-id>-default-rtdb.<region>.firebasedatabase.app
```

Ví dụ:

```
https://my-notes-app-default-rtdb.asia-southeast1.firebasedatabase.app
```

### Bước 3: Bật Firebase Authentication

1. Vào **Build → Authentication → Get started**
2. Tab **Sign-in method**, bật các provider sau:

#### Email/Password

- Chọn **Email/Password**
- Bật **Enable**
- Lưu lại

#### Google

- Chọn **Google**
- Bật **Enable**
- Chọn **Project support email**
- Lưu lại

### Bước 4: Tạo Web App và lấy cấu hình

1. Vào **Project settings** (biểu tượng bánh răng)
2. Tab **General → Your apps**
3. Chọn **Web** (`</>`) để thêm app mới
4. Đặt nickname (ví dụ: `notedata-web`) và **Register app**
5. Copy các giá trị trong `firebaseConfig`:

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

### Bước 5: Cấu hình Authorized domains (nếu deploy production)

1. Vào **Authentication → Settings → Authorized domains**
2. Đảm bảo có:
   - `localhost` (cho dev)
   - Domain hosting của bạn (ví dụ: `my-notes-app.web.app`)

Firebase thường tự thêm domain sau khi deploy hosting lần đầu.

### Bước 6: Clone project và cài dependencies

```bash
git clone <repository-url>
cd notedata
npm install
```

### Bước 7: Tạo file môi trường `.env`

```bash
cp .env.example .env
```

Mở `.env` và điền thông tin từ Firebase Console (Bước 4):

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Lưu ý:** Các biến `VITE_*` được Vite nhúng vào frontend khi build. Không commit file `.env` lên git.

### Bước 8: Liên kết Firebase CLI với project

Đăng nhập Firebase CLI:

```bash
firebase login
```

Liên kết project local với Firebase project mới:

```bash
firebase use --add
```

Chọn project vừa tạo. File `.firebaserc` sẽ được cập nhật, ví dụ:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Hoặc sửa trực tiếp `.firebaserc` nếu bạn biết Project ID.

### Bước 9: Deploy Database Rules

Project đã có file `database.rules.json` để mỗi user chỉ đọc/ghi dữ liệu của mình:

```
users/{userId}/notes/{noteId}
```

Deploy rules:

```bash
npm run firebase:deploy:database
```

### Bước 10: Chạy development

```bash
npm run dev
```

Mở URL hiển thị trong terminal (thường là `http://localhost:5173`).

Thử:

1. Đăng ký tài khoản email/password
2. Hoặc đăng nhập bằng Google
3. Tạo và lưu ghi chú

### Bước 11: Deploy lên Firebase Hosting

```bash
npm run firebase:deploy:hosting
```

Lệnh này sẽ:

1. Chạy `npm run build` (build ra thư mục `dist/`)
2. Deploy `dist/` lên Firebase Hosting

Sau khi deploy, Firebase cung cấp URL dạng:

```
https://your-project-id.web.app
```

---

## Cấu trúc dữ liệu

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

## Định dạng Import / Export

File export có dạng:

```json
{
  "version": 1,
  "exportedAt": 1710000000000,
  "notes": [
    {
      "title": "Ghi chú của tôi",
      "content": "Nội dung ghi chú",
      "createdAt": 1710000000000,
      "updatedAt": 1710000000000
    }
  ]
}
```

Import cũng hỗ trợ:

- Mảng thuần: `[{ "title": "...", "content": "..." }]`
- Một object ghi chú đơn có `title` và `content`

Ghi chú import sẽ được tạo mới trên Firebase (ID mới).

---

## Dark mode & i18n

### Cách hoạt động

| Cài đặt | Mặc định | Key lưu trữ | Giá trị |
|---------|----------|-------------|---------|
| Theme | `dark` | `notedata-theme` | `dark`, `light` |
| Ngôn ngữ | `en` | `notedata-locale` | `en`, `vi` |

Khởi tạo chạy trong `src/main.ts` qua `initTheme()` và `initLocale()` trước khi app mount.

### Đổi mặc định

- Theme mặc định: sửa `initTheme()` trong `src/lib/theme.svelte.ts`
- Ngôn ngữ mặc định: sửa `initLocale()` trong `src/lib/i18n.svelte.ts`
- HTML fallback: `data-theme="dark"` và `lang="en"` trong `index.html`

### Thêm hoặc sửa bản dịch

1. Mở `src/lib/i18n/translations.ts`
2. Thêm cùng key vào cả object `en` và `vi`
3. Dùng trong component với `t('yourKey')` từ `src/lib/i18n.svelte.ts`
4. Với text động, dùng placeholder: `t('selectedCount', { count: 3 })`

Ví dụ:

```ts
import { t } from '../i18n.svelte'

t('loadMore')
t('importSuccess', { count: 5 })
```

### Thêm ngôn ngữ mới

1. Thêm object locale mới trong `src/lib/i18n/translations.ts` (copy các key từ `en`)
2. Mở rộng type `Locale` và export `translations`
3. Thêm nút trong `src/lib/components/LocaleThemeControls.svelte`
4. Cập nhật `setLocale()` / `initLocale()` để nhận mã locale mới

---

## Scripts npm

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production vào `dist/` |
| `npm run preview` | Xem trước bản build |
| `npm run check` | Kiểm tra TypeScript + Svelte |
| `npm run lint` | Chạy oxlint + `npm run check` (script kiểm tra code thủ công) |
| `npm run firebase:deploy:database` | Deploy Realtime Database rules |
| `npm run firebase:deploy:hosting` | Build + deploy Firebase Hosting |

---

## Chuyển sang Firebase project khác (checklist nhanh)

Khi muốn dùng project Firebase mới, làm lần lượt:

1. Tạo project mới trên Firebase Console
2. Bật **Realtime Database** và copy `databaseURL`
3. Bật **Authentication**: Email/Password + Google
4. Tạo **Web app** và copy `firebaseConfig`
5. Cập nhật file `.env` với config mới
6. Chạy `firebase use --add` hoặc sửa `.firebaserc`
7. Chạy `npm run firebase:deploy:database`
8. Chạy `npm run dev` để test local
9. Chạy `npm run firebase:deploy:hosting` để deploy

---

## Xử lý lỗi thường gặp

### `auth/invalid-api-key` hoặc app không kết nối Firebase

- Kiểm tra lại `.env`, đảm bảo không có khoảng trắng thừa
- Restart dev server sau khi sửa `.env`

### Đăng nhập Google bị lỗi / popup bị chặn

- Bật Google provider trong Authentication
- Cho phép popup trên trình duyệt
- Kiểm tra domain hiện tại có trong **Authorized domains**

### `Permission denied` khi đọc/ghi ghi chú

- Chưa deploy database rules: chạy `npm run firebase:deploy:database`
- User chưa đăng nhập
- Rules chưa khớp cấu trúc `users/{uid}/notes`

### Không giải mã được ghi chú sau khi đổi trình duyệt hoặc xóa storage

- Mã khóa chỉ lưu trên `localStorage` của trình duyệt hiện tại
- Ghi chú khóa bằng **mã tự nhập** cần nhớ đúng mã đó
- Nên dùng mã đã lưu trên cùng một thiết bị/trình duyệt

### Deploy hosting xong nhưng vào URL bị trắng trang / 404

- Chạy lại `npm run firebase:deploy:hosting`
- Kiểm tra `firebase.json` trỏ `public` tới `dist`
- Kiểm tra rewrite SPA về `/index.html`

---

## Cấu trúc thư mục chính

```
src/
  lib/
    firebase.ts          # Khởi tạo Firebase từ biến môi trường
    auth.svelte.ts       # Đăng nhập, đăng ký, Google auth
    theme.svelte.ts      # Trạng thái dark/light và lưu preference
    i18n.svelte.ts       # Locale, hàm t(), format ngày
    i18n/
      translations.ts    # Chuỗi tiếng Anh và tiếng Việt
    notes.ts             # CRUD ghi chú, thùng rác, thao tác hàng loạt
    note-io.ts           # Import/export JSON
    pagination.ts        # Số lượng mỗi lần tải thêm
    crypto.ts            # Mã hóa/giải mã AES-GCM (Web Crypto)
    encryption-keys.ts   # CRUD mã khóa trong localStorage
    portal.ts            # Portal action cho modal
    components/
      LocaleThemeControls.svelte  # Nút EN/VI và switch dark mode
      KeyManagerModal.svelte      # Tạo/xóa mã khóa
      KeySelectModal.svelte       # Chọn mã khi lưu/mở khóa
      PasscodePad.svelte          # Bàn phím 6 số kiểu iPhone
      ...                # AuthPage, NotesApp, NoteSidebar, TrashSidebar, ...
scripts/
  run-manual-lint.sh     # Script oxlint + svelte-check
database.rules.json      # Security rules cho notes và trash
firebase.json            # Cấu hình Firebase Hosting + Database
.env.example             # Mẫu biến môi trường
public/
  favicon.svg            # Icon app
```

---

## Gợi ý IDE

[VS Code](https://code.visualstudio.com/) + extension [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)