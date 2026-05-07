// Sử dụng Firebase phiên bản 8 (Compat) để chạy trực tiếp từ file:/// không cần Local Server

// Cấu hình Firebase của bạn
const firebaseConfig = {
  apiKey: "AIzaSyDwQJ27i-rXeV9K0rKKK_pYotKtyvpoYp0",
  authDomain: "webphim-7a6b2.firebaseapp.com",
  projectId: "webphim-7a6b2",
  storageBucket: "webphim-7a6b2.firebasestorage.app",
  messagingSenderId: "553878448079",
  appId: "1:553878448079:web:975fc006eaeeaa59e854ba",
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const db = firebase.firestore();

// Xử lý kết quả redirect khi quay lại trang (cho mobile hoặc khi popup bị chặn)
auth.getRedirectResult().then((result) => {
  if (result && result.user) {
    console.log("Đăng nhập thành công qua redirect!", result.user.displayName);
    let localSaved = JSON.parse(localStorage.getItem('savedMovies')) || {};
    let localHistory = JSON.parse(localStorage.getItem('watchHistory')) || {};
    let localProgress = JSON.parse(localStorage.getItem('videoProgress')) || {};
    if (Object.keys(localSaved).length > 0) window.syncToCloud('savedMovies', localSaved);
    if (Object.keys(localHistory).length > 0) window.syncToCloud('watchHistory', localHistory);
    if (Object.keys(localProgress).length > 0) window.syncToCloud('videoProgress', localProgress);
  }
}).catch((error) => {
  console.error("Lỗi redirect result:", error);
});

// Hàm đẩy dữ liệu lên Firestore
window.syncToCloud = function (key, data) {
  const user = auth.currentUser;
  if (!user) return; // Chỉ đồng bộ khi đã đăng nhập

  // Dùng update để GHI ĐÈ hoàn toàn trường [key], giúp xóa mục con hoạt động đúng
  db.collection('users').doc(user.uid).update({
    [key]: data
  }).catch(error => {
    if (error.code === 'not-found') {
      // Nếu doc chưa tồn tại thì mới dùng set
      db.collection('users').doc(user.uid).set({ [key]: data });
    } else {
      console.error("Lỗi đồng bộ lên cloud:", error);
    }
  });
}

function renderAuthUI(user) {
  const authArea = document.getElementById('authArea');
  if (!authArea) return;

  if (user) {
    // Đã đăng nhập
    authArea.innerHTML = `
            <div class="user-profile" onclick="handleSignOut()">
                <img src="${user.photoURL || 'https://via.placeholder.com/28'}" class="user-avatar" alt="Avatar" referrerpolicy="no-referrer">
                <span class="logout-text">Đăng xuất</span>
            </div>
        `;
  } else {
    // Chưa đăng nhập
    authArea.innerHTML = `
            <button class="auth-btn" onclick="handleSignIn()">
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                Đăng nhập
            </button>
        `;
  }
}

// Các hàm này cần gán vào window để HTML có thể gọi qua onclick=""
window.handleSignIn = function () {
  // Thử popup trước, nếu bị chặn thì fallback sang redirect (hỗ trợ mobile + GitHub Pages)
  auth.signInWithPopup(provider)
    .then((result) => {
      console.log("Đăng nhập thành công!", result.user.displayName);
      let localSaved = JSON.parse(localStorage.getItem('savedMovies')) || {};
      let localHistory = JSON.parse(localStorage.getItem('watchHistory')) || {};
      let localProgress = JSON.parse(localStorage.getItem('videoProgress')) || {};
      if (Object.keys(localSaved).length > 0) window.syncToCloud('savedMovies', localSaved);
      if (Object.keys(localHistory).length > 0) window.syncToCloud('watchHistory', localHistory);
      if (Object.keys(localProgress).length > 0) window.syncToCloud('videoProgress', localProgress);
    }).catch((error) => {
      // Nếu popup bị chặn -> dùng redirect thay thế
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.warn("Popup bị chặn, chuyển sang đăng nhập bằng redirect...");
        auth.signInWithRedirect(provider);
      } else {
        console.error("Lỗi đăng nhập:", error);
        alert("Lỗi đăng nhập: " + error.message);
      }
    });
}

window.handleSignOut = function () {
  if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
    auth.signOut().then(() => {
      console.log("Đăng xuất thành công");
      // Có thể reload lại trang để clear data nếu muốn
      window.location.reload();
    }).catch((error) => {
      console.error("Lỗi đăng xuất", error);
    });
  }
}

let unsubscribeSnapshot = null;

// Lắng nghe trạng thái đăng nhập
auth.onAuthStateChanged((user) => {
  renderAuthUI(user);

  if (user) {
    // Nếu đã đăng nhập, lắng nghe thay đổi từ Firestore (Realtime)
    unsubscribeSnapshot = db.collection('users').doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          let needsReload = false;

          if (data.savedMovies) {
            localStorage.setItem('savedMovies', JSON.stringify(data.savedMovies));
            if (window.loadSavedMovies) window.loadSavedMovies(); // Refresh UI nếu đang ở trang Tủ Phim
            needsReload = true;
          }
          if (data.watchHistory) {
            localStorage.setItem('watchHistory', JSON.stringify(data.watchHistory));
            if (window.loadHistory) window.loadHistory(); // Refresh UI nếu đang ở trang Chủ
            needsReload = true;
          }
          if (data.videoProgress) {
            localStorage.setItem('videoProgress', JSON.stringify(data.videoProgress));
          }

          // Cập nhật lại UI nút lưu ở trang chi tiết nếu cần
          if (needsReload && window.checkSavedStatus) {
            window.checkSavedStatus();
          }
        }
      });
  } else {
    // Hủy lắng nghe nếu đăng xuất
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
  }
});
