# Trắc nghiệm nhanh

Web trắc nghiệm thuần HTML/CSS/JS, không cần build.

## Chạy thử trong VS Code
1. Mở thư mục `quiz-app` bằng VS Code (File > Open Folder).
2. Cài extension **Live Server** (Ritwick Dey).
3. Chuột phải `index.html` > **Open with Live Server**.

(Hoặc chạy `npx serve .` trong thư mục này.)

## Đồng bộ Firebase
Dữ liệu lưu trên máy trước (mở nhanh), rồi tự đồng bộ lên Firestore ở nền theo "mã đồng bộ" (nút ☁ Đồng bộ).
Cần mở bằng Live Server (module không chạy khi mở file trực tiếp). Quy tắc Firestore nằm trong `firestore.rules`.

## Thư viện chung
Nút "🌐 Chia sẻ" đăng dự án công khai (chỉ tạo mới, không sửa/xóa được từ web). Nút "🌐 Thư viện" xem, làm và lưu bản sao.
Muốn gỡ một bản đã đăng: xóa trong Firebase Console, mục Firestore, hai collection `library` và `libq` (cùng id).
Nhớ phát hành quy tắc: `firebase deploy --only firestore:rules`.

## Định dạng tài liệu
```
Câu 1. Nội dung câu hỏi
A. Lựa chọn 1
B. Lựa chọn 2
C. Lựa chọn 3
Đáp án: B
Giải thích: Lý do (tùy chọn, hiện sau khi trả lời)
```
Hoặc đánh dấu `*` trước lựa chọn đúng. Tệp đáp án riêng: `1. B`, `2-2` (câu 2, đáp án thứ 2).

## Đưa lên Git
```
git init
git add .
git commit -m "Quiz app"
git branch -M main
git remote add origin <link-repo>
git push -u origin main
```

## Đưa lên Firebase (Hosting + quy tắc Firestore)
```
npm i -g firebase-tools
firebase login
firebase deploy
```
Dự án mặc định: `trac-nghiem-1a00f` (xem `.firebaserc`). Lệnh `firebase deploy` đưa cả trang web và `firestore.rules` lên.
