# NoteData

> **English:** See [README.md](README.md) for the English version.

Ứng dụng ghi chú cá nhân xây dựng bằng **Svelte 5 + Vite**, sử dụng **Firebase Authentication** và **Firebase Realtime Database**. Mỗi người dùng chỉ truy cập được dữ liệu của chính mình.

## Tính năng

### Xác thực

- Đăng ký / đăng nhập bằng Email + Password
- Đăng ký / đăng nhập bằng Google
- **Nhập lại mật khẩu khi đăng ký** — xác nhận mật khẩu; kiểm tra khớp trước khi gọi Firebase
- **Hiện/ẩn mật khẩu** — nút mắt trên form auth và các ô mật khẩu trong cài đặt tài khoản
- **Hỗ trợ bàn phím** — Enter submit form; Tab theo thứ tự email → mật khẩu → mắt → submit (link quên mật khẩu nằm dưới nút submit)
- **Quên mật khẩu** — Firebase gửi link đặt lại qua email (`sendPasswordResetEmail`)
- **Xác minh email** — sau đăng ký email/mật khẩu, Firebase gửi link xác minh (`sendEmailVerification`); app mở sau khi xác minh
- **Cài đặt tài khoản** — tên hiển thị (topbar), chip phương thức đăng nhập, trạng thái xác minh email, đổi email (`verifyBeforeUpdateEmail`), đổi/thêm mật khẩu, gửi lại xác minh
- **Link mã nguồn** — liên kết GitHub trên màn đăng nhập và trong Cài đặt tài khoản
- **Tắt tính năng auth** — tùy chọn tắt đăng ký, quên mật khẩu, đổi email, đổi/thêm mật khẩu qua biến `VITE_DISABLE_*` (cả UI lẫn action)
- Bắt buộc đăng nhập trước khi sử dụng app

### Ghi chú

- Tạo, sửa và lưu ghi chú
- **Thẻ (tags)** — gắn thẻ phân cách bằng dấu phẩy; định dạng `tênTag:giá_trị` tùy chọn gắn dữ liệu vào thẻ (dùng cho biến system prompt AI); thêm/xóa trong editor; hỗ trợ import/export
- **Tìm kiếm** — tìm theo tiêu đề hoặc thẻ từ topbar (debounce; dùng cùng sort và phân trang)
- **Sắp xếp** — tiêu đề A–Z / Z–A, ngày tạo/cập nhật tăng/giảm; lưu trong `localStorage` (`notedata-note-sort`)
- **Chế độ xem nội dung** — toggle **TXT / MD / HTML** dạng phân đoạn (cùng kiểu EN / VI): sửa văn bản thuần, xem trước Markdown (GFM qua `marked`), hoặc xem trước HTML (sanitize qua DOMPurify)
- **Bản nháp chưa lưu** — nội dung sửa được giữ trong bộ nhớ khi chuyển ghi chú; sidebar và editor hiện chỉ báo; **Hủy sửa** hủy thay đổi mà không lưu (xóa khi lưu hoặc tải lại trang)
- **Thu gọn header editor** — thu gọn thanh tiêu đề/thẻ để có thêm không gian viết
- **Chuyển vào thùng rác** — link xóa ghi chú trong header editor
- Đồng bộ realtime theo `userId`
- Danh sách phân trang với nút **Tải thêm** (20 ghi chú mỗi lần)
- **Thùng rác** — xóa mềm; khôi phục, xóa vĩnh viễn, hoặc **Dọn thùng rác**; nút **↩ khôi phục** và **× xóa** nhanh trên từng ghi chú trong sidebar
- **Giao diện mobile** — menu hamburger mở/đóng sidebar dạng overlay trên màn hình nhỏ

### Trợ lý AI chat

- **Hộp chat nổi** trong editor ghi chú — nhờ AI soạn thảo, chỉnh sửa hoặc tóm tắt nội dung hiện tại
- **Không phụ thuộc nhà cung cấp** — dùng API chat-completions **tương thích OpenAI** (URL, model, header xác thực tùy chỉnh)
- **Nhiều provider** — quản lý nhiều endpoint AI; cài đặt provider đồng bộ qua Firebase Realtime Database
- **Thư viện model dùng chung** — danh sách model toàn cục, cấu hình độc lập với provider; chọn model đang dùng cho chat
- **Kho API key** — key có nhãn, mã hóa bằng mã khóa của bạn (AES-GCM giống nội dung ghi chú) và lưu trên Firebase (`users/{uid}/settings/aiChatSettings/apiKeys`); chỉ ciphertext đồng bộ — plaintext chỉ ở bộ nhớ sau khi mở khóa
- **Mở khóa API key** — dùng popup mã giống ghi chú mã hóa (mã đã lưu hoặc nhập thủ công); bắt buộc mỗi phiên chat mới, khi đổi key, và khi sửa key đã lưu
- **API key đang dùng** — `activeApiKeyId` trên Firebase (giống `activeModelId` / `activeProviderId`); toolbar footer chọn key gửi request
- **Chọn AI theo ghi chú** — mỗi ghi chú có thể nhớ provider, model và API key riêng (`aiActive*` trên Firebase); trường chưa đặt sẽ dùng mặc định tài khoản
- **Cài đặt dạng popup** — chọn provider, model và API key từ popup danh sách; Add/Edit mở form cài đặt riêng
- **Toolbar footer chat** — nút **Provider**, **Model** và API key (hiện tên đang chọn hoặc nhãn mặc định; ellipsis khi dài); icon bánh răng mở cài đặt bật/tắt AI tài khoản
- **Import từ cURL** — dán lệnh `curl` để tự điền các trường provider (endpoint, xác thực, tham số sinh văn bản); không tự tạo hoặc chọn model
- **Chat không cần API key** — endpoint local/mở hoạt động khi chọn **Chưa chọn API key** (không bắt buộc key để gửi)
- **Ngữ cảnh ghi chú** — mẫu system prompt hỗ trợ `{{noteTitle}}`, `{{noteContent}}` và biến tag `{{tênTag}}` (từ tag định dạng `tênTag:giá_trị`)
- **Hướng dẫn biến system prompt** — hover dấu **?** cạnh trường system prompt để xem hướng dẫn đầy đủ
- **Chèn vào ghi chú** — thêm bất kỳ tin nhắn nào (người dùng hoặc trợ lý) vào nội dung editor
- **Sao chép tất cả / Chèn tất cả / Xóa** — thao tác hàng loạt cạnh nút AI khi chat đang mở và có tin nhắn
- **Lịch sử chat trên máy** — tùy chọn lưu bản nháp chat AI theo từng ghi chú trong `localStorage` (Cài đặt tài khoản → Trợ lý AI); dọn từ cài đặt tài khoản
- **Bật/tắt AI theo tài khoản** — bật hoặc tắt trợ lý chat trong Cài đặt tài khoản (`disableAiChat` trên Firebase)
- **Ẩn khi ghi chú bị khóa** — không dùng chat khi ghi chú mã hóa chưa mở khóa
- **Tắt qua env** — đặt `VITE_DISABLE_AI_CHAT=true` để ẩn hoàn toàn chat box (mặc định `false`, bật)

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
- Nhiều **mã khóa (6–32 ký tự)** trên mỗi trình duyệt, lưu trong `localStorage` (`notedata-encryption-keys`) — không gửi lên Firebase
- **Quản lý mã khóa** qua biểu tượng khóa trên header (tạo, xem danh sách, xóa)
- **Khi lưu:** chọn mã đã lưu hoặc nhập mã tự nhập (nhập 2 lần để xác nhận)
- **Khi mở khóa:** mặc định nhập mã thủ công; có thể chuyển sang **Chọn từ danh sách đã lưu**
- Nhập mã bằng ô text và bàn phím số trên màn hình; tùy chọn **tự focus** ô nhập mã (`notedata-passcode-autofocus`)
- Mã hóa AES-GCM qua Web Crypto API; database chỉ lưu `encrypted: true` và `keyId`
- Sai mã chỉ hiện thông báo chung trên ghi chú — không gợi ý trong popup (chống đoán mã)

### Dark mode

- **Mặc định dark mode** khi truy cập lần đầu
- Toggle icon mặt trời / mặt trăng ở topbar (dạng phân đoạn, cùng kiểu EN / VI) và màn hình đăng nhập
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

#### Email đặt lại mật khẩu (Quên mật khẩu)

App dùng Firebase **`sendPasswordResetEmail`**. Khi người dùng nhập email trên màn đăng nhập, Firebase gửi link đặt lại mật khẩu (nếu email đó dùng đăng nhập email/mật khẩu).

Cấu hình email trên Firebase Console:

1. Vào **Build → Authentication → Templates**
2. Mở **Password reset** (Đặt lại mật khẩu)
3. Tùy chỉnh (nên làm):
   - **Sender name** — ví dụ: `NoteData`
   - **Subject** và **body** — giữ placeholder `%LINK%` để nút/link đặt lại hoạt động
   - **Reply-to** (tuỳ chọn)
4. Lưu lại

Mặc định, link mở **trang do Firebase host** để người dùng nhập mật khẩu mới, sau đó quay lại app để đăng nhập. Không cần backend riêng cho luồng này.

> **Tài khoản chỉ Google:** Nếu người dùng đăng ký bằng Google và chưa thêm mật khẩu, email đặt lại có thể không giúp đăng nhập bằng email/mật khẩu. Họ nên dùng **Đăng nhập với Google**, hoặc mở **Cài đặt tài khoản** (icon user trên topbar) và chọn **Thêm mật khẩu**.

#### Xác minh email (đăng ký email/mật khẩu)

App dùng Firebase **`sendEmailVerification`** ngay sau `createUserWithEmailAndPassword`. Cho đến khi `emailVerified` là `true`, người dùng thấy màn xác minh riêng (chưa vào giao diện ghi chú).

Cấu hình email trên Firebase Console:

1. Vào **Build → Authentication → Templates**
2. Mở **Email address verification** (Xác minh địa chỉ email)
3. Tùy chỉnh (nên làm):
   - **Sender name** — ví dụ: `NoteData`
   - **Subject** và **body** — giữ placeholder `%LINK%`
4. Lưu lại

Luồng:

1. Người dùng đăng ký email/mật khẩu
2. Firebase gửi link xác minh
3. Người dùng mở link (trang Firebase mặc định)
4. Quay lại app, bấm **Kiểm tra trạng thái** (reload profile auth)
5. Sau khi xác minh, vào app chính

Tài khoản đăng nhập Google **không** vào màn này — Firebase coi email đã xác minh. Nếu sau đó đổi email, `verifyBeforeUpdateEmail` vẫn bắt mở **inbox mới** (trong Cài đặt tài khoản).

#### Đổi email (Cài đặt tài khoản)

App dùng Firebase **`verifyBeforeUpdateEmail`** (không đổi email trực tiếp). Email mới nhận link xác minh; email tài khoản chỉ đổi sau khi mở link.

Trước khi gửi link, app **xác thực lại** người dùng:

- Tài khoản email/mật khẩu → mật khẩu hiện tại
- Chỉ Google → popup Google (`reauthenticateWithPopup`)

Cấu hình template:

1. Vào **Authentication → Templates**
2. Mở **Email address change** (Đổi địa chỉ email)
3. Giữ placeholder `%LINK%` trong nội dung
4. Lưu lại

#### Cài đặt tài khoản (trong app)

Sau khi đăng nhập, bấm **icon user** trên topbar (bên phải):

| Tính năng | Firebase API | Ghi chú |
|-----------|--------------|---------|
| Tên hiển thị | `updateProfile` | Hiện trên topbar; trống thì dùng email |
| Đổi email | `reauthenticate` + `verifyBeforeUpdateEmail` | Gửi link xác minh tới inbox mới |
| Đổi mật khẩu | `reauthenticateWithCredential` + `updatePassword` | Tài khoản email/mật khẩu |
| Thêm mật khẩu | `linkWithCredential` | Tài khoản chỉ Google có thể liên kết email/mật khẩu |
| Gửi lại xác minh | `sendEmailVerification` | Tài khoản email/mật khẩu chưa xác minh |
| Bật/tắt trợ lý AI | `users/{uid}/settings/disableAiChat` | Bật hoặc tắt nút chat AI cho tài khoản (đồng bộ qua Realtime Database) |
| Lịch sử chat trên máy | `users/{uid}/settings/persistAiChatLocal` | Lưu bản nháp chat AI trong `localStorage` trình duyệt theo ghi chú (`chat_{noteId}`) |

Ngoài bật **Email/Password** và **Google**, nên tùy chỉnh ba template: **Password reset**, **Email address verification**, **Email address change**.

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

### Bước 5: Cấu hình Authorized domains

Bắt buộc cho **đăng nhập Google**, **đặt lại mật khẩu**, **xác minh email**, **đổi email**, và các redirect auth khác.

1. Vào **Authentication → Settings → Authorized domains**
2. Đảm bảo có:
   - `localhost` (cho dev)
   - Domain hosting của bạn (ví dụ: `my-notes-app.web.app` và `my-notes-app.firebaseapp.com`)

Firebase thường tự thêm domain sau khi deploy hosting lần đầu. Nếu link reset hoặc Google login lỗi trên production, kiểm tra và thêm domain thiếu tại đây trước.

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

# Tùy chọn — đặt true để tắt tính năng auth (cả UI lẫn action)
VITE_DISABLE_SIGNUP_EMAIL_PASSWORD=false
VITE_DISABLE_SIGNUP_GOOGLE=false
VITE_DISABLE_FORGOT_PASSWORD=false
VITE_DISABLE_CHANGE_EMAIL=false
VITE_DISABLE_CHANGE_PASSWORD=false

# Tùy chọn — đặt true để ẩn hộp chat AI trong editor ghi chú
VITE_DISABLE_AI_CHAT=false
```

> **Lưu ý:** Các biến `VITE_*` được Vite nhúng vào frontend khi build. Không commit file `.env` lên git.

#### Tắt tính năng auth (tùy chọn)

Bạn có thể tạm thời tắt từng luồng xác thực mà không cần sửa code. Đặt biến thành `true` (cũng chấp nhận `1` hoặc `yes`, không phân biệt hoa thường) trước khi chạy dev server hoặc build production.

| Biến | Khi `true` | UI | Action bị chặn |
|------|------------|-----|----------------|
| `VITE_DISABLE_SIGNUP_EMAIL_PASSWORD` | Tắt đăng ký email/mật khẩu | Ẩn tab **Đăng ký** | `register()` |
| `VITE_DISABLE_SIGNUP_GOOGLE` | Tắt đăng ký Google | Ẩn nút Google ở tab đăng ký | `loginWithGoogle('signup')` |
| `VITE_DISABLE_FORGOT_PASSWORD` | Tắt quên mật khẩu | Ẩn **Quên mật khẩu?** | `requestPasswordReset()` |
| `VITE_DISABLE_CHANGE_EMAIL` | Tắt đổi email | Ẩn section đổi email trong Cài đặt tài khoản | `requestEmailChange()` |
| `VITE_DISABLE_CHANGE_PASSWORD` | Tắt đổi/thêm mật khẩu | Ẩn section mật khẩu trong Cài đặt tài khoản | `changeAccountPassword()`, `addAccountPassword()` |

**Lưu ý:**

- **Đăng nhập không bị tắt** — chỉ các luồng đăng ký và quản lý tài khoản ở trên bị ảnh hưởng.
- **Đăng nhập Google vẫn hoạt động** khi chỉ bật `VITE_DISABLE_SIGNUP_GOOGLE`; nút Google vẫn hiện ở tab đăng nhập.
- Các flag được đọc lúc **build**. Sau khi sửa `.env`, restart `npm run dev` hoặc chạy lại `npm run build` trước khi deploy.
- Code nằm tại `src/lib/auth-features.ts`; guard được áp dụng trong `src/lib/auth.svelte.ts` và các component auth/account.

Ví dụ — đóng đăng ký và quên mật khẩu trên instance riêng:

```env
VITE_DISABLE_SIGNUP_EMAIL_PASSWORD=true
VITE_DISABLE_SIGNUP_GOOGLE=true
VITE_DISABLE_FORGOT_PASSWORD=true
```

#### Tắt AI chat (tùy chọn)

Đặt `VITE_DISABLE_AI_CHAT=true` để ẩn nút **AI** trong editor ghi chú. Mặc định là `false` (bật chat). Đọc lúc build qua `src/lib/ai-features.ts`.

```env
VITE_DISABLE_AI_CHAT=true
```

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
users/{userId}/settings/...
```

Deploy rules (bắt buộc cho notes, trash và cài đặt AI provider):

```bash
npm run firebase:deploy:database
```

### Bước 10: Chạy development

```bash
npm run dev
```

Mở URL hiển thị trong terminal (thường là `http://localhost:5173`).

Thử:

1. Đăng ký email/mật khẩu — kiểm tra email **xác minh** và mở link
2. Bấm **Kiểm tra trạng thái** trên màn xác minh để vào app
3. Hoặc đăng nhập Google (bỏ qua xác minh email)
4. Thử **Quên mật khẩu?** trên màn đăng nhập (dưới nút submit)
5. Khi đăng ký, thử ô **nhập lại mật khẩu** và nút mắt **hiện/ẩn mật khẩu**
6. Tạo và lưu ghi chú — thêm thẻ, tìm kiếm, sắp xếp, chuyển **TXT / MD / HTML**, thử **Hủy sửa** khi có thay đổi chưa lưu
7. Mở **Cài đặt tài khoản** từ icon user trên topbar
8. Mở một ghi chú và bấm **AI** — thêm provider (hoặc import cURL), chọn model và API key từ toolbar footer, rồi chat; thử **Sao chép tất cả** / **Chèn tất cả vào ghi chú** khi đã có tin nhắn
9. Mở **Cài đặt tài khoản** → **Trợ lý AI** để bật/tắt AI cho tài khoản

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
        tags?: string (phân cách bằng dấu phẩy trên Firebase)
        aiActiveProviderId?: string
        aiActiveModelId?: string
        aiActiveApiKeyId?: string
        createdAt: number (timestamp)
        updatedAt: number (timestamp)
        encrypted?: boolean
        keyId?: string
    trash/
      {noteId}/
        title: string
        content: string
        tags?: string (phân cách bằng dấu phẩy trên Firebase)
        aiActiveProviderId?: string
        aiActiveModelId?: string
        aiActiveApiKeyId?: string
        createdAt: number (timestamp)
        updatedAt: number (timestamp)
        deletedAt: number (timestamp)
        encrypted?: boolean
        keyId?: string
    settings/
      disableAiChat?: boolean
      persistAiChatLocal?: boolean
      aiChatSettings/
        activeProviderId: string | null
        activeModelId: string | null
        activeApiKeyId: string | null
        providers/
          {providerId}/
            name: string
            completionsUrl: string
            authHeaderName: string
            authHeaderPrefix: string
            systemPrompt: string
            stream: boolean
            extraHeaders: string
            extraBody: string
            updatedAt: number
            temperature?: number | null
            maxTokens?: number | null
            topP?: number | null
            frequencyPenalty?: number | null
            presencePenalty?: number | null
        models/
          {modelId}/
            label: string
            value: string
            updatedAt?: number
        apiKeys/
          {apiKeyId}/
            label: string
            value: string (enc:v1:... ciphertext)
            keyId: string (id mã khóa dùng cho AES-GCM)
            encrypted: true
            updatedAt: number
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
      "tags": ["công-việc", "ý-tưởng"],
      "createdAt": 1710000000000,
      "updatedAt": 1710000000000
    }
  ]
}
```

Import cũng hỗ trợ:

- Mảng thuần: `[{ "title": "...", "content": "...", "tags": ["..."] }]`
- Một object ghi chú đơn có `title` và `content` (tuỳ chọn `tags` dạng mảng hoặc chuỗi phân cách dấu phẩy)

Ghi chú import sẽ được tạo mới trên Firebase (ID mới).

---

## Trợ lý AI chat

### Bắt đầu nhanh

1. Mở một ghi chú (không ở thùng rác; ghi chú mã hóa phải **mở khóa** trước)
2. Bấm nút **AI** ở góc dưới phải editor
3. Lần đầu dùng, popup **Providers** tự mở — bấm **Add** để tạo provider
4. Tùy chọn: mở **Import từ cURL** trong form provider, dán lệnh `curl` chat-completions, bấm **Phân tích & áp dụng**
5. Điền **Completions URL** (bắt buộc), chỉnh header xác thực, system prompt và tham số sinh văn bản, rồi **Lưu**
6. Dùng toolbar footer để chọn **Model** (thêm mới nếu cần) và **API key** — chọn **Chưa chọn API key** cho provider local
7. Gửi tin nhắn trong panel chat
8. Dùng **Chèn vào ghi chú** trên từng tin nhắn, hoặc **Chèn tất cả vào ghi chú** / **Sao chép tất cả** cạnh nút AI khi đã có lịch sử chat

### Provider, model và API key

| Mục | Lưu ở đâu | Ghi chú |
|-----|-----------|---------|
| Providers | Firebase `users/{uid}/settings/aiChatSettings/providers` | URL endpoint, header xác thực, system prompt, tham số sinh văn bản (không lưu giá trị API key) |
| Models | Firebase `.../aiChatSettings/models` | Thư viện model dùng chung; `activeModelId` chọn model dùng trong chat |
| API keys | Firebase `users/{uid}/settings/aiChatSettings/apiKeys` | Key có nhãn; **giá trị mã hóa** bằng mã khóa (`enc:v1:...`); tái sử dụng giữa các provider |
| Lựa chọn đang active | Firebase `.../aiChatSettings/activeProviderId`, `activeModelId`, `activeApiKeyId` | Footer hiện tên provider, nhãn model, hoặc mặc định **Provider** / **Model** / nhãn key (hoặc **Không key**) |

**Cấu hình độc lập:** provider, model và API key được quản lý riêng — lưu provider không cần model, và nút **Model** trên footer luôn bấm được dù chưa chọn provider. Provider và model chỉ kết hợp khi gửi chat (cả hai phải được chọn).

**Luồng popup:** popup danh sách cho provider, model và API key → **Add** / **Edit** mở form cài đặt riêng → **Delete** có xác nhận. Chọn một mục trong popup danh sách sẽ kích hoạt cho chat (khi mở từ editor).

### Cài đặt provider

| Trường | Mô tả |
|--------|-------|
| Tên | Tên hiển thị trên toolbar footer |
| Completions URL | Endpoint chat-completions đầy đủ (vd. `https://api.example.com/v1/chat/completions`) |
| Tên / tiền tố header xác thực | vd. `Authorization` + `Bearer `, hoặc `x-api-key` với prefix trống |
| System prompt | Mẫu với `{{noteTitle}}`, `{{noteContent}}` và biến tag `{{tênTag}}` (hover **?** để xem hướng dẫn đầy đủ) |
| Temperature, max tokens, top P, penalties | Tham số sinh văn bản tùy chọn (để trống = không gửi) |
| Stream | Cờ `stream` trong request body |
| Header / body bổ sung | JSON object merge vào request cho tùy chọn riêng từng nhà cung cấp |

### Cài đặt API key

| Trường | Mô tả |
|--------|-------|
| Nhãn | Tên hiển thị trong picker API key và toolbar footer |
| Giá trị | API key plaintext — mã hóa bằng mã khóa trước khi lưu (cùng cơ chế với nội dung ghi chú) |
| Mã khóa mã hóa | Mã khóa đã lưu từ **Quản lý mã khóa** (hoặc mã một lần khi tạo) dùng để derive khóa AES-GCM |

**Mở khóa để chat:** sau khi chọn key (hoặc lần gửi đầu), dùng luồng `KeySelectModal` giống ghi chú — chọn mã đã lưu, nhập mã thủ công, hoặc tạo mã một lần khi lưu key mới. Plaintext chỉ ở bộ nhớ phiên hiện tại; đóng chat, xóa lịch sử, hoặc đổi key sẽ xóa.

### Cài đặt model

| Trường | Mô tả |
|--------|-------|
| Nhãn | Tên hiển thị trong picker model và toolbar footer |
| Giá trị | Id model gửi trong JSON request body |

### Biến trong system prompt

| Placeholder | Nguồn | Ghi chú |
|-------------|-------|---------|
| `{{noteTitle}}` | Tiêu đề ghi chú hiện tại | Luôn dùng được |
| `{{noteContent}}` | Nội dung plain-text ghi chú hiện tại | Luôn dùng được |
| `{{tênTag}}` | Tag ghi chú dạng `tênTag:giá_trị` | Tag thường không có `:` sẽ không thay thế; giá trị rỗng (`tênTag:`) vẫn hợp lệ |

Ví dụ tags: `công-việc, khách-hàng:Công ty ABC, nháp, ngôn-ngữ:tiếng Việt`

- `{{khách-hàng}}` → `Công ty ABC`
- `{{ngôn-ngữ}}` → `tiếng Việt`
- `{{nháp}}` → không thay thế (tag thường, không có dấu hai chấm)

Hover dấu **?** cạnh **Mẫu system prompt** trong form provider để xem hướng dẫn trong app (EN/VI).

### Chọn AI theo ghi chú

Khi chọn provider, model hoặc API key từ toolbar footer chat trên một ghi chú, lựa chọn được lưu trên ghi chú đó trong Firebase (`aiActiveProviderId`, `aiActiveModelId`, `aiActiveApiKeyId`). Trường chưa đặt trên ghi chú sẽ kế thừa mặc định toàn tài khoản từ `aiChatSettings`. Nếu lựa chọn đã lưu trỏ tới provider, model hoặc key đã xóa, app sẽ nhắc chọn lại.

### Lịch sử chat trên máy

Trong **Cài đặt tài khoản → Trợ lý AI**, bật **Đã lưu lịch sử chat trên máy** để giữ bản nháp chat trong `localStorage` (`chat_{noteId}`) sau khi tải lại trang. Mặc định tắt (chỉ giữ trong bộ nhớ đến khi reload). Dùng **Dọn lịch sử chat** để xóa mọi bản nháp đã lưu trên trình duyệt này.

### Import từ cURL

Dán lệnh dạng:

```bash
curl https://api.example.com/v1/chat/completions \
  -H "Authorization: Bearer $YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"your-model","messages":[{"role":"user","content":"Hello"}]}'
```

Parser điền URL, header xác thực và các trường body đã biết vào form **provider** (temperature, penalties, stream, header/body bổ sung). **Không** tạo model hay đặt `activeModelId` — thêm model riêng trong picker **Model**. Biến môi trường (vd. `$YOUR_API_KEY`) không được lưu — thêm key thật vào kho **API keys** hoặc chọn **Chưa chọn API key** cho endpoint local.

### Thao tác chat

| Thao tác | Khi hiện | Tác dụng |
|----------|----------|----------|
| Chèn vào ghi chú | Mọi tin nhắn chat | Thêm tin nhắn đó vào ghi chú |
| Sao chép tất cả | Chat mở + có tin nhắn | Sao chép toàn bộ hội thoại (định dạng `Bạn:` / `Trợ lý:`) vào clipboard |
| Chèn tất cả vào ghi chú | Chat mở + có tin nhắn | Thêm toàn bộ hội thoại vào ghi chú |
| Xóa | Chat mở + có tin nhắn | Xóa lịch sử chat |

### Bật/tắt AI theo tài khoản

Trong **Cài đặt tài khoản → Trợ lý AI**, bật hoặc tắt AI cho tài khoản. Cài đặt lưu tại `users/{uid}/settings/disableAiChat` trên Firebase và đồng bộ giữa các thiết bị. Cùng mục này có toggle **lịch sử chat trên máy** (`persistAiChatLocal`) và nút dọn bản nháp chat đã lưu trên trình duyệt. Bản ghi API key đã mã hóa cũng đồng bộ giữa thiết bị; bạn vẫn cần mã khóa trên mỗi thiết bị/phiên để giải mã khi chat.

Icon bánh răng trong footer chat mở Cài đặt tài khoản, tập trung vào mục này.

### Lưu trữ

| Dữ liệu | Lưu trữ | Gửi lên Firebase? |
|---------|---------|-------------------|
| Cài đặt AI chat | `users/{uid}/settings/aiChatSettings` | Có — providers, models, `apiKeys` và lựa chọn đang active (không có plaintext API key) |
| Bật/tắt AI tài khoản | `users/{uid}/settings/disableAiChat` | Có |
| Toggle lịch sử chat trên máy | `users/{uid}/settings/persistAiChatLocal` | Có |
| Bản nháp chat AI (khi bật) | `localStorage` key `chat_{noteId}` | Không |
| Mã khóa mã hóa | `notedata-encryption-keys` (trình duyệt) | Không (chỉ hash trong localStorage) |
| Plaintext API key đã mở khóa | Trạng thái Svelte trong bộ nhớ | Không |

### Tắt hộp chat

```env
VITE_DISABLE_AI_CHAT=true
```

Restart `npm run dev` hoặc build lại trước khi deploy. Code: `src/lib/ai-features.ts`. Cờ này ẩn AI cho mọi người dùng, bất kể cài đặt bật/tắt theo tài khoản.

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

## Build & tách chunk

Build production dùng **Vite 8** với nhóm chunk thủ công trong `vite.config.ts` (`rolldownOptions.output.codeSplitting`):

| Chunk | Nguồn | Gzip (xấp xỉ) | Khi nào tải |
|-------|-------|---------------|-------------|
| `firebase` | `node_modules/firebase` | ~74 KB | Khởi động app (`modulepreload` trong `index.html`) |
| `markdown` | `marked` + `dompurify` | ~23 KB | Lần đầu xem MD/HTML (`dynamic import` trong `src/lib/markdown.ts`) |
| `index` | Shell app, auth, dialog, toast | ~10 KB | Khởi động app |
| `i18n.svelte` | Chuỗi dịch | ~29 KB | Khởi động app (`modulepreload`) |
| `NotesApp` | Giao diện ghi chú chính | ~13 KB | Sau khi đăng nhập |
| `AuthPage` | Đăng nhập / đăng ký | ~3 KB | Khi chưa đăng nhập |
| `EditorAiChat` | Chat AI + UI cài đặt provider | ~12 KB | Khi bật AI trong editor ghi chú |
| Chunk modal | `KeySelectModal`, `KeyManagerModal`, `UserAccountModal`, … | 2–4 KB mỗi cái | Theo nhu cầu |

**Điểm vào lazy-load** (`{#await import(...)}`):

- `App.svelte` → `AuthPage`, `EmailVerificationScreen`, `NotesApp`
- `NotesApp.svelte` → `KeyManagerModal`, `UserAccountModal`
- `NoteEditor.svelte` → `EditorAiChat`, `KeySelectModal`

Thư viện nặng tách khỏi chunk route chính; modal AI và mã hóa chỉ tải khi mở. Chạy `npm run build` để xem tên và kích thước chunk trong output.

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
4. Tùy chỉnh **Authentication → Templates**: Password reset, Email address verification, Email address change
5. Tạo **Web app** và copy `firebaseConfig`
6. Cập nhật file `.env` với config mới
7. Chạy `firebase use --add` hoặc sửa `.firebaserc`
8. Chạy `npm run firebase:deploy:database`
9. Chạy `npm run dev` để test local (kể cả quên mật khẩu)
10. Chạy `npm run firebase:deploy:hosting` để deploy
11. Xác nhận **Authorized domains** có URL hosting của bạn

---

## Xử lý lỗi thường gặp

### `auth/invalid-api-key` hoặc app không kết nối Firebase

- Kiểm tra lại `.env`, đảm bảo không có khoảng trắng thừa
- Restart dev server sau khi sửa `.env`

### Đăng nhập Google bị lỗi / popup bị chặn

- Bật Google provider trong Authentication
- Cho phép popup trên trình duyệt
- Kiểm tra domain hiện tại có trong **Authorized domains**

### Quên mật khẩu: không nhận được email

- Kiểm tra thư mục **spam/thư rác**
- Xác nhận đã bật **Email/Password** trong Authentication → Sign-in method
- Tài khoản có thể **chỉ dùng Google** (chưa đặt mật khẩu) — đăng nhập Google hoặc **Thêm mật khẩu** trong Cài đặt tài khoản
- Firebase không tiết lộ email có tồn tại hay không (chống dò email); app luôn hiện thông báo thành công chung
- Kiểm tra template **Password reset** đã lưu tại Authentication → Templates
- Trên production, đảm bảo domain site nằm trong **Authorized domains**

### Link đặt lại mật khẩu không mở hoặc báo lỗi

- Thêm cả `your-project.web.app` và `your-project.firebaseapp.com` vào **Authorized domains**
- Không xóa `%LINK%` khỏi template email Password reset

### Xác minh email: kẹt ở màn xác minh

- Mở link xác minh trong email đăng ký (kiểm tra thư rác)
- Sau khi mở link, bấm **Kiểm tra trạng thái** — app reload profile Firebase
- Tùy chỉnh **Authentication → Templates → Email address verification**
- Dùng **Gửi lại email xác minh** nếu email hết hạn hoặc thất lạc

### Đổi email: đã gửi xác minh nhưng email chưa đổi

- Đúng quy trình — email chỉ đổi sau khi mở link trong **inbox mới**
- Kiểm tra template **Email address change** và **Authorized domains**

### `Permission denied` khi đọc/ghi ghi chú

- Chưa deploy database rules: chạy `npm run firebase:deploy:database`
- User chưa đăng nhập
- Rules chưa khớp cấu trúc `users/{uid}/notes`

### Không giải mã được ghi chú sau khi đổi trình duyệt hoặc xóa storage

- Mã khóa chỉ lưu trên `localStorage` của trình duyệt hiện tại
- Ghi chú khóa bằng **mã tự nhập** cần nhớ đúng mã đó
- Nên dùng mã đã lưu trên cùng một thiết bị/trình duyệt

### AI chat: không thấy nút AI

- Kiểm tra `VITE_DISABLE_AI_CHAT` không phải `true` trong `.env`; build lại hoặc restart dev server sau khi đổi
- Kiểm tra **Cài đặt tài khoản → Trợ lý AI** đang bật (`disableAiChat` không phải `true` trên Firebase)
- Chat bị ẩn ở chế độ **chỉ đọc** (thùng rác) và ghi chú **mã hóa chưa mở khóa**

### AI chat: gọi API thất bại hoặc lỗi CORS

- Kiểm tra **provider**, **model** và **API key** đang chọn trên toolbar footer chat
- Mở khóa API key bằng mã khóa nếu được nhắc (phiên mới hoặc sau khi đổi key)
- Với provider local, thử **Chưa chọn API key** nếu endpoint không yêu cầu xác thực
- Nhà cung cấp phải cho phép request từ origin của bạn (CORS), hoặc dùng proxy bạn kiểm soát
- Firebase chỉ lưu ciphertext — bạn phải nhớ mã khóa đã dùng khi lưu key

### AI chat: không lưu được cài đặt provider

- Deploy database rules: `npm run firebase:deploy:database` (rules phải cho phép `users/{uid}/settings/aiChatSettings`)
- Người dùng phải đã đăng nhập

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
    auth-features.ts     # Các flag VITE_DISABLE_* cho auth
    ai-features.ts       # Flag VITE_DISABLE_AI_CHAT
    ai-settings.ts       # Ghép provider/model đang active thành cài đặt chat; render biến system prompt
    note-ai-selection.ts # Ghép lựa chọn AI theo ghi chú vs mặc định toàn tài khoản
    draft-ai-chat.ts     # Bản nháp chat AI trong bộ nhớ; tùy chọn lưu localStorage
    local-draft-storage.ts  # Helper localStorage cho bản nháp chat
    ai-providers.ts      # CRUD cài đặt AI chat trên Firebase (providers, models, apiKeys)
    ai-providers.svelte.ts  # Đồng bộ realtime store aiChatSettings
    ai-api-keys.ts       # Đọc/ghi API key mã hóa dưới aiChatSettings/apiKeys
    ai-api-keys.svelte.ts  # Trạng thái mở khóa API key trong bộ nhớ (đọc từ store aiChatSettings)
    ai-chat.ts           # Client chat-completions tương thích OpenAI
    parse-curl-ai.ts     # Phân tích cURL thành cài đặt AI
    user-settings.ts     # Cài đặt theo tài khoản trên Firebase (vd. disableAiChat)
    user-settings.svelte.ts  # Đồng bộ realtime cài đặt người dùng
    auth.svelte.ts       # Đăng nhập, đăng ký, xác minh, đổi mật khẩu/email, profile
    theme.svelte.ts      # Trạng thái dark/light và lưu preference
    i18n.svelte.ts       # Locale, hàm t(), format ngày
    i18n/
      translations.ts    # Chuỗi tiếng Anh và tiếng Việt
    notes.ts             # CRUD ghi chú, thùng rác, tìm kiếm, sắp xếp, thao tác hàng loạt
    note-io.ts           # Import/export JSON
    draft-content.ts     # Bản nháp nội dung chưa lưu trong bộ nhớ
    markdown.ts          # Render Markdown và HTML cho chế độ xem trước (DOMPurify)
    pagination.ts        # Số lượng mỗi lần tải thêm
    passcode.ts          # Hằng số độ dài mã khóa
    passcode-focus.svelte.ts  # Preference tự focus ô nhập mã
    crypto.ts            # Mã hóa/giải mã AES-GCM (Web Crypto)
    encryption-keys.ts   # CRUD mã khóa trong localStorage
    portal.ts            # Portal action cho modal
    components/
      AuthPage.svelte             # Đăng nhập, đăng ký, quên mật khẩu
      PasswordInput.svelte        # Ô mật khẩu có nút hiện/ẩn
      LocaleThemeControls.svelte  # Toggle phân đoạn EN/VI và sáng/tối
      KeyManagerModal.svelte      # Tạo/xóa mã khóa
      KeySelectModal.svelte       # Chọn mã khi lưu/mở khóa
      PasscodePad.svelte          # Nhập mã kèm bàn phím số
      UserAccountModal.svelte     # Tên hiển thị, email và mật khẩu
      EmailVerificationScreen.svelte  # Màn chờ xác minh email sau đăng ký
      EditorAiChat.svelte           # Hộp chat AI nổi trong editor
      EditorAiSettings.svelte       # Popup và form provider/model/API key
      AiPickerModal.svelte          # Popup danh sách provider, model, API key
      AiFormModal.svelte            # Form Add/Edit cài đặt (xếp chồng trên picker)
      ...                # NotesApp, NoteEditor, NoteSidebar, TrashSidebar, ...
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