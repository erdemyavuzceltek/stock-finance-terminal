/**
 * app.js — Uygulama geneli yardımcı fonksiyonlar ve başlatma.
 */

// ── Global Durum ─────────────────────────────────────────────────────────────

let piyasaVerisi   = [];
let siralamaAlan   = 'hisse';
let siralamaYon    = 'asc';
let aramaTimer     = null;

// ── Güvenli Çalıştırma ────────────────────────────────────────────────────────

function safeRun(label, fn) {
    try {
        if (typeof fn === 'function') fn();
    } catch (error) {
        console.error(label + ' failed:', error);
    }
}

// ── Kenar Çubuğu ─────────────────────────────────────────────────────────────

function sidebarToggle() {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('collapsed');
}

// ── Sekme Yönetimi ────────────────────────────────────────────────────────────

window.toggleNewsSubmenu = function(open) {
    const submenu = document.querySelector('.news-submenu');
    if (!submenu) return;
    if (open) submenu.classList.add('open');
    else submenu.classList.remove('open');
};

window.sekmeGoster = function(id, el) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

    const targetTab = document.getElementById(id);
    if (targetTab) targetTab.classList.add('active');
    if (el) el.classList.add('active');

    if (id === 'haberler') {
        toggleNewsSubmenu(true);
    } else {
        toggleNewsSubmenu(false);
    }

    if (id === 'dashboard') {
        safeRun('dashboard load', () => {
            if (typeof dashboardYukle === 'function') dashboardYukle();
        });
    }

    if (id === 'portfoy') {
        safeRun('portfolio auth state', () => {
            if (typeof updatePortfolioAuthState === 'function') updatePortfolioAuthState();
        });
        const user = (typeof stockxerUser !== 'undefined') ? stockxerUser : null;
        if (user) {
            safeRun('portfolio load', () => {
                if (typeof loadUserPortfolio === 'function') loadUserPortfolio();
            });
        }
    }

    if (id === 'haberler') {
        safeRun('news load', () => {
            if (typeof haberleriBaslat === 'function') {
                haberleriBaslat();
            } else if (typeof haberKategoriGoster === 'function') {
                haberKategoriGoster('turkBorsasi');
            }
        });
    }

    if (id === 'kesfet') {
        if (typeof piyasaYukle === 'function' && (!piyasaVerisi || piyasaVerisi.length === 0)) {
            safeRun('market load', () => piyasaYukle());
        }
    }

    if (typeof restartAutoRefresh === 'function') {
        restartAutoRefresh();
    }
};

function menuAktifYap(index) {
    const items = document.querySelectorAll('.menu-item');
    items.forEach(i => i.classList.remove('active'));
    if (items[index]) items[index].classList.add('active');
}

// ── Sayı Formatlama ───────────────────────────────────────────────────────────

function formatTL(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '-';
    return Number(n).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatYuzde(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '-';
    const num  = Number(n);
    const sign = num > 0 ? '+' : '';
    return sign + num.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + '%';
}

function formatSayi(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '-';
    return Number(n).toLocaleString('tr-TR');
}

function formatKisaSayi(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '-';
    const num = Number(n);
    if (Math.abs(num) >= 1_000_000_000)
        return (num / 1_000_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' Mr';
    if (Math.abs(num) >= 1_000_000)
        return (num / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' Mn';
    if (Math.abs(num) >= 1_000)
        return (num / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' Bin';
    return num.toLocaleString('tr-TR');
}

// ── Kaçış Yardımcıları ────────────────────────────────────────────────────────

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replaceAll('&',  '&amp;')
        .replaceAll('<',  '&lt;')
        .replaceAll('>',  '&gt;')
        .replaceAll('"',  '&quot;')
        .replaceAll("'",  '&#039;');
}

function escapeJs(text) {
    if (text === null || text === undefined) return '';
    return String(text).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

// ── Eski Dışa Tıklama Silindi (StockSearch kendi yönetiyor) ─────────────────

// ── Window Scope Bağlamaları ──────────────────────────────────────────────────
// (index.html onclick için gerekli tüm fonksiyonlar)

window.sidebarToggle  = sidebarToggle;
window.menuAktifYap   = menuAktifYap;
window.formatTL       = formatTL;
window.formatYuzde    = formatYuzde;
window.formatSayi     = formatSayi;
window.formatKisaSayi = formatKisaSayi;
window.escapeHtml     = escapeHtml;
window.escapeJs       = escapeJs;
window.safeRun        = safeRun;

// ── Uygulama Başlangıcı ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    safeRun('sidebar user update', () => {
        if (typeof updateSidebarUserBox === 'function') updateSidebarUserBox();
    });

    safeRun('portfolio auth state', () => {
        if (typeof updatePortfolioAuthState === 'function') updatePortfolioAuthState();
    });

    safeRun('dashboard load', () => {
        if (typeof dashboardYukle === 'function') dashboardYukle();
    });

    safeRun('market load', () => {
        if (typeof piyasaYukle === 'function') piyasaYukle();
    });

    safeRun('news load', () => {
        if (typeof haberleriBaslat === 'function') {
            haberleriBaslat();
        } else if (typeof haberKategoriGoster === 'function') {
            haberKategoriGoster('turkBorsasi');
        }
    });

    // Portföy ilk aktif subtabı göster
    safeRun('portfolio first subtab', () => {
        const firstSubtab = document.getElementById('portfoyAktif');
        if (firstSubtab) firstSubtab.style.display = 'block';
    });

    // İlk menü öğesini aktif yap (zaten HTML'de active var, yedek)
    const activeMenu = document.querySelector('.menu-item.active');
    if (!activeMenu) menuAktifYap(0);

    // StockSearch Kurulumu
    if (typeof StockSearch !== 'undefined') {
        StockSearch.setup({ inputId: 'kesfetArama', dropdownId: 'kesfetAramaDropdown', onSelect: (symbol) => teknikAnalizAc(symbol) });
        StockSearch.setup({ inputId: 'hisseInput', dropdownId: 'portfoyHisseDropdown' });
        StockSearch.setup({ inputId: 'watchlistInput', dropdownId: 'watchlistHisseDropdown', onSelect: () => watchlisteEkleManuel() });
        StockSearch.setup({ inputId: 'alarmSymbol', dropdownId: 'alarmHisseDropdown' });
        StockSearch.setup({ inputId: 'newsSearchInput', dropdownId: 'newsHisseDropdown', onSelect: () => haberAra() });
    }
});
