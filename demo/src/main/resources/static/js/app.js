/**
 * app.js — Uygulama geneli yardımcı fonksiyonlar ve başlatma.
 *
 * İçerik:
 *  - Global durum değişkenleri
 *  - Sidebar toggle
 *  - Sekme göster / menü aktif yap
 *  - Sayı formatlama yardımcıları (formatTL, formatYuzde, formatSayi, formatKisaSayi)
 *  - HTML / JS kaçış yardımcıları (escapeHtml, escapeJs)
 *  - window.onload — uygulama başlangıcı
 */

// ── Global Durum ─────────────────────────────────────────────────────────────

/** Kullanıcının portföyü — localStorage ile kalıcı */
let portfoy = JSON.parse(localStorage.getItem('borsa_portfoy')) || [];

/** Kullanıcının izleme listesi (Watchlist) — localStorage ile kalıcı */
let watchlist = JSON.parse(localStorage.getItem('borsa_watchlist')) || [];

/** Son yüklenen BIST 100 piyasa verisi */
let piyasaVerisi = [];

/** Keşfet tablosundaki aktif sıralama alanı */
let siralamaAlan = 'hisse';

/** Aktif sıralama yönü ('asc' veya 'desc') */
let siralamaYon = 'asc';

/** Arama gecikmesi için zamanlayıcı */
let aramaTimer = null;

/** İşlem panelinde aktif emir bilgisi */
let aktifTrade = null;

/** Emir geçmişi — localStorage ile kalıcı */
let emirGecmisi = JSON.parse(localStorage.getItem('borsa_emir_gecmisi')) || [];

// ── Kenar Çubuğu ─────────────────────────────────────────────────────────────

/**
 * Sidebar genişliğini daraltılmış / tam mod arasında değiştirir.
 */
function sidebarToggle() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

// ── Sekme Yönetimi ────────────────────────────────────────────────────────────

/**
 * Belirtilen sekme içeriğini gösterir, diğerlerini gizler.
 * Sekmeye özgü başlatma fonksiyonlarını tetikler.
 *
 * @param {string} id  - Gösterilecek tab-content elementinin id'si
 * @param {Element} el - Tıklanan menü öğesi (opsiyonel)
 */
function sekmeGoster(id, el) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

    document.getElementById(id).classList.add('active');
    if (el) el.classList.add('active');

    if (id === 'haberler') haberleriBaslat();
    if (id === 'kesfet' && piyasaVerisi.length === 0) piyasaYukle();
    if (id === 'gecmis') gecmisiCiz();
}

/**
 * Menü öğelerinden yalnızca belirtilen index'tekini aktif yapar.
 *
 * @param {number} index - Aktif yapılacak menü öğesinin sıra numarası
 */
function menuAktifYap(index) {
    const items = document.querySelectorAll('.menu-item');
    items.forEach(i => i.classList.remove('active'));
    if (items[index]) items[index].classList.add('active');
}

// ── Sayı Formatlama ───────────────────────────────────────────────────────────

/**
 * Sayıyı Türk Lirası formatında gösterir (iki ondalık).
 * Geçersiz değer için '-' döner.
 *
 * @param {*} n - Formatlanacak sayı
 * @returns {string}
 */
function formatTL(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '-';
    return Number(n).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Sayıyı yüzde formatında gösterir (+ işareti ile).
 * Geçersiz değer için '-' döner.
 *
 * @param {*} n - Formatlanacak sayı
 * @returns {string}
 */
function formatYuzde(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '-';
    const num  = Number(n);
    const sign = num > 0 ? '+' : '';
    return sign + num.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + '%';
}

/**
 * Sayıyı Türkçe yerel format ile gösterir (ondalıksız).
 * Geçersiz değer için '-' döner.
 *
 * @param {*} n - Formatlanacak sayı
 * @returns {string}
 */
function formatSayi(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '-';
    return Number(n).toLocaleString('tr-TR');
}

/**
 * Büyük sayıları kısa birim formatında gösterir (Mn, Mr, Bin).
 * Geçersiz değer için '-' döner.
 *
 * @param {*} n - Formatlanacak sayı
 * @returns {string}
 */
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

/**
 * Metni HTML için güvenli hale getirir (XSS koruması).
 *
 * @param {*} text - Kaçırılacak metin
 * @returns {string}
 */
function escapeHtml(text) {
    return String(text)
        .replaceAll('&',  '&amp;')
        .replaceAll('<',  '&lt;')
        .replaceAll('>',  '&gt;')
        .replaceAll('"',  '&quot;')
        .replaceAll("'",  '&#039;');
}

/**
 * Metni JavaScript dize sabiti içinde kullanmak için kaçırır.
 *
 * @param {*} text - Kaçırılacak metin
 * @returns {string}
 */
function escapeJs(text) {
    return String(text).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

// ── Dışa Tıklama — Arama Dropdown ────────────────────────────────────────────

document.addEventListener('click', function (e) {
    const dropdowns = ['aramaDropdown', 'portfoyAramaDropdown', 'watchlistAramaDropdown'];
    dropdowns.forEach(id => {
        const dd = document.getElementById(id);
        if (dd && !e.target.closest('.search-box')) {
            dd.style.display = 'none';
        }
    });
});

// ── Uygulama Başlangıcı ───────────────────────────────────────────────────────

/**
 * Sayfa yüklendiğinde piyasa verisi, portföy tablosu ve emir geçmişini başlatır.
 */
window.onload = async function () {
    await piyasaYukle();
    await tabloyCiz();
    await watchlistCiz();
    emirGecmisiCiz();
    
    // Varsayılan olarak Aktif Portföy sekmesini aç
    if (typeof window.portfoySekmeGoster === 'function') {
        window.portfoySekmeGoster('portfoyAktif');
    }
};
