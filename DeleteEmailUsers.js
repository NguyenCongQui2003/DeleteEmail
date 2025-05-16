// 🔐 Thông tin từ Service Account JSON
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----`;  // Dán đầy đủ từ JSON
const CLIENT_EMAIL = 'deleteemailscript@create-service-account';  // Email từ JSON

// 📩 Danh sách người dùng cần xoá email
function deleteEmailFromAllUsers() {
  const users = ['test@cloudaz.site', 'admin@cloudaz.site'];
  const messageIdToDelete = '<abc123456@mail.gmail.com>'; // <-- Message-ID cần xoá

  users.forEach(userEmail => {
    Logger.log(`🔍 Đang kiểm tra email: ${userEmail}`);
    const service = getService(userEmail);

    if (service.hasAccess()) {
      // ❗ Tìm theo message-id chuẩn RFC 822
      const query = encodeURIComponent(`rfc822msgid:${messageIdToDelete}`);
      const url = `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages?q=${query}`;
      Logger.log(`🔗 URL truy vấn: ${url}`);

      const response = UrlFetchApp.fetch(url, {
        headers: {
          Authorization: `Bearer ${service.getAccessToken()}`
        },
        muteHttpExceptions: false
      });

      const data = JSON.parse(response.getContentText());
      Logger.log(`📤 Kết quả API: ${response.getContentText()}`);

      const messages = data.messages || [];
      Logger.log(`📩 Tìm thấy ${messages.length} email cần xoá`);

      messages.forEach(msg => {
        const deleteUrl = `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages/${msg.id}`;
        const delResponse = UrlFetchApp.fetch(deleteUrl, {
          method: 'delete',
          headers: {
            Authorization: `Bearer ${service.getAccessToken()}`
          },
          muteHttpExceptions: false
        });

        Logger.log(`🗑️ Đã xoá vĩnh viễn email ID ${msg.id} khỏi ${userEmail}`);
        Logger.log(`📡 Phản hồi xoá: ${delResponse.getResponseCode()} - ${delResponse.getContentText()}`);
      });

    } else {
      Logger.log(`❌ Không có quyền truy cập email: ${userEmail}`);
    }
  });
}

// 🔐 Hàm tạo OAuth2 service với Domain-Wide Delegation
function getService(userEmail) {
  return OAuth2.createService('gmail:' + userEmail)
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setPrivateKey(PRIVATE_KEY)
    .setIssuer(CLIENT_EMAIL)
    .setSubject(userEmail)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope('https://mail.google.com');
}
