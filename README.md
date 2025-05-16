**✅ Bước 1: Tạo Service Account**
Truy cập Google Cloud Console.
link: https://console.cloud.google.com/

Chọn hoặc tạo một Project mới.

Đi tới IAM & Admin > Service Accounts.

Nhấp vào "Create Service Account".

Nhập tên và mô tả cho Service Account, sau đó nhấp "Create and Continue".

Ở bước gán quyền, bạn có thể bỏ qua bằng cách nhấp "Done".

**🔑 Bước 2: Lấy Client ID của Service Account**
Trong danh sách Service Accounts, nhấp vào tên của Service Account bạn vừa tạo.

Chọn tab "Details".

Tại đây, bạn sẽ thấy "Unique ID" hoặc "Client ID" của Service Account. Hãy sao chép giá trị này để sử dụng ở bước tiếp theo.

**🛡️ Bước 3: Ủy quyền Domain-wide Delegation trong Admin Console**
Truy cập Google Admin Console bằng tài khoản Super Admin.

Đi tới Security > Access and data control > API Controls.
Nhấp vào "Manage Domain Wide Delegation".
link: https://admin.google.com/ac/owl/domainwidedelegation?utm_source=app_launcher

Nhấp vào "Add new".

Trong trường Client ID, dán giá trị bạn đã sao chép ở bước trước.

Trong trường OAuth Scopes, nhập:
https://mail.google.com/
https://www.googleapis.com/auth/admin.directory.group.member.readonly
https://www.googleapis.com/auth/admin.directory.user.readonly

**📄 Bước 4: Tạo và Tải Khóa JSON**
Quay lại Google Cloud Console.

Trong danh sách Service Accounts, nhấp vào tên của Service Account bạn đã tạo.

Chọn tab "Keys".

Nhấp vào "Add Key" > "Create new key".

Chọn định dạng JSON và nhấp "Create".

Tệp .json sẽ được tải về máy bạn. Giữ tệp này an toàn, vì nó chứa thông tin nhạy cảm.

(Nếu Google Cloud đã chặn việc tạo khóa (key) cho Service Account trong tổ chức:
 Cách xử lý (nếu bạn là Admin tổ chức hoặc có quyền thích hợp):
👉 Bước 1: Truy cập IAM Policy
Vào Google Cloud Console.

Chọn IAM & Admin > Policies (hoặc vào https://console.cloud.google.com/iam-admin/orgpolicies).

Tìm dòng có tên "Disable Service Account Key Creation" (iam.disableServiceAccountKeyCreation).

Nhấp vào đó và nhấn vào "Manage policy".

Chọn "Override parent's policy",

Rules chọn "Off" và cuối cùng chọn "Set policy")

**🧩 Bước 5: Mở Script**
➤ Bước 1: Mở tệp JSON đã tải về và tìm các trường sau:

"private_key": Sao chép toàn bộ giá trị, bao gồm cả -----BEGIN PRIVATE KEY----- và -----END PRIVATE KEY-----.

"client_email": Đây là địa chỉ email của Service Account.

➤ Bước 2: Mở Apps Script
link: script.new
Mở script chứa đoạn code bạn đang chạy (ví dụ Code.gs)
Trong script của bạn, cập nhật như sau:
javascript
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\n...n-----END PRIVATE KEY-----\n`;
const CLIENT_EMAIL = 'your-service-account@your-project.iam.gserviceaccount.com';
Thay thế ... bằng nội dung thực tế từ tệp JSON.

**🧩 Bước 6: Thêm thư viện OAuth2 vào project**
Bạn cần thêm thư viện OAuth2 vào project Apps Script của bạn.
Thêm thư viện OAuth2
Vào menu “Resources” → “Libraries…” (hoặc "Tài nguyên" → "Thư viện...")

Ở ô "Add a Library", nhập ID sau: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF
_**(Nếu ID không đúng thì vào link github để lấy ID:
GitHub: https://github.com/googleworkspace/apps-script-oauth2
Hướng dẫn của Google: https://github.com/googleworkspace/apps-script-oauth2#using-the-library)**_

Ở ô "Sevices" chọn **Admin SDK API** và **Gmail API**

