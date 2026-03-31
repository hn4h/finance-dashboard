# 💰 Hnah's Finance Dashboard (VpTracker)

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)](https://firebase.google.com/)

Một ứng dụng Dashboard tài chính 100% Client-side giúp theo dõi chi tiêu cá nhân bằng cách tự động đồng bộ và phân loại giao dịch từ tài khoản **VPBank** thông qua **Gmail API**.

---

## ✨ Tính năng nổi bật

- 🔐 **Google OAuth 2.0:** Đăng nhập bảo mật và cấp quyền truy cập Gmail API (Read-only).
- 🔄 **Smart Sync:** Tự động quyét email từ `vpbank` và trích xuất dữ liệu (Số tiền, Nội dung, Thời gian) bằng Regex thông minh.
- ⚡ **1-Click Categorization:** Gán danh mục chi tiêu (Ăn uống, Di chuyển, Mua sắm...) nhanh chóng chỉ với 1 lần chạm emoji.
- 📊 **Real-time Analytics:** Biểu đồ hình tròn (Donut Chart) trực quan hóa phân bổ chi tiêu hàng tháng.
- ☁️ **Firebase & Dexie Integrated:** Kết hợp sức mạnh của IndexedDB (offline-first) và Firestore (cloud sync) để dữ liệu luôn đồng nhất.

---

## 🛠️ Stack công nghệ

- **Frontend:** React 19 (Vite), TypeScript.
- **Styling:** Tailwind CSS, Lucide React (Icons), Shadcn UI elements.
- **Data Layer:**
  - **Firestore (Firebase):** Lưu trữ đám mây cho các giao dịch đã phân loại.
  - **Dexie.js (IndexedDB):** Cache cục bộ và xử lý logic offline.
- **Charts:** Recharts.
- **Auth:** `@react-oauth/google` (Mô hình Implicit Flow).

---

## 🚀 Cài đặt & Khởi chạy

### 1. Clone repository
```bash
git clone <your-repo-url>
cd finance-dashboard
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env.local` và thêm các key sau:
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Chạy Development
```bash
npm run dev
```

---

## 📖 Hướng dẫn sử dụng

1. **Lướt Inbox:** Sau khi đồng bộ, các giao dịch "chưa phân loại" (Unclassified) sẽ xuất hiện trong danh sách hàng đợi.
2. **Chọn Emoji:** Nhấn vào emoji tương ứng dưới mỗi thẻ giao dịch (🍔 Ăn uống, 🚗 Xăng xe, 🛒 Chợ/Siêu thị...).
3. **Hoàn tất:** Giao dịch sẽ tự động di chuyển sang tab **History** và cập nhật trực tiếp lên biểu đồ phân tích.

---

## 📐 Kiến trúc dữ liệu

- **transactions:** `++id`, `emailId` (unique), `amount`, `description`, `date`, `category`, `status`.
- **settings:** Lưu trữ `lastSyncDate` để tối ưu hóa việc fetch API Gmail.

---

## 📄 License
Project này được phát triển cho mục đích cá nhân. Vui lòng tham khảo mã nguồn trước khi sử dụng lại.

*Dọn dẹp repo và viết lại bởi AI Assistant 🤖*
