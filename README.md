# TeaTrack - Hệ Thống Quản Lý Kinh Doanh Trà Sữa (Advanced Business Web Development)

Dự án này là một hệ thống đầy đủ bao gồm trang web cho khách hàng (Client), bảng điều khiển quản trị (Admin Dashboard), và hệ thống Backend (Node.js + MongoDB).

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| Backend | Node.js, Express 5, MongoDB (Mongoose) |
| Client | Angular |
| Admin | Angular |
| Realtime | Socket.io |
| Xác thực | JWT, bcrypt |
| Gửi email | Nodemailer (OTP, quên mật khẩu) |

---

## 🌐 Địa chỉ truy cập (sau khi chạy)

| Ứng dụng | URL |
|----------|-----|
| Trang khách hàng | http://localhost:4200 |
| Trang quản trị | http://localhost:4201 |
| API Backend | https://teatrack-advanced-business-web.onrender.com |

---

## 📂 Cấu trúc dự án

- my-app: Ứng dụng dành cho khách hàng (Angular). Cổng mặc định: 4200.
- my-app-admin: Ứng dụng quản trị (Angular). Cổng mặc định: 4201.
- my-server-mongodb: Server Backend chính (Node.js/Express + MongoDB). Cổng: 3002.
---

## Yêu cầu hệ thống và Khởi chạy

Đảm bảo MongoDB đang chạy tại "mongodb://127.0.0.1:27017", tạo trước database tên là "TeaTrack", nếu chưa có. Và tạo thêm collection tên là "users" để lưu thông tin admin và các phiên đăng ký, đăng nhập trong hệ thống.

1.  Backend:
    - "cd TEATRACK/my-server-mongodb"
    - "npm install"
    - "node createAdmin.js" (Dùng để tạo tài khoản: "Admin123" / "admin123")
    - "npm start"
2.  Client: "cd TEATRACK/my-app" -> "npm install" -> "npm start"
3.  Admin: "cd TEATRACK/my-app-admin" -> "npm install" -> "npm start"

---

## Tổng hợp danh sách API

**Base URL:** `https://teatrack-advanced-business-web.onrender.com`  
Lưu ý: Auth, Admin, Orders, Cart, Promotions, Agencies, Contacts dùng prefix `/api`; Products, Blog, Reviews không có prefix `/api` (ví dụ: `GET /products`, `GET /blog`).

Dưới đây là danh sách toàn bộ các Endpoint API của hệ thống:

### Chú thích

| Ký hiệu  | Ý nghĩa                              |
|----------|--------------------------------------|
| —        | Public, không cần xác thực           |
| 🔑 JWT   | Yêu cầu Bearer Token người dùng      |
| 🔒 Admin | Yêu cầu Token quản trị viên          |

## 1. Xác thực & Người dùng — `/api/auth`

| Method   | Endpoint               | Mô tả                             | Auth    |
|----------|------------------------|-----------------------------------|---------|
| `POST`   | `/register`            | Đăng ký tài khoản mới             | —       |
| `POST`   | `/login`               | Đăng nhập khách hàng              | —       |
| `POST`   | `/admin-login`         | Đăng nhập quản trị viên           | —       |
| `POST`   | `/forgot-password`     | Gửi mã OTP quên mật khẩu         | —       |
| `POST`   | `/verify-otp`          | Xác thực mã OTP                   | —       |
| `POST`   | `/reset-password`      | Đặt lại mật khẩu mới              | —       |
| `GET`    | `/profile`             | Lấy thông tin cá nhân             | 🔑 JWT  |
| `PUT`    | `/profile`             | Cập nhật thông tin & ảnh đại diện | 🔑 JWT  |
| `PUT`    | `/username`            | Cập nhật tên đăng nhập            | 🔑 JWT  |
| `POST`   | `/change-password`     | Đổi mật khẩu                      | 🔑 JWT  |

---

## 🛠️ 2. Quản trị hệ thống — `/api/admin`

> Toàn bộ endpoint yêu cầu Token Admin

| Method     | Endpoint                    | Mô tả                                              |
|------------|-----------------------------|----------------------------------------------------|
| `GET`      | `/users`                    | Danh sách toàn bộ người dùng                       |
| `PUT`      | `/users/:id`                | Cập nhật thông tin người dùng                      |
| `PUT`      | `/users/:id/role`           | Thay đổi quyền hạn (Customer / VIP / Admin)        |
| `DELETE`   | `/users/:id`                | Xóa người dùng                                     |
| `GET`      | `/orders`                   | Danh sách toàn bộ đơn hàng                         |
| `PUT`      | `/orders/:id/status`        | Cập nhật trạng thái (Pending / Completed / Canceled)|
| `GET`      | `/orders/agency-stats`      | Thống kê doanh thu theo chi nhánh                  |

---

## 3. Sản phẩm, Blog & Đánh giá

| Method   | Endpoint            | Mô tả                              | Auth    |
|----------|---------------------|------------------------------------|---------|
| `GET`    | `/products`         | Danh sách sản phẩm                 | —       |
| `GET`    | `/products/:id`     | Chi tiết sản phẩm                  | —       |
| `GET`    | `/blog`             | Danh sách bài viết                 | —       |
| `GET`    | `/blog/:id`         | Chi tiết bài viết                  | —       |
| `POST`   | `/blog/:id/view`    | Tăng lượt xem bài viết             | —       |
| `GET`    | `/reviews`          | Lấy đánh giá theo `productId`      | —       |
| `POST`   | `/reviews`          | Gửi đánh giá mới                   | 🔑 JWT  |

---

## 4. Đơn hàng & Giỏ hàng

| Method     | Endpoint                  | Mô tả                               | Auth    |
|------------|---------------------------|-------------------------------------|---------|
| `GET`      | `/api/cart`               | Lấy giỏ hàng của người dùng         | 🔑 JWT  |
| `POST`     | `/api/cart`               | Lưu / Cập nhật giỏ hàng             | 🔑 JWT  |
| `DELETE`   | `/api/cart`               | Xóa giỏ hàng sau checkout           | 🔑 JWT  |
| `POST`     | `/api/orders`             | Tạo đơn hàng mới                    | 🔑 JWT  |
| `GET`      | `/api/orders`             | Lịch sử mua hàng của user           | 🔑 JWT  |
| `PATCH`    | `/api/orders/:id/cancel`  | Hủy đơn hàng (chỉ khi Pending)      | 🔑 JWT  |

---

## 5. Khuyến mãi — `/api/promotions`

| Method     | Endpoint    | Mô tả                                      | Auth     |
|------------|-------------|--------------------------------------------|----------|
| `GET`      | `/`         | Danh sách mã khuyến mãi đang hoạt động     | —        |
| `GET`      | `/:code`    | Kiểm tra tính hợp lệ của mã giảm giá       | —        |
| `POST`     | `/`         | Tạo mã giảm giá mới                        | 🔒 Admin |
| `PUT`      | `/:id`      | Cập nhật mã giảm giá                       | 🔒 Admin |
| `DELETE`   | `/:id`      | Xóa mã giảm giá                            | 🔒 Admin |

---

## 6. Chi nhánh & Liên hệ

| Method   | Endpoint              | Mô tả                                   | Auth     |
|----------|-----------------------|-----------------------------------------|----------|
| `GET`    | `/api/agencies`       | Danh sách các chi nhánh cửa hàng        | —        |
| `POST`   | `/api/contacts`       | Khách hàng gửi liên hệ / góp ý          | —        |
| `GET`    | `/api/contacts`       | Xem danh sách góp ý                     | 🔒 Admin |
| `PUT`    | `/api/contacts/:id`   | Ghi chú / Cập nhật trạng thái góp ý     | 🔒 Admin |

---



---

## 🧪 Hướng dẫn Test API bằng Postman

Để kiểm tra các API yêu cầu xác thực (**🔑 JWT** hoặc **🔒 Admin**), hãy làm theo các bước sau:

### 1. Lấy Bearer Token
1. Sử dụng Method "POST" với URL: "https://teatrack-advanced-business-web.onrender.com/api/auth/login" (User) hoặc "/api/auth/admin-login" (Admin).
2. Trong tab **Body**, chọn **raw** và định dạng **JSON**, nhập tài khoản ("identifier"/"password").
Ví dụ: 
      {
      "identifier": "tên_đăng_nhập_hoặc_email",
      "password": "mật_khẩu_của_bạn"
      }
3. Gửi request và sao chép chuỗi "token" nhận được trong kết quả trả về.
Nếu đăng nhập thành công, Server sẽ trả về kết quả như sau:
Ví dụ:
   {
   "message": "Login successful",
   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", 
   "user": { ... }
   }
### 2. Sử dụng Token trong các Request khác
1. Chọn API bạn muốn test (ví dụ: "GET /api/auth/profile").
2. Chuyển sang tab **Authorization**.
3. Tại mục **Type**, chọn **Bearer Token**.
4. Dán chuỗi Token vừa copy vào ô **Token**.
5. Nhấn **Send** để thực hiện yêu cầu.
Bạn cần thêm vào Header của Request:
Key: "Authorization"
Value: "Bearer <chuỗi_token_vừa_lấy_được>"
---

## Real-time Updates (Socket.io)

Hệ thống sử dụng Socket.io tại cổng **3002** để cập nhật trạng thái đơn hàng, thông tin người dùng và khuyến mãi ngay lập tức mà không cần tải lại trang.

---

## Xử lý lỗi thường gặp

- **MongoDB connection failed:** Đảm bảo MongoDB đang chạy (`mongod` hoặc MongoDB Service), và đúng địa chỉ `mongodb://127.0.0.1:27017`.
- **Port already in use:** Nếu cổng 3002 / 4200 / 4201 bị chiếm, tắt process đang dùng hoặc đổi port trong cấu hình từng ứng dụng.
- **Không đăng nhập được Admin:** Chạy `node createAdmin.js` trong thư mục `my-server-mongodb` để tạo tài khoản mặc định (Admin123 / admin123).
- **Collection "users" chưa có:** Tạo database "TeaTrack" và collection "users" trong MongoDB (hoặc để server tạo khi chạy `createAdmin.js` / đăng ký user đầu tiên).

---

## Nhóm thực hiện
- Nhóm: 02
   + Thành viên: Nguyễn Thị Hồng Hạnh - K234111431
   + Thành viên: Nguyễn Hoàng Đức - K234111430
   + Thành viên: Lê Trung Nhân - K234111439
   + Thành viên: Nguyễn Thanh Thanh - K234111448
   + Thành viên: Trần Ngọc Bảo Vy - K234111461
- Học phần: Advanced Business Web Development
