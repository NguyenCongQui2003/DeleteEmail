// === CẤU HÌNH SERVICE ACCOUNT ===
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
DÁN TOÀN BỘ PRIVATE KEY Ở ĐÂY
-----END PRIVATE KEY-----`;

const CLIENT_EMAIL = 'xxxxxxx@xxxxx.iam.gserviceaccount.com'; // email của service account

const messageIdToDelete = '<abc123456@mail.gmail.com>'; // Message-ID muốn xoá

// === XOÁ EMAIL TRONG TOÀN DOMAIN ===
function deleteEmailFromAllUsers() {
  const users = getAllUsersInDomain();
  users.forEach(userEmail => {
    Logger.log(`🔍 Đang kiểm tra email: ${userEmail}`);
    const service = getService(userEmail);
    if (service.hasAccess()) {
      const query = `rfc822msgid:${messageIdToDelete}`;
      const url = `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages?q=${encodeURIComponent(query)}`;
      const response = UrlFetchApp.fetch(url, {
        headers: {
          Authorization: `Bearer ${service.getAccessToken()}`
        }
      });
      const data = JSON.parse(response.getContentText());
      const messages = data.messages || [];
      Logger.log(`📩 Tìm thấy ${messages.length} email cần xoá`);
      messages.forEach(msg => {
        const deleteUrl = `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages/${msg.id}`;
        const delResponse = UrlFetchApp.fetch(deleteUrl, {
          method: 'delete',
          headers: {
            Authorization: `Bearer ${service.getAccessToken()}`
          }
        });
        Logger.log(`🗑️ Đã xoá email ID ${msg.id} khỏi ${userEmail}`);
      });
    } else {
      Logger.log(`❌ Không có quyền truy cập: ${userEmail}`);
    }
  });
}

// === LẤY DANH SÁCH NGƯỜI DÙNG TRONG DOMAIN ===
function getAllUsersInDomain() {
  const adminEmail = 'admin@yourdomain.com'; // email admin
  const service = getService(adminEmail);
  const allUsers = [];
  let pageToken;
  do {
    const url = `https://admin.googleapis.com/admin/directory/v1/users?customer=my_customer&maxResults=100&orderBy=email${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: `Bearer ${service.getAccessToken()}`
      }
    });
    const data = JSON.parse(response.getContentText());
    const users = data.users || [];
    users.forEach(u => allUsers.push(u.primaryEmail));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return allUsers;
}

// === TẠO SERVICE CHO USER ===
function getService(userEmail) {
  return OAuth2.createService('gmail:' + userEmail)
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setPrivateKey(PRIVATE_KEY)
    .setIssuer(CLIENT_EMAIL)
    .setSubject(userEmail)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope('https://mail.google.com https://www.googleapis.com/auth/admin.directory.user.readonly');
}
