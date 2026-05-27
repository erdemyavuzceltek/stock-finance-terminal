/**
 * auto-refresh.js
 * Borsa açıkken veya kapalıyken belirli aralıklarla aktif sekmeyi günceller.
 */

const REFRESH_INTERVALS_MARKET_OPEN = {
    dashboard: 60000,
    kesfet: 60000,
    portfoy: 60000,
    teknikAnaliz: 120000,
    haberler: 300000
};
  
const REFRESH_INTERVALS_MARKET_CLOSED = {
    dashboard: 300000,
    kesfet: 300000,
    portfoy: 300000,
    teknikAnaliz: 300000,
    haberler: 600000
};

let autoRefreshTimer = null;
let isRefreshing = false;

// LocalStorage'dan auto-refresh durumunu yükle
let stoxerAutoRefreshEnabled = true;
const storedState = localStorage.getItem('stoxerAutoRefreshEnabled');
if (storedState !== null) {
    stoxerAutoRefreshEnabled = storedState === 'true';
}

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('autoRefreshToggle');
    if (toggle) {
        toggle.checked = stoxerAutoRefreshEnabled;
    }
    updateMarketStatusUI();
    if (stoxerAutoRefreshEnabled) {
        startAutoRefresh();
    }
});

function isMarketOpenNow() {
    const now = new Date();
    const turkeyTimeStr = now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
    const turkeyTime = new Date(turkeyTimeStr);
    
    const day = turkeyTime.getDay(); // 0 Pazar, 6 Cumartesi
    const hour = turkeyTime.getHours();
    const minute = turkeyTime.getMinutes();
    const minutes = hour * 60 + minute;

    const isWeekday = day >= 1 && day <= 5;
    const open = 10 * 60; // 10:00
    const close = 18 * 60 + 10; // 18:10

    return isWeekday && minutes >= open && minutes <= close;
}

function updateMarketStatusUI() {
    const dot = document.getElementById('marketStatusDot');
    const text = document.getElementById('marketStatusText');
    
    if (dot && text) {
        if (isMarketOpenNow()) {
            dot.className = 'refresh-dot open';
            text.textContent = 'Piyasa Açık';
        } else {
            dot.className = 'refresh-dot closed';
            text.textContent = 'Piyasa Kapalı';
        }
    }
}

function updateLastRefreshLabel() {
    const label = document.getElementById('lastRefreshText');
    if (label) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second:'2-digit' });
        label.textContent = `Son güncelleme: ${timeString}`;
    }
}

window.setAutoRefreshEnabled = function(enabled) {
    stoxerAutoRefreshEnabled = enabled;
    localStorage.setItem('stoxerAutoRefreshEnabled', enabled);
    if (enabled) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
};

window.getActiveTabId = function() {
    const activeTab = document.querySelector(".tab-content.active");
    return activeTab ? activeTab.id : null;
};

window.getRefreshIntervalForTab = function(tabId) {
    const isOpen = isMarketOpenNow();
    const intervals = isOpen ? REFRESH_INTERVALS_MARKET_OPEN : REFRESH_INTERVALS_MARKET_CLOSED;
    
    // Alt sekmelerin id'lerini ana sekme mantığıyla maple
    if (tabId === 'dashboard') return intervals.dashboard;
    if (tabId === 'kesfet') return intervals.kesfet;
    if (tabId === 'portfoy') return intervals.portfoy;
    if (tabId === 'haberler') return intervals.haberler;
    if (tabId === 'teknik-analiz') return intervals.teknikAnaliz;
    
    return 300000; // Default fallback 5 mins
};

window.startAutoRefresh = function() {
    stopAutoRefresh(); // Varolanı temizle
    updateMarketStatusUI();
    
    if (!stoxerAutoRefreshEnabled) return;

    const tabId = getActiveTabId();
    if (!tabId || tabId === 'ai') return; // AI için auto refresh iptal

    const intervalMs = getRefreshIntervalForTab(tabId);
    
    autoRefreshTimer = setInterval(() => {
        refreshActiveTab();
    }, intervalMs);
};

window.stopAutoRefresh = function() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
};

window.restartAutoRefresh = function() {
    startAutoRefresh();
};

window.refreshActiveTab = async function() {
    if (isRefreshing) return;
    
    const tabId = getActiveTabId();
    if (!tabId || tabId === 'ai') return; // AI asla otomatik yenilenmez

    isRefreshing = true;
    updateMarketStatusUI();

    try {
        if (tabId === 'dashboard') {
            if (typeof dashboardYukle === 'function') await dashboardYukle();
        } 
        else if (tabId === 'kesfet') {
            if (typeof piyasaYukle === 'function') await piyasaYukle();
        } 
        else if (tabId === 'portfoy') {
            const user = (typeof stockxerUser !== 'undefined') ? stockxerUser : null;
            if (user) {
                // Aktif portföy alt sekmesini bul
                const activePortTab = document.querySelector('.portfolio-tab-btn.active');
                if (activePortTab) {
                    const view = activePortTab.getAttribute('onclick');
                    if (view && view.includes('portfoy-genel')) {
                        if (typeof loadUserPortfolio === 'function') await loadUserPortfolio();
                    } else if (view && view.includes('portfoy-watchlist')) {
                        if (typeof loadUserWatchlist === 'function') await loadUserWatchlist();
                    } else if (view && view.includes('portfoy-alarmlar')) {
                        if (typeof loadAlarms === 'function') await loadAlarms();
                    } else if (view && view.includes('portfoy-gecmis')) {
                        if (typeof loadPortfolioTransactions === 'function') await loadPortfolioTransactions();
                    }
                } else {
                    if (typeof loadUserPortfolio === 'function') await loadUserPortfolio();
                }
            }
        } 
        else if (tabId === 'haberler') {
            if (typeof window.aktifHaberKategori !== 'undefined' && typeof haberleriYukle === 'function') {
                await haberleriYukle(window.aktifHaberKategori);
            } else if (typeof haberleriYukle === 'function') {
                await haberleriYukle();
            }
        } 
        else if (tabId === 'teknik-analiz') {
            if (typeof window.aktifTeknikHisse !== 'undefined' && window.aktifTeknikHisse && typeof teknikAnalizAc === 'function') {
                await teknikAnalizAc(window.aktifTeknikHisse, { silentRefresh: true });
            }
        }
        
        updateLastRefreshLabel();
    } catch (error) {
        console.warn(`[AutoRefresh] ${tabId} yenilenirken hata oluştu:`, error);
        // Hata durumunda tabloyu boşaltmıyoruz, eski veri görünmeye devam ediyor.
        const label = document.getElementById('lastRefreshText');
        if (label) {
            label.textContent = "Yenileme başarısız";
        }
    } finally {
        isRefreshing = false;
    }
};
