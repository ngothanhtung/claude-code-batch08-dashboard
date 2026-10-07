Tôi dùng Firebase Firestore để lưu trữ dữ liệu.
Tôi muốn viết tính năng Quản lý danh sách khách hàng.
Cấu trúc thư mục:
src/app/customers/page.tsx
src/features/customers/components
src/features/customers/services
...

Ví dụ về cấu trúc dữ liệu khách hàng trong Firestore:

- id: auto id
- name: "Nguyễn Văn Tuấn"
- email: "nguyenvantuan@example.com"
- status: "active" | "inactive"
- priority: "high" | "medium" | "low"
- description: "Mô tả về khách hàng"
- assignedTo: Ref (users/uid)
- createdAt: Timestamp
- updatedAt: Timestamp
- createdBy: Ref (users/uid)
- updatedBy: Ref (users/uid)

Form nhập liệu:

- name: bắt buộc
- email: bắt buộc / ràng buộc định dạng email
- status: "active" | "inactive": bắt buộc, default: "active"
- priority: "high" | "medium" | "low": bắt buộc, default: "medium"
- description: "Mô tả về khách hàng": tùy chọn
- assignedTo: Ref (users/uid): tùy chọn
- createdAt: Timestamp: tự động
- updatedAt: Timestamp: tự động
- createdBy: Ref (users/uid): tự động
- updatedBy: Ref (users/uid): tự động

Dùng shadcn/ui để tạo form nhập liệu.
Dùng React Hook Form để quản lý trạng thái form.
Dùng Zod để xác thực dữ liệu form.

Hiển thị dữ liệu:
Dùng TanStack Table
id | name | email | priority | description | status | assignedTo

sắp xếp theo priority: high -> medium -> low

---

priority:
High: Red: #f5222d
Medium: Xanh: #52c41a
Low: Xám: #bfbfbf

---

Bổ sung các hoạt động tương tác với khách hàng:
lưu trữ và subCollection: activities

- Call (Gọi điện cho khách hàng)
  - Ngày thực hiện (Date)
  - Chất lượng cuộc gọi
  - Ghi chú (Note)
- Email (Gửi email cho khách hàng)
  - Ngày thực hiện (Date)
  - Nội dung (Content)
  - Ghi chú (Note)
- Meeting (Cuộc họp với khách hàng)
  - Ngày gặp (Date)
  - Nội dung (Content)
  - Ghi chú (Note)
- Note (Ghi chú về khách hàng)
  - Ngày tạo (Date)
  - Nội dung (Content)

  Form nhập liệu cho hoạt động:
  - Loại hoạt động: Call | Email | Meeting | Note (bắt buộc)
  - Ngày thực hiện / Ngày gặp / Ngày tạo (Date) (bắt buộc)
  - Chất lượng cuộc gọi (nếu là Call) (tùy chọn)
  - Nội dung (Content) (nếu là Email, Meeting, Note) (bắt buộc)
  - Ghi chú (Note) (tùy chọn)

  Dùng shadcn/ui để tạo form nhập liệu cho hoạt động.
  Dùng React Hook Form để quản lý trạng thái form.
  Dùng Zod để xác thực dữ liệu form.

---

Tôi muốn đính kèm files cho khách hàng, 1 khách hàng có thể có nhiều files.

- File (Tệp đính kèm)
  - Tên file (String)
  - URL (String)
  - Loại file (String)
  - Ngày tải lên (Timestamp)
  - Tải lên bởi (Ref (users/uid))

Lưu trữ trong subCollection: files

Dùng Firebase Storage để lưu trữ files

Quy tắc lưu file trên Storage:
customers/{customerId}/files/{fileId}
