// === CẤU HÌNH SERVICE ACCOUNT ===
const PRIVATE_KEY = ``;
const CLIENT_EMAIL = '';
const emailSubjectToDelete = ''; // Tiêu đề cần xóa

// === HÀM CHÍNH: XOÁ EMAIL THEO TIÊU ĐỀ TRONG TOÀN DOMAIN ===
function deleteEmailFromAllUsers() {
  const users = getAllUsersInDomain();
  let totalDeleted = 0;
  let totalUsers = users.length;
  
  Logger.log(`\n🚀 BẮT ĐẦU XÓA EMAIL: "${emailSubjectToDelete}"`);
  Logger.log(`👥 Tổng số user cần kiểm tra: ${totalUsers}\n`);
  
  users.forEach((userEmail, index) => {
    Logger.log(`[${index + 1}/${totalUsers}] 🔍 Đang kiểm tra: ${userEmail}`);
    const service = getService(userEmail);
    
    if (!service.hasAccess()) {
      Logger.log(`   ❌ Không có quyền truy cập`);
      return;
    }
    
    try {
      let pageToken;
      let userTotalDeleted = 0;
      let pageNumber = 1;
      
      // Vòng lặp phân trang: Lặp cho đến khi HẾT pageToken
      do {
        const query = `subject:"${emailSubjectToDelete}"`;
        let url = `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages?q=${encodeURIComponent(query)}&maxResults=100`;
        
        // Thêm pageToken từ lần lặp thứ 2 trở đi
        if (pageToken) {
          url += `&pageToken=${pageToken}`;
        }
        
        Logger.log(`   📄 Đang lấy trang ${pageNumber}...`);
        
        const response = UrlFetchApp.fetch(url, {
          headers: {
            Authorization: `Bearer ${service.getAccessToken()}`
          },
          muteHttpExceptions: true
        });
        
        const responseCode = response.getResponseCode();
        
        // Xử lý lỗi
        if (responseCode === 400) {
          Logger.log(`   ⚠️ Gmail chưa được kích hoạt - Bỏ qua\n`);
          break;
        }
        
        if (responseCode !== 200) {
          Logger.log(`   ❌ Lỗi ${responseCode}: ${response.getContentText()}\n`);
          break;
        }
        
        const data = JSON.parse(response.getContentText());
        const messages = data.messages || [];
        
        if (messages.length > 0) {
          Logger.log(`   📩 Tìm thấy ${messages.length} email ở trang ${pageNumber}`);
          
          // Xóa từng email trong trang này
          messages.forEach(msg => {
            const deleteUrl = `https://gmail.googleapis.com/gmail/v1/users/${userEmail}/messages/${msg.id}`;
            const delResponse = UrlFetchApp.fetch(deleteUrl, {
              method: 'delete',
              headers: {
                Authorization: `Bearer ${service.getAccessToken()}`
              },
              muteHttpExceptions: true
            });
            
            if (delResponse.getResponseCode() === 204) {
              userTotalDeleted++;
              totalDeleted++;
            } else {
              Logger.log(`   ⚠️ Không thể xóa email ID: ${msg.id}`);
            }
          });
          
          Logger.log(`   🗑️ Đã xóa ${messages.length} email từ trang ${pageNumber}`);
        } else {
          Logger.log(`   📭 Không có email nào ở trang ${pageNumber}`);
        }
        
        // Lấy token của trang tiếp theo
        pageToken = data.nextPageToken;
        pageNumber++;
        
        // Delay nhỏ để tránh rate limit
        if (pageToken) {
          Utilities.sleep(200);
        }
        
      } while (pageToken); // Chỉ lặp khi CÒN pageToken
      
      if (userTotalDeleted > 0) {
        Logger.log(`   ✅ Tổng: ${userTotalDeleted} email đã xóa (${pageNumber - 1} trang)\n`);
      } else {
        Logger.log(`   📭 Không có email nào cần xóa\n`);
      }
      
    } catch (e) {
      Logger.log(`   ❌ LỖI: ${e.message}\n`);
    }
  });
  
  Logger.log(`\n${'='.repeat(60)}`);
  Logger.log(`🎉 HOÀN TẤT!`);
  Logger.log(`📊 Tổng số email đã xóa: ${totalDeleted}`);
  Logger.log(`👥 Số user đã kiểm tra: ${totalUsers}`);
  Logger.log(`${'='.repeat(60)}\n`);
}

// === LẤY DANH SÁCH TẤT CẢ USER TRONG DOMAIN ===
function getAllUsersInDomain() {
  const adminEmail = 'admin@elite-si.com';
  const service = getService(adminEmail);
  const allUsers = [];
  let pageToken;
  
  Logger.log(`📋 Đang lấy danh sách user từ domain...`);
  
  do {
    const url = `https://admin.googleapis.com/admin/directory/v1/users?customer=my_customer&maxResults=100&orderBy=email${pageToken ? `&pageToken=${pageToken}` : ''}`;
    
    try {
      const response = UrlFetchApp.fetch(url, {
        headers: {
          Authorization: `Bearer ${service.getAccessToken()}`
        }
      });
      
      const data = JSON.parse(response.getContentText());
      const users = data.users || [];
      users.forEach(u => allUsers.push(u.primaryEmail));
      pageToken = data.nextPageToken;
      
    } catch (e) {
      Logger.log(`❌ Lỗi khi lấy danh sách user: ${e.message}`);
      break;
    }
  } while (pageToken);
  
  Logger.log(`✅ Đã lấy ${allUsers.length} user\n`);
  return allUsers;
}

// === TẠO SERVICE OAUTH2 CHO TỪNG USER ===
function getService(userEmail) {
  return OAuth2.createService('gmail:' + userEmail)
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setPrivateKey(PRIVATE_KEY)
    .setIssuer(CLIENT_EMAIL)
    .setSubject(userEmail)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope('https://mail.google.com https://www.googleapis.com/auth/admin.directory.user.readonly');
}

// === HÀM PHỤ: XÓA CACHE OAUTH2 (khi cần reset) ===
function resetOAuth2Cache() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log('✅ Đã xóa cache OAuth2');
}

// === HÀM PHỤ: KIỂM TRA KẾT NỐI (chạy trước khi xóa) ===
function testConnection() {
  const adminEmail = 'admin@elite-si.com';
  const service = getService(adminEmail);
  
  if (service.hasAccess()) {
    Logger.log('✅ Kết nối thành công với admin account');
    
    // Test lấy danh sách user
    try {
      const users = getAllUsersInDomain();
      Logger.log(`✅ Lấy được ${users.length} user từ domain`);
      Logger.log(`📋 5 user đầu tiên: ${users.slice(0, 5).join(', ')}`);
    } catch (e) {
      Logger.log(`❌ Lỗi: ${e.message}`);
    }
  } else {
    Logger.log('❌ Không thể kết nối. Kiểm tra lại:');
    Logger.log('   1. Service Account đã được tạo chưa?');
    Logger.log('   2. Domain-wide delegation đã được bật chưa?');
    Logger.log('   3. Scope đã được thêm đúng chưa?');
  }
}