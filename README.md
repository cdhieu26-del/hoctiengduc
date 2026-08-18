# Học Tiếng Đức A1-A2 — GitHub Pages + Google Sheets

## 1. Google Apps Script
1. Mở Apps Script gắn với Google Sheet.
2. Thay toàn bộ `code.gs` bằng file `code.gs` trong thư mục này.
3. Deploy → New deployment → Web app.
4. Execute as: Me.
5. Who has access: Anyone.
6. Copy URL `/exec`.

## 2. GitHub Pages
Trong `app.js`, sửa:
`const API_URL = "...";`
thành URL `/exec` vừa deploy.

Sau đó upload:
- index.html
- style.css
- app.js

Không cần `css.html`, `js.html`, `Duc_Viet.html` nữa.

## 3. Google Sheet
Tên sheet mặc định:
- `tiengDucA1`
- `tiengDucA2`

Cột A:J:
STT | Chủ đề | Tiếng Đức | IPA | Từ loại | Mạo từ | Số nhiều | Nghĩa VN | Ví dụ | Dịch ví dụ

## 4. Quan trọng
Mỗi lần sửa `code.gs`, phải Deploy → Manage deployments → Edit → New version → Deploy.
