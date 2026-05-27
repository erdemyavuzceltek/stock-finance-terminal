/**
 * account-settings.js
 * Stoxer Kullanıcı Ayarları Paneli Mantığı
 */

// Tab geçişi
window.accountSettingsTabGoster = function(tabId) {
    document.querySelectorAll('.account-settings-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.account-settings-section').forEach(sec => sec.classList.remove('active'));
    
    // Find the button and section
    const buttons = document.querySelectorAll('.account-settings-tab-btn');
    let targetIndex = 0;
    if (tabId === 'profile') targetIndex = 0;
    else if (tabId === 'security') targetIndex = 1;
    else if (tabId === 'preferences') targetIndex = 2;
    else if (tabId === 'danger') targetIndex = 3;

    if (buttons[targetIndex]) buttons[targetIndex].classList.add('active');
    
    const targetSection = document.getElementById('accountTab' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    if (targetSection) targetSection.classList.add('active');

    // Her tab geçişinde mesaj kutusunu temizle
    const msgBox = document.getElementById('accountSettingsMessage');
    if (msgBox) {
        msgBox.className = 'account-settings-message';
        msgBox.innerHTML = '';
    }

    if (tabId === 'profile') {
        updateProfileInfo();
    }
};

window.showAccountSettingsMessage = function(message, isSuccess) {
    const msgBox = document.getElementById('accountSettingsMessage');
    if (!msgBox) return;
    msgBox.textContent = message;
    msgBox.className = 'account-settings-message ' + (isSuccess ? 'success' : 'error');
    setTimeout(() => {
        msgBox.className = 'account-settings-message';
        msgBox.textContent = '';
    }, 5000);
};

window.updateProfileInfo = function() {
    if (typeof stockxerUser === 'undefined' || !stockxerUser) return;
    
    const nameInput = document.getElementById('profileFullNameInput');
    const emailInput = document.getElementById('profileEmailInput');
    const preview = document.getElementById('profileImagePreview');
    
    if (nameInput) nameInput.value = stockxerUser.fullName || '';
    if (emailInput) emailInput.value = stockxerUser.email || '';
    
    if (preview) {
        if (stockxerUser.profileImageUrl) {
            preview.innerHTML = `<img src="${stockxerUser.profileImageUrl}" alt="Profil">`;
        } else {
            preview.innerHTML = '👤';
        }
    }
    
    // Yükle formunu preferences ile
    const defaultPage = document.getElementById('defaultPageSelect');
    if (defaultPage && stockxerUser.defaultPage) defaultPage.value = stockxerUser.defaultPage;
};

window.uploadProfileImage = async function() {
    const input = document.getElementById('profileImageInput');
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const res = await fetch(`/api/account/${stockxerUser.id}/profile-image`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            stockxerUser.profileImageUrl = data.profileImageUrl;
            localStorage.setItem('stockxerUser', JSON.stringify(stockxerUser));
            updateProfileInfo();
            if (typeof updateSidebarUserBox === 'function') updateSidebarUserBox();
            showAccountSettingsMessage(data.message, true);
        } else {
            showAccountSettingsMessage(data.message, false);
        }
    } catch (e) {
        console.error(e);
        showAccountSettingsMessage('Profil fotoğrafı yüklenemedi.', false);
    }
};

window.removeProfileImage = async function() {
    try {
        const res = await fetch(`/api/account/${stockxerUser.id}/profile-image`, {
            method: 'DELETE'
        });
        const data = await res.json();
        
        if (data.success) {
            stockxerUser.profileImageUrl = null;
            localStorage.setItem('stockxerUser', JSON.stringify(stockxerUser));
            updateProfileInfo();
            if (typeof updateSidebarUserBox === 'function') updateSidebarUserBox();
            showAccountSettingsMessage(data.message, true);
        } else {
            showAccountSettingsMessage(data.message, false);
        }
    } catch (e) {
        console.error(e);
        showAccountSettingsMessage('Profil fotoğrafı silinemedi.', false);
    }
};

window.updateProfileInfoSubmit = window.updateProfileInfoSubmit || async function() {
    const fullName = document.getElementById('profileFullNameInput').value.trim();
    if (!fullName) {
        showAccountSettingsMessage('Ad Soyad boş olamaz.', false);
        return;
    }
    
    try {
        const res = await fetch(`/api/account/${stockxerUser.id}/profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName })
        });
        const data = await res.json();
        if (data.success) {
            stockxerUser = { ...stockxerUser, ...data.user };
            localStorage.setItem('stockxerUser', JSON.stringify(stockxerUser));
            updateProfileInfo();
            if (typeof updateSidebarUserBox === 'function') updateSidebarUserBox();
            showAccountSettingsMessage(data.message, true);
        } else {
            showAccountSettingsMessage(data.message, false);
        }
    } catch(e) {
        showAccountSettingsMessage('Bilgiler güncellenemedi.', false);
    }
};

// Map old button onclick just in case
window.updateProfileInfo = window.updateProfileInfo;
// Override the button action to use the submit one
document.querySelector('#accountTabProfile .auth-primary-btn').onclick = window.updateProfileInfoSubmit;

window.changePassword = async function() {
    const currentPassword = document.getElementById('currentPasswordInput').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmNewPasswordInput = document.getElementById('confirmNewPasswordInput').value;
    
    if (!currentPassword || !newPassword || !confirmNewPasswordInput) {
        showAccountSettingsMessage('Tüm alanları doldurun.', false);
        return;
    }
    if (newPassword !== confirmNewPasswordInput) {
        showAccountSettingsMessage('Yeni şifreler eşleşmiyor.', false);
        return;
    }
    
    try {
        const res = await fetch(`/api/account/${stockxerUser.id}/password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword, newPasswordConfirm: confirmNewPasswordInput })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('currentPasswordInput').value = '';
            document.getElementById('newPasswordInput').value = '';
            document.getElementById('confirmNewPasswordInput').value = '';
            showAccountSettingsMessage(data.message, true);
        } else {
            showAccountSettingsMessage(data.message, false);
        }
    } catch(e) {
        showAccountSettingsMessage('Şifre güncellenemedi.', false);
    }
};

window.saveUserPreferences = async function() {
    const defaultPage = document.getElementById('defaultPageSelect').value;
    const priceAlert = document.getElementById('priceAlertNotificationsToggle').checked;
    const portNews = document.getElementById('portfolioNewsNotificationsToggle').checked;
    const watchNews = document.getElementById('watchlistNewsNotificationsToggle').checked;
    const theme = document.getElementById('themePreferenceSelect').value;
    
    try {
        const res = await fetch(`/api/account/${stockxerUser.id}/preferences`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                defaultPage,
                priceAlertNotifications: priceAlert,
                portfolioNewsNotifications: portNews,
                watchlistNewsNotifications: watchNews,
                themePreference: theme
            })
        });
        const data = await res.json();
        if (data.success) {
            stockxerUser.defaultPage = defaultPage;
            localStorage.setItem('stockxerUser', JSON.stringify(stockxerUser));
            showAccountSettingsMessage(data.message, true);
        } else {
            showAccountSettingsMessage(data.message, false);
        }
    } catch(e) {
        showAccountSettingsMessage('Tercihler güncellenemedi.', false);
    }
};

window.dangerZoneDeleteAccount = function() {
    if (confirm("Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
        if (typeof deleteUserAccount === 'function') {
            deleteUserAccount(); // Call existing function from auth.js
        }
    }
};

// Event hook
document.addEventListener('DOMContentLoaded', () => {
    // Modify existing authModalAc slightly
    const origAuthModalAc = window.authModalAc;
    if (origAuthModalAc) {
        window.authModalAc = function() {
            origAuthModalAc();
            if (typeof stockxerUser !== 'undefined' && stockxerUser) {
                // If logged in, ensure profile tab is visible first
                accountSettingsTabGoster('profile');
            }
        };
    }
});
