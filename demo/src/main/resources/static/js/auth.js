// ==========================================
// KULLANICI DOĞRULAMA (AUTH) FONKSİYONLARI
// ==========================================

let stockxerUser = null;

// Sayfa yüklendiğinde mevcut oturumu kontrol et
document.addEventListener("DOMContentLoaded", () => {
    getCurrentUser();
    // ESC ile modal kapatma
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") authModalKapat();
    });
});

// ── Modal Açma / Kapama ──────────────────────────────────────────────────────

window.authModalAc = function() {
    const backdrop = document.getElementById("authModalBackdrop");
    const modal    = document.getElementById("authModal");
    if (backdrop) {
        backdrop.classList.add("active");
        backdrop.style.pointerEvents = "auto";
    }
    if (modal) {
        modal.classList.add("active");
    }
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";

    if (stockxerUser) {
        const notLoggedIn = document.getElementById("authFormsContainer");
        const loggedIn    = document.getElementById("authLoggedIn");
        if (notLoggedIn) notLoggedIn.style.display = "none";
        if (loggedIn)    loggedIn.style.display    = "block";
        const nameEl  = document.getElementById("authProfileName");
        const emailEl = document.getElementById("authProfileEmail");
        if (nameEl)  nameEl.innerText  = stockxerUser.fullName;
        if (emailEl) emailEl.innerText = stockxerUser.email;
    } else {
        const notLoggedIn = document.getElementById("authFormsContainer");
        const loggedIn    = document.getElementById("authLoggedIn");
        if (notLoggedIn) notLoggedIn.style.display = "block";
        if (loggedIn)    loggedIn.style.display    = "none";
        authTabGoster('login');
    }
};

window.authModalKapat = function() {
    const backdrop = document.getElementById("authModalBackdrop");
    const modal    = document.getElementById("authModal");
    if (backdrop) {
        backdrop.classList.remove("active");
        backdrop.style.pointerEvents = "none";
    }
    if (modal) {
        modal.classList.remove("active");
    }
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
    hideAuthMessage();
};

// ── Tab Değiştirme ────────────────────────────────────────────────────────────

window.authTabGoster = function(tabId) {
    // Buton isimleri HTML'de "tabLogin" / "tabRegister" olarak tanımlı
    document.querySelectorAll(".auth-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".auth-form").forEach(form => form.classList.remove("active"));

    // tabId = 'login' → id="tabLogin", id="formlogin"
    const btn  = document.getElementById("tab" + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    const form = document.getElementById("form" + tabId);
    if (btn)  btn.classList.add("active");
    if (form) form.classList.add("active");
    hideAuthMessage();
};

// ── Mesaj Gösterimi ───────────────────────────────────────────────────────────

function showAuthMessage(msg, isSuccess = false) {
    // HTML'de id="authErrorMsg" var, authStatusMessage yok
    const el = document.getElementById("authErrorMsg") || document.getElementById("authStatusMessage");
    if (!el) return;
    el.innerText = msg;
    el.style.display = "block";
    if (isSuccess) {
        el.style.color           = "var(--positive)";
        el.style.backgroundColor = "var(--positive-bg)";
        el.style.border          = "1px solid rgba(16, 185, 129, 0.2)";
    } else {
        el.style.color           = "var(--negative)";
        el.style.backgroundColor = "var(--negative-bg)";
        el.style.border          = "1px solid rgba(244, 63, 94, 0.2)";
    }
}

function hideAuthMessage() {
    const el = document.getElementById("authErrorMsg") || document.getElementById("authStatusMessage");
    if (el) { el.innerText = ""; el.style.display = "none"; }
}

window.authEnter = function(event, type) {
    if (event.key === 'Enter') {
        if (type === 'login') loginUser();
        else registerUser();
    }
};

// ── API Çağrıları ──────────────────────────────────────────────────────────────

window.registerUser = async function() {
    const fullNameEl  = document.getElementById("regFullName");
    const emailEl     = document.getElementById("regEmail");
    const passwordEl  = document.getElementById("regPassword");

    const fullName = fullNameEl ? fullNameEl.value.trim() : "";
    const email    = emailEl    ? emailEl.value.trim()    : "";
    const password = passwordEl ? passwordEl.value        : "";

    if (!fullName) { showAuthMessage("Ad Soyad boş bırakılamaz."); return; }
    if (!email)    { showAuthMessage("Email boş bırakılamaz."); return; }
    if (!password) { showAuthMessage("Şifre boş bırakılamaz."); return; }
    if (password.length < 6) { showAuthMessage("Şifre en az 6 karakter olmalı."); return; }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password })
        });
        const data = await response.json();

        if (data.success) {
            showAuthMessage(data.message || "Kayıt başarılı!", true);
            setCurrentUser(data.user);
            setTimeout(() => authModalKapat(), 1500);
        } else {
            showAuthMessage(data.message || "Kayıt başarısız.");
        }
    } catch (error) {
        showAuthMessage("Bağlantı hatası oluştu.");
    }
};

window.loginUser = async function() {
    const emailEl    = document.getElementById("loginEmail");
    const passwordEl = document.getElementById("loginPassword");

    const email    = emailEl    ? emailEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value     : "";

    if (!email || !password) { showAuthMessage("Email ve şifre giriniz."); return; }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (data.success) {
            showAuthMessage(data.message || "Giriş başarılı!", true);
            setCurrentUser(data.user);
            setTimeout(() => authModalKapat(), 1000);
        } else {
            showAuthMessage(data.message || "Giriş başarısız.");
        }
    } catch (error) {
        showAuthMessage("Bağlantı hatası oluştu.");
    }
};

window.logoutUser = function() {
    clearCurrentUser();
    authModalKapat();
    // Dashboard'u guest'e döndür
    if (typeof dashboardYukle === 'function') setTimeout(dashboardYukle, 100);
};

window.deleteUserAccount = async function() {
    if (!stockxerUser) return;
    const isConfirmed = confirm("Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.");
    if (!isConfirmed) return;

    try {
        const response = await fetch('/api/auth/account/' + stockxerUser.id, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            alert(data.message || "Hesap silindi.");
            clearCurrentUser();
            authModalKapat();
            if (typeof dashboardYukle === 'function') setTimeout(dashboardYukle, 100);
        } else {
            alert("Silme başarısız: " + (data.message || ""));
        }
    } catch (error) {
        alert("Bağlantı hatası oluştu.");
    }
};

// ── localStorage İşlemleri ────────────────────────────────────────────────────

window.getCurrentUser = function() {
    try {
        const legacyUser = localStorage.getItem("stockxerUser");
        if (legacyUser && !sessionStorage.getItem("stockxerSessionUser")) {
            localStorage.removeItem("stockxerUser");
        }

        const userStr = sessionStorage.getItem("stockxerSessionUser");
        if (userStr) {
            const user = JSON.parse(userStr);
            if (!user || !user.id || !user.email) {
                sessionStorage.removeItem("stockxerSessionUser");
                stockxerUser = null;
            } else {
                stockxerUser = user;
            }
        } else {
            stockxerUser = null;
        }
    } catch (e) {
        sessionStorage.removeItem("stockxerSessionUser");
        stockxerUser = null;
    }
    updateSidebarUserBox();
    if (typeof updatePortfolioAuthState === 'function') setTimeout(updatePortfolioAuthState, 100);
    if (typeof loadUserStockNotes === 'function') loadUserStockNotes();
    return stockxerUser;
};

function setCurrentUser(user) {
    if (!user || !user.id || !user.email) {
        clearCurrentUser();
        return;
    }
    const safeUser = { 
        id: user.id, 
        fullName: user.fullName || user.name || "", 
        email: user.email,
        profileImageUrl: user.profileImageUrl || "",
        defaultPage: user.defaultPage || "dashboard"
    };
    stockxerUser = safeUser;
    sessionStorage.setItem("stockxerSessionUser", JSON.stringify(safeUser));
    updateSidebarUserBox();
    if (typeof updatePortfolioAuthState === 'function') updatePortfolioAuthState();
    if (typeof migratePortfolioData     === 'function') migratePortfolioData();
    if (typeof loadUserPortfolio        === 'function') loadUserPortfolio();
    if (typeof loadUserStockNotes       === 'function') loadUserStockNotes();
    if (typeof dashboardYukle           === 'function') setTimeout(dashboardYukle, 200);
}

function clearCurrentUser() {
    stockxerUser = null;
    sessionStorage.removeItem("stockxerSessionUser");
    localStorage.removeItem("stockxerUser");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("user");
    localStorage.removeItem("stockxerCurrentUser");
    updateSidebarUserBox();
    if (typeof updatePortfolioAuthState === 'function') updatePortfolioAuthState();

    // Formları temizle (element null kontrolü ile)
    ['regFullName','regEmail','regPassword','loginEmail','loginPassword'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

window.updateSidebarUserBox = function() {
    const titleEl = document.getElementById("userAccountTitle");
    const subEl   = document.getElementById("userAccountSubtitle");
    const avatarEl = document.querySelector('.user-avatar'); // Added for profile image

    if (titleEl && subEl) {
        if (stockxerUser) {
            titleEl.innerText = stockxerUser.fullName;
            subEl.innerText   = "Hesabım";
            if (avatarEl) {
                if (stockxerUser.profileImageUrl) {
                    avatarEl.innerHTML = `<img src="${stockxerUser.profileImageUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="User">`;
                } else {
                    avatarEl.innerHTML = "👤";
                }
            }
        } else {
            titleEl.innerText = "Hesap";
            subEl.innerText   = "Giriş yap veya kayıt ol";
            if (avatarEl) avatarEl.innerHTML = "👤";
        }
    }
};
