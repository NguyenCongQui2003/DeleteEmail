// 🔐 Thông tin từ Service Account JSON
const PRIVATE_KEY = ``;
const CLIENT_EMAIL = '';
const ADMIN_EMAIL = 'qui@source.gcloud.id.vn'; // email có quyền supper admin
const DOMAIN = 'source.gcloud.id.vn'; // domain tổ chức 

// 🔐 Tạo OAuth2 service
function getService(userEmail) {
  return OAuth2.createService('gmail:' + userEmail)
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setPrivateKey(PRIVATE_KEY)
    .setIssuer(CLIENT_EMAIL)
    .setSubject(userEmail)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope([
      'https://mail.google.com',
      'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
      'https://www.googleapis.com/auth/admin.directory.user.readonly'
    ]);
}

// 📦 Lấy danh sách email thành viên từ Google Group (gồm cả CUSTOMER)
function getEmailsFromGroup(groupEmail) {
  Logger.log(`📧 Đang truy vấn thành viên của group: ${groupEmail}`);
  const service = getService(ADMIN_EMAIL);
  if (!service.hasAccess()) {
    Logger.log('❌ Không thể truy cập Directory API.');
    return [];
  }

  const url = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members`;
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: `Bearer ${service.getAccessToken()}` },
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  Logger.log(`📡 Phản hồi từ API Directory: ${code} - ${response.getContentText()}`);
  if (code !== 200) return [];

  const data = JSON.parse(response.getContentText());
  const members = data.members || [];

  let emails = members.filter(m => m.type === 'USER' && m.email).map(m => m.email);

  if (members.some(m => m.type === 'CUSTOMER')) {
    Logger.log('🔍 Nhóm chứa thành viên loại CUSTOMER — đang lấy toàn bộ người dùng trong domain...');
    const domainUsers = getAllUsersInDomain();
    emails = emails.concat(domainUsers);
  }

  Logger.log(`✅ Tổng số người dùng sẽ xử lý: ${emails.length}`);
  return emails;
}

// 📋 Lấy toàn bộ người dùng trong domain
function getAllUsersInDomain() {
  const service = getService(ADMIN_EMAIL);
  const users = [];
  let pageToken = null;

  do {
    const url = `https://admin.googleapis.com/admin/directory/v1/users?domain=${DOMAIN}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`;
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: `Bearer ${service.getAccessToken()}` },
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    if (code !== 200) {
      Logger.log(`❌ Không thể lấy danh sách user domain. Mã lỗi: ${code}`);
      return users;
    }

    const data = JSON.parse(response.getContentText());
    (data.users || []).forEach(u => {
      if (u.primaryEmail && !u.suspended) users.push(u.primaryEmail);
    });

    pageToken = data.nextPageToken;
  } while (pageToken);

  Logger.log(`📦 Tổng số người dùng thực tế trong domain: ${users.length}`);
  return users;
}

// 🧹 Xoá email theo Message-ID (rfc822msgid)
function deleteEmailByMessageId(groupEmail, messageId) {
  const users = getEmailsFromGroup(groupEmail);
  if (!users.length) {
    Logger.log('⚠️ Không có người dùng nào để xử lý.');
    return;
  }

  let totalDeleted = 0;
  const failedDeletes = [];

  users.forEach(userEmail => {
    Logger.log(`🔍 Kiểm tra email của: ${userEmail}`);
    const service = getService(userEmail);
    if (!service.hasAccess()) {
      failedDeletes.push({ email: userEmail, reason: 'No access token' });
      return;
    }

    const query = `rfc822msgid:${messageId}`; // Message-ID cần bao gồm dấu < >
    const url = `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages?q=${encodeURIComponent(query)}`;
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: `Bearer ${service.getAccessToken()}` },
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    if (code !== 200) {
      Logger.log(`❌ Không tìm được email trong ${userEmail} — mã lỗi: ${code}`);
      failedDeletes.push({ email: userEmail, reason: 'Search failed' });
      return;
    }

    const data = JSON.parse(response.getContentText());
    const messages = data.messages || [];

    Logger.log(`📩 Tìm thấy ${messages.length} email có Message-ID cần xoá`);

    messages.forEach(msg => {
      const deleteUrl = `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages/${msg.id}`;
      const delResponse = UrlFetchApp.fetch(deleteUrl, {
        method: 'delete',
        headers: { Authorization: `Bearer ${service.getAccessToken()}` },
        muteHttpExceptions: true
      });

      const delCode = delResponse.getResponseCode();
      if (delCode === 204) {
        totalDeleted++;
        Logger.log(`🗑️ Đã xoá email ID ${msg.id} khỏi ${userEmail}`);
      } else {
        Logger.log(`⚠️ Không thể xoá email ID ${msg.id} trong ${userEmail} — mã lỗi: ${delCode}`);
        failedDeletes.push({ email: userEmail, messageId: msg.id, reason: `Delete failed (${delCode})` });
      }
    });
  });

  // ✅ Tổng kết
  Logger.log('=======================');
  Logger.log(`✅ Tổng số email xoá thành công: ${totalDeleted}`);
  Logger.log(`❌ Tổng số thất bại: ${failedDeletes.length}`);
  if (failedDeletes.length) {
    Logger.log('📋 Danh sách thất bại:');
    failedDeletes.forEach(f => {
      Logger.log(`• ${f.email}${f.messageId ? ` (msg: ${f.messageId})` : ''} → ${f.reason}`);
    });
  }
  Logger.log('=======================');
}

// 🚀 Hàm chính
function main() {
  const groupEmail = 'all@source.gcloud.id.vn';
  const messageId = '<CAAh-XV=3ByzmrXWGwA2s6Srmc1-efp42aEcShg31o-jUGGv_Gw@mail.gmail.com>';  // Phải giữ nguyên dấu < >

  Logger.log(`🚀 Bắt đầu xoá email theo Message-ID: ${messageId} trong group: ${groupEmail}`);
  deleteEmailByMessageId(groupEmail, messageId);
}
