/**
 * charts.js — Chart.js entegrasyonu ile yenilenmiş modern grafikler.
 *
 * İçerik:
 *  - Global Chart.js Ayarları
 *  - fiyatGrafikCiz()
 *  - degisimGrafikCiz()
 *  - hacimGrafikCiz()
 *  - aralikGrafikCiz()
 *  - Yardımcı Fonksiyonlar
 */

// Aktif Chart objelerini tutmak için (canvasId -> chartInstance)
window.stockxerCharts = {};

// ── Chart.js Global Ayarları ──────────────────────────────────────────────
if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'Inter, -apple-system, sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.06)';
    Chart.defaults.scale.grid.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
    Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
    Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.displayColors = true;
}

// Eski grafiği temizlemek için yardımcı
function destroyChart(canvasId) {
    if (window.stockxerCharts[canvasId]) {
        window.stockxerCharts[canvasId].destroy();
        delete window.stockxerCharts[canvasId];
    }
}

function showEmptyState(canvasId) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Veri bulunamadı.', canvas.width / 2, canvas.height / 2);
}

// ── Fiyat Grafiği ─────────────────────────────────────────────────────────────
function fiyatGrafikCiz(canvasId, veri) {
    if (!veri || veri.length === 0) return showEmptyState(canvasId);
    destroyChart(canvasId);
    
    const values = veri.map(v => Number(v.kapanis)).filter(v => !isNaN(v));
    const labels = veri.map(v => v.tarih || '');
    if (values.length === 0) return showEmptyState(canvasId);

    const ma = hareketliOrtalamaSerisi(values, 7);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    window.stockxerCharts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Kapanış Fiyatı',
                    data: values,
                    borderColor: '#38bdf8', // Modern Mavi
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.1
                },
                {
                    label: '7G Ortalama',
                    data: ma,
                    borderColor: '#fbbf24', // Sarı-Turuncu
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: false,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { boxWidth: 12, usePointStyle: true }
                }
            },
            scales: {
                x: {
                    display: false // Tarih kalabalık yapmasın, tooltip'te görür
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) { return '₺' + value.toFixed(2); }
                    }
                }
            }
        }
    });
}

// ── Değişim Grafiği ───────────────────────────────────────────────────────────
function degisimGrafikCiz(canvasId, veri) {
    if (!veri || veri.length < 2) return showEmptyState(canvasId);
    destroyChart(canvasId);
    
    const closes = veri.map(v => Number(v.kapanis)).filter(v => !isNaN(v));
    const labels = veri.map(v => v.tarih || '');
    
    const changes = [0];
    const bgColors = ['#94a3b8']; // İlk gün değişim sıfır kabul

    for (let i = 1; i < closes.length; i++) {
        const prev = closes[i - 1];
        const curr = closes[i];
        const change = prev === 0 ? 0 : ((curr - prev) / prev) * 100;
        changes.push(change);
        bgColors.push(change >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)');
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    window.stockxerCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Günlük Değişim (%)',
                data: changes,
                backgroundColor: bgColors,
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) { return context.parsed.y.toFixed(2) + '%'; }
                    }
                }
            },
            scales: {
                x: { display: false },
                y: {
                    ticks: {
                        callback: function(value) { return value + '%'; }
                    }
                }
            }
        }
    });
}

// ── Hacim Grafiği ─────────────────────────────────────────────────────────────
function hacimGrafikCiz(canvasId, veri) {
    if (!veri || veri.length === 0) return showEmptyState(canvasId);
    destroyChart(canvasId);
    
    const values = veri.map(v => Number(v.hacim)).filter(v => !isNaN(v));
    const labels = veri.map(v => v.tarih || '');
    if (values.length === 0) return showEmptyState(canvasId);

    const ort = values.reduce((a, b) => a + b, 0) / values.length;
    const bgColors = values.map(v => v >= ort ? 'rgba(56, 189, 248, 0.8)' : 'rgba(51, 65, 85, 0.6)');

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    window.stockxerCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hacim',
                data: values,
                backgroundColor: bgColors,
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) { return formatSayi(context.parsed.y); }
                    }
                }
            },
            scales: {
                x: { display: false },
                y: {
                    ticks: {
                        callback: function(value) {
                            if (value >= 1e9) return (value / 1e9).toFixed(1) + 'Mlyr';
                            if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
                            return value;
                        }
                    }
                }
            }
        }
    });
}

// ── Aralık Grafiği ────────────────────────────────────────────────────────────
function aralikGrafikCiz(canvasId, veri) {
    if (!veri || veri.length === 0) return showEmptyState(canvasId);
    destroyChart(canvasId);
    
    const highs = veri.map(v => Number(v.yuksek || v.kapanis));
    const lows = veri.map(v => Number(v.dusuk || v.kapanis));
    const closes = veri.map(v => Number(v.kapanis));
    const labels = veri.map(v => v.tarih || '');

    const floatingData = veri.map((v, i) => [lows[i], highs[i]]);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    window.stockxerCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Kapanış',
                    data: closes,
                    borderColor: '#38bdf8',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointBackgroundColor: '#38bdf8',
                    fill: false,
                    tension: 0
                },
                {
                    type: 'bar',
                    label: 'Günlük Aralık',
                    data: floatingData,
                    backgroundColor: 'rgba(100, 116, 139, 0.3)',
                    barThickness: 6,
                    borderRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } }
            },
            scales: {
                x: { display: false },
                y: { beginAtZero: false }
            }
        }
    });
}

// ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────

function hareketliOrtalamaSerisi(values, period) {
    return values.map((_, i) => {
        if (i < period - 1) return null;
        const slice = values.slice(i - period + 1, i + 1);
        return slice.reduce((a, b) => a + b, 0) / period;
    });
}

// Format yardımcıları
function formatTL(num) {
    if (typeof num !== 'number') return "₺0.00";
    return "₺" + num.toFixed(2);
}

function formatSayi(num) {
    if (typeof num !== 'number') return "0";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + " Mlyr";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + " Mn";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + " B";
    return num.toLocaleString('tr-TR');
}
