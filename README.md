# NoteData

Ứng dụng ghi chú cá nhân xây dựng bằng **Svelte 5 + Vite**, sử dụng **Firebase Authentication** và **Firebase Realtime Database**. Mỗi người dùng chỉ truy cập được dữ liệu của chính mình.

## Tính năng

- Đăng ký / đăng nhập bằng Email + Password
- Đăng ký / đăng nhập bằng Google
- Tạo, sửa, xóa ghi chú
- Đồng bộ realtime theo `userId`
- Deploy lên Firebase Hosting

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
```

---

## Scripts npm

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production vào `dist/` |
| `npm run preview` | Xem trước bản build |
| `npm run check` | Kiểm tra TypeScript + Svelte |
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
    notes.ts             # CRUD ghi chú trên Realtime Database
    components/          # UI: AuthPage, NotesApp, ...
database.rules.json      # Security rules cho Realtime Database
firebase.json            # Cấu hình Firebase Hosting + Database
.env.example             # Mẫu biến môi trường
```

---

## Gợi ý IDE

[VS Code](https://code.visualstudio.com/) + extension [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)