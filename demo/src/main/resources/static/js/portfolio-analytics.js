/**
 * portfolio-analytics.js
 * Sektör dağılımı ve günlük portföy performans özet raporunu yönetir.
 */

let sectorDistributionChart = null;

window.loadSectorDistribution = async function() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : stockxerUser;
    if (!user || !user.id) {
        renderSectorDistributionEmpty(false);
        return;
    }

    try {
        const response = await fetch(`/api/portfolio/${user.id}/sector-distribution`);
        const data = await response.json();

        if (data.success) {
            if (data.emptyReason === 'NO_PORTFOLIO' || data.sectors.length === 0) {
                renderSectorDistributionEmpty(true);
            } else {
                renderSectorDistribution(data);
            }
        } else {
            console.error("Sektör dağılımı hatası:", data.message);
            renderSectorDistributionEmpty(false, "Sektör dağılımı yüklenemedi.");
        }
    } catch (error) {
        console.error("Sektör dağılımı fetch hatası:", error);
        renderSectorDistributionEmpty(false, "Bağlantı hatası.");
    }
};

window.renderSectorDistribution = function(data) {
    const listEl = document.getElementById('sectorDistributionList');
    if (!listEl) return;

    let html = '';
    data.sectors.forEach(sec => {
        const symbolsStr = sec.symbols.join(", ");
        html += `
            <div class="sector-row">
                <div class="sector-row-header">
                    <span style="font-weight:600; color:var(--text-primary);">${sec.sector}</span>
                    <span style="font-weight:600;">%${sec.weightPercent.toFixed(1)}</span>
                </div>
                <div class="sector-progress">
                    <div class="sector-progress-fill" style="width: ${sec.weightPercent}%"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                    <span class="sector-symbols" title="${symbolsStr}">${sec.holdingCount} Hisse: ${symbolsStr.length > 20 ? symbolsStr.substring(0,20)+'...' : symbolsStr}</span>
                    <span style="font-weight:500; font-size:12px; color:var(--text-primary);">₺${sec.value.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;

    // Chart.js render
    renderSectorChart(data);
};

window.renderSectorDistributionEmpty = function(isLoggedIn, msg = "Portföyünde henüz hisse yok.") {
    const listEl = document.getElementById('sectorDistributionList');
    if (listEl) {
        listEl.innerHTML = `<div class="status-text">${msg}</div>`;
    }
    
    // Clear chart if exists
    if (sectorDistributionChart) {
        sectorDistributionChart.destroy();
        sectorDistributionChart = null;
    }
};

function renderSectorChart(data) {
    const canvas = document.getElementById('sectorDistributionChart');
    if (!canvas) return;

    if (sectorDistributionChart) {
        sectorDistributionChart.destroy();
    }

    if (typeof Chart === 'undefined') return;

    const labels = data.sectors.map(s => s.sector);
    const values = data.sectors.map(s => s.weightPercent);
    // Renk paleti
    const bgColors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(20, 184, 166, 0.8)',
        'rgba(249, 115, 22, 0.8)'
    ];

    sectorDistributionChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#9ca3af',
                        font: { size: 11, family: 'Inter' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: %${context.parsed.toFixed(1)}`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// ----------------------------------------------------
// Dashboard Daily Performance Report
// ----------------------------------------------------

window.loadDailyPerformanceReport = async function() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : stockxerUser;
    if (!user || !user.id) {
        renderDailyPerformanceEmpty();
        return;
    }

    try {
        const response = await fetch(`/api/dashboard/${user.id}/daily-report`);
        const data = await response.json();

        if (data.success) {
            if (data.emptyReason === 'NO_PORTFOLIO') {
                renderDailyPerformanceEmpty(true);
            } else {
                renderDailyPerformanceReport(data);
            }
        } else {
            console.error("Günlük rapor hatası:", data.message);
            renderDailyPerformanceEmpty(false, "Rapor yüklenemedi.");
        }
    } catch (error) {
        console.error("Günlük rapor fetch hatası:", error);
        renderDailyPerformanceEmpty(false, "Bağlantı hatası.");
    }
};

window.renderDailyPerformanceReport = function(data) {
    const container = document.getElementById('dailyReportContainer');
    if (!container) return;

    container.style.display = 'block'; // Giriş yapmış ve portföyü var

    document.getElementById('dailyReportSummaryText').textContent = data.summaryText || "";
    
    const kzValEl = document.getElementById('dailyReportKzVal');
    const kzColor = data.dailyProfitLoss >= 0 ? 'var(--positive)' : 'var(--negative)';
    const kzSign = data.dailyProfitLoss >= 0 ? '+' : '';
    kzValEl.textContent = `${kzSign}₺${Math.abs(data.dailyProfitLoss).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    kzValEl.style.color = kzColor;

    if (data.bestPerformer) {
        document.getElementById('dailyReportBest').innerHTML = `${data.bestPerformer.symbol} <span style="color:var(--positive)">+%${data.bestPerformer.changePercent.toFixed(2)}</span>`;
    } else {
        document.getElementById('dailyReportBest').textContent = '-';
    }

    if (data.worstPerformer) {
        document.getElementById('dailyReportWorst').innerHTML = `${data.worstPerformer.symbol} <span style="color:var(--negative)">%${data.worstPerformer.changePercent.toFixed(2)}</span>`;
    } else {
        document.getElementById('dailyReportWorst').textContent = '-';
    }

    document.getElementById('dailyReportAlertCount').textContent = data.activeAlertCount || "0";
};

window.renderDailyPerformanceEmpty = function(isLoggedIn = false, msg = "Portföyünde henüz hisse yok. Hisse eklediğinde günlük performans raporunu burada görebilirsin.") {
    const container = document.getElementById('dailyReportContainer');
    if (!container) return;

    if (!isLoggedIn) {
        container.style.display = 'none'; // Giriş yoksa gösterme
        return;
    }

    container.style.display = 'block';
    document.getElementById('dailyReportSummaryText').textContent = msg;
    
    document.getElementById('dailyReportKzVal').textContent = '-';
    document.getElementById('dailyReportKzVal').style.color = 'var(--text-secondary)';
    
    document.getElementById('dailyReportBest').textContent = '-';
    document.getElementById('dailyReportWorst').textContent = '-';
    document.getElementById('dailyReportAlertCount').textContent = '-';
};
