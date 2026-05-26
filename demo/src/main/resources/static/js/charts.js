/**
 * charts.js — Canvas tabanlı grafik çizim fonksiyonları.
 *
 * Tüm grafikler saf Canvas 2D API kullanır; harici kütüphane yoktur.
 *
 * İçerik:
 *  - fiyatGrafikCiz()        — Kapanış fiyatı ve 7G hareketli ortalama çizgi grafiği
 *  - degisimGrafikCiz()      — Günlük değişim yüzdesi bar grafiği
 *  - hacimGrafikCiz()        — Hacim bar grafiği (ortalama çizgisiyle)
 *  - aralikGrafikCiz()       — Gün içi yüksek-düşük aralık grafiği
 *  - gridCiz()               — Yatay ızgara çizgisi yardımcısı
 *  - lejandCiz()             — Grafik lejandı yardımcısı
 *  - hareketliOrtalamaSerisi() — Belirli periyot için MA serisi üretir
 */

// ── Fiyat Grafiği ─────────────────────────────────────────────────────────────

/**
 * Kapanış fiyatı çizgi grafiği ve 7 günlük hareketli ortalama üzerine çizer.
 *
 * @param {string} canvasId - Canvas element id'si
 * @param {Array}  veri     - Grafik veri noktaları [{tarih, kapanis, ...}]
 */
function fiyatGrafikCiz(canvasId, veri) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || veri.length === 0) return;

    const ctx     = canvas.getContext('2d');
    const w       = canvas.width;
    const h       = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padding = 42;
    const values  = veri.map(v => Number(v.kapanis)).filter(v => !isNaN(v));
    if (values.length === 0) return;

    const ma          = hareketliOrtalamaSerisi(values, 7);
    const tumDegerler = values.concat(ma.filter(v => v !== null));
    const min         = Math.min(...tumDegerler);
    const max         = Math.max(...tumDegerler);
    const range       = max - min || 1;

    gridCiz(ctx, w, h, padding);

    // Kapanış fiyatı çizgisi (cyan-blue)
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth   = 3;
    ctx.beginPath();

    values.forEach((val, i) => {
        const x = padding + ((w - padding * 2) / Math.max(values.length - 1, 1)) * i;
        const y = h - padding - ((val - min) / range) * (h - padding * 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 7G hareketli ortalama çizgisi (amber)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth   = 2;
    ctx.beginPath();

    let started = false;
    ma.forEach((val, i) => {
        if (val === null) return;
        const x = padding + ((w - padding * 2) / Math.max(ma.length - 1, 1)) * i;
        const y = h - padding - ((val - min) / range) * (h - padding * 2);
        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Eksen etiketleri
    ctx.fillStyle = '#475569';
    ctx.font      = '11px Inter, Arial';
    ctx.fillText(formatTL(max), 6, padding + 4);
    ctx.fillText(formatTL(min), 6, h - padding + 4);

    lejandCiz(ctx, [
        { text: 'Kapanış',      color: '#60a5fa' },
        { text: '7G Ortalama',  color: '#fbbf24' }
    ], w - 220, 20);
}

// ── Değişim Grafiği ───────────────────────────────────────────────────────────

/**
 * Günlük yüzdesel değişimleri bar grafiği olarak çizer.
 * Pozitif değişimler yeşil, negatifler kırmızı renkle gösterilir.
 *
 * @param {string} canvasId - Canvas element id'si
 * @param {Array}  veri     - Grafik veri noktaları [{kapanis, ...}]
 */
function degisimGrafikCiz(canvasId, veri) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || veri.length < 2) return;

    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padding = 42;
    const closes  = veri.map(v => Number(v.kapanis)).filter(v => !isNaN(v));
    const changes = [];

    for (let i = 1; i < closes.length; i++) {
        const prev = closes[i - 1];
        const curr = closes[i];
        changes.push(prev === 0 ? 0 : ((curr - prev) / prev) * 100);
    }

    if (changes.length === 0) return;

    const maxAbs = Math.max(...changes.map(v => Math.abs(v)), 1);
    const zeroY  = h / 2;
    const barW   = (w - padding * 2) / changes.length;

    gridCiz(ctx, w, h, padding);

    // Sıfır çizgisi
    ctx.strokeStyle = '#334155';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(padding, zeroY);
    ctx.lineTo(w - padding, zeroY);
    ctx.stroke();

    changes.forEach((val, i) => {
        const x    = padding + i * barW;
        const barH = Math.abs(val / maxAbs) * ((h - padding * 2) / 2);
        const y    = val >= 0 ? zeroY - barH : zeroY;
        ctx.fillStyle = val >= 0 ? '#10b981' : '#f43f5e';
        ctx.fillRect(x, y, Math.max(barW - 2, 2), barH);
    });

    ctx.fillStyle = '#475569';
    ctx.font      = '11px Inter, Arial';
    ctx.fillText('+' + maxAbs.toFixed(2) + '%', 6, padding + 4);
    ctx.fillText('-' + maxAbs.toFixed(2) + '%', 6, h - padding + 4);
}

// ── Hacim Grafiği ─────────────────────────────────────────────────────────────

/**
 * Günlük işlem hacmini bar grafiği olarak çizer.
 * Ortalama hacim kesik çizgi ile gösterilir.
 * Ortalama üzerindeki barlar koyu, altındakiler açık gri renklidir.
 *
 * @param {string} canvasId - Canvas element id'si
 * @param {Array}  veri     - Grafik veri noktaları [{hacim, ...}]
 */
function hacimGrafikCiz(canvasId, veri) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || veri.length === 0) return;

    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padding = 42;
    const values  = veri.map(v => Number(v.hacim)).filter(v => !isNaN(v));
    if (values.length === 0) return;

    const max  = Math.max(...values, 1);
    const ort  = values.reduce((a, b) => a + b, 0) / values.length;
    const barW = (w - padding * 2) / values.length;

    gridCiz(ctx, w, h, padding);

    values.forEach((val, i) => {
        const x    = padding + i * barW;
        const barH = (val / max) * (h - padding * 2);
        const y    = h - padding - barH;
        ctx.fillStyle = val >= ort ? '#3b82f6' : '#1e3a5f';
        ctx.fillRect(x, y, Math.max(barW - 2, 2), barH);
    });

    // Ortalama kesik çizgisi
    const ortY = h - padding - (ort / max) * (h - padding * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, ortY);
    ctx.lineTo(w - padding, ortY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#475569';
    ctx.font      = '11px Inter, Arial';
    ctx.fillText(formatSayi(max),                   6,        padding + 4);
    ctx.fillText('Ort: ' + formatSayi(ort), w - 120, ortY - 6);
}

// ── Aralık Grafiği ────────────────────────────────────────────────────────────

/**
 * Her gün için yüksek-düşük aralığını dikey çizgi olarak gösterir.
 * Kapanış fiyatı mavi nokta ile işaretlenir.
 *
 * @param {string} canvasId - Canvas element id'si
 * @param {Array}  veri     - Grafik veri noktaları [{yuksek, dusuk, kapanis, ...}]
 */
function aralikGrafikCiz(canvasId, veri) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || veri.length === 0) return;

    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padding = 42;
    const highs   = veri.map(v => Number(v.yuksek || v.kapanis)).filter(v => !isNaN(v));
    const lows    = veri.map(v => Number(v.dusuk  || v.kapanis)).filter(v => !isNaN(v));

    if (highs.length === 0 || lows.length === 0) return;

    const min   = Math.min(...lows);
    const max   = Math.max(...highs);
    const range = max - min || 1;

    gridCiz(ctx, w, h, padding);

    veri.forEach((v, i) => {
        const high  = Number(v.yuksek  || v.kapanis);
        const low   = Number(v.dusuk   || v.kapanis);
        const close = Number(v.kapanis);

        const x      = padding + ((w - padding * 2) / Math.max(veri.length - 1, 1)) * i;
        const yHigh  = h - padding - ((high  - min) / range) * (h - padding * 2);
        const yLow   = h - padding - ((low   - min) / range) * (h - padding * 2);
        const yClose = h - padding - ((close - min) / range) * (h - padding * 2);

        // Yüksek-düşük aralık çizgisi
        ctx.strokeStyle = '#334155';
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Kapanış noktası
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(x, yClose, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#475569';
    ctx.font      = '11px Inter, Arial';
    ctx.fillText(formatTL(max), 6, padding + 4);
    ctx.fillText(formatTL(min), 6, h - padding + 4);
}

// ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────

/**
 * Canvas üzerine 5 yatay ızgara çizgisi çizer.
 *
 * @param {CanvasRenderingContext2D} ctx     - Canvas 2D context
 * @param {number}                  w       - Canvas genişliği
 * @param {number}                  h       - Canvas yüksekliği
 * @param {number}                  padding - Kenar boşluğu
 */
function gridCiz(ctx, w, h, padding) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth   = 1;

    for (let i = 0; i <= 4; i++) {
        const y = padding + ((h - padding * 2) / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(w - padding, y);
        ctx.stroke();
    }
}

/**
 * Grafik lejandı (açıklama kutusu) çizer.
 *
 * @param {CanvasRenderingContext2D} ctx   - Canvas 2D context
 * @param {Array}  items - [{text: string, color: string}]
 * @param {number} x     - Başlangıç x koordinatı
 * @param {number} y     - Başlangıç y koordinatı
 */
function lejandCiz(ctx, items, x, y) {
    ctx.font = '12px Arial';
    items.forEach((item, i) => {
        const yy = y + i * 18;
        ctx.fillStyle = item.color;
        ctx.fillRect(x, yy - 9, 12, 3);
        ctx.fillStyle = '#475569';
        ctx.fillText(item.text, x + 18, yy - 5);
    });
}

/**
 * Verilen veri serisi için basit hareketli ortalama hesaplar.
 * Yeterli veri olmayan başlangıç konumları için null döner.
 *
 * @param {number[]} values - Veri serisi
 * @param {number}   period - Periyot
 * @returns {(number|null)[]} MA serisi
 */
function hareketliOrtalamaSerisi(values, period) {
    return values.map((_, i) => {
        if (i < period - 1) return null;
        const slice = values.slice(i - period + 1, i + 1);
        return slice.reduce((a, b) => a + b, 0) / period;
    });
}
