/**
 * dashboard.js — Dashboard Ekranı İşlemleri
 */

window.dashboardYukle = async function() {
    const container = document.getElementById('dashboardContainer');
    if (!container) return;

    container.innerHTML = '<div class="status-text">Dashboard Yükleniyor...</div>';

    try {
        const isUserLoggedIn = typeof stockxerUser !== 'undefined' && stockxerUser;
        const endpoint = isUserLoggedIn ? `/api/dashboard/${stockxerUser.id}` : `/api/dashboard/public`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.success) {
            if (data.data.guest) {
                renderGuestDashboard(data.data);
            } else {
                renderUserDashboard(data.data);
            }
        } else {
            container.innerHTML = `<div class="status-text">Dashboard yüklenemedi: ${data.message}</div>`;
        }
        
        // Faz 2: Günlük Performans Raporu tetikle
        if (typeof loadDailyPerformanceReport === 'function') {
            loadDailyPerformanceReport();
        }
    } catch (e) {
        container.innerHTML = `<div class="status-text">Bağlantı hatası: ${e.message}</div>`;
    }
};

function renderGuestDashboard(data) {
    const container = document.getElementById('dashboardContainer');
    const market = data.marketSummary || {};
    const endeks = market.endeks || {};
    
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Hoş Geldin!</h2>
                <p class="sub-text">Borsa İstanbul piyasa verilerini ve son gelişmeleri takip et.</p>
            </div>
            <div>
                <button class="portfolio-auth-primary" onclick="authModalAc(); authTabGoster('login')">Giriş Yap</button>
                <button class="portfolio-auth-secondary" onclick="authModalAc(); authTabGoster('register')">Kayıt Ol</button>
            </div>
        </div>

        <div class="cards-grid" style="margin-bottom: 24px;">
            <div class="metric-card">
                <div class="metric-label">BIST 100</div>
                <div class="metric-value">${formatSayi(endeks.sonFiyat)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Değişim</div>
                <div class="metric-value ${endeks.degisimYuzde > 0 ? 'positive' : 'negative'}">${formatYuzde(endeks.degisimYuzde)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Özellik</div>
                <div class="metric-value neutral" style="font-size:16px;">STOXER AI ile Yorum</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Özellik</div>
                <div class="metric-value neutral" style="font-size:16px;">Gelişmiş Portföy</div>
            </div>
        </div>

        <h3>Piyasa Haberleri</h3>
        <ul class="data-list">
            ${(data.latestNews || []).slice(0, 5).map(h => `
                <li class="haber-item">
                    <div>
                        <span class="haber-kaynak">${escapeHtml(h.kaynak)}</span> <span class="haber-tarih">${escapeHtml(h.tarih)}</span><br>
                        <span class="haber-baslik">${escapeHtml(h.baslik)}</span>
                    </div>
                    <a class="haber-oku-btn" href="${h.link || '#'}" target="_blank">Oku</a>
                </li>
            `).join('') || '<li class="status-text">Haber bulunamadı.</li>'}
        </ul>
    `;
}

function renderUserDashboard(data) {
    const container = document.getElementById('dashboardContainer');
    const port = data.portfolioSummary || {};
    const market = data.marketSummary || {};
    const endeks = market.endeks || {};
    const alerts = data.alerts || [];
    
    const pnlClass = port.totalProfitLoss > 0 ? 'positive' : port.totalProfitLoss < 0 ? 'negative' : 'neutral';
    const dailyPnlClass = port.dailyProfitLoss > 0 ? 'positive' : port.dailyProfitLoss < 0 ? 'negative' : 'neutral';

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Merhaba, ${typeof stockxerUser !== 'undefined' ? escapeHtml(stockxerUser.fullName) : ''}</h2>
                <p class="sub-text">İşte portföyünün ve piyasanın bugünkü genel özeti.</p>
            </div>
        </div>

        <div class="cards-grid" style="margin-bottom: 24px;">
            <div class="metric-card">
                <div class="metric-label">Toplam Değer</div>
                <div class="metric-value">₺${formatTL(port.currentValue)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Toplam K/Z</div>
                <div class="metric-value ${pnlClass}">₺${formatTL(port.totalProfitLoss)} (${formatYuzde(port.totalProfitLossPercent)})</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Günlük K/Z</div>
                <div class="metric-value ${dailyPnlClass}">₺${formatTL(port.dailyProfitLoss)} (${formatYuzde(port.dailyProfitLossPercent)})</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">BIST 100 (${formatYuzde(endeks.degisimYuzde)})</div>
                <div class="metric-value">${formatSayi(endeks.sonFiyat)}</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div>
                <h3>Aktif Alarmlar (${alerts.length})</h3>
                <ul class="data-list" style="margin-top: 12px;">
                    ${alerts.slice(0, 3).map(a => `
                        <li class="performans-gun">
                            <div class="performans-gun-baslik">${escapeHtml(a.symbol)}</div>
                            <div class="performans-gun-ozet">
                                <span>${a.conditionType === 'ABOVE' ? 'Üstüne:' : 'Altına:'} ₺${formatTL(a.targetPrice)}</span>
                            </div>
                        </li>
                    `).join('')}
                    ${alerts.length === 0 ? '<li class="status-text">Aktif alarmın yok.</li>' : ''}
                    ${alerts.length > 3 ? '<li class="status-text" style="text-align:center; cursor:pointer;" onclick="portfoyAlarmlarAc ? portfoyAlarmlarAc() : sekmeGoster(\'portfoy\')">Tümünü gör...</li>' : ''}
                </ul>
            </div>
            <div>
                <h3>Takip Ettiğin Haberler</h3>
                <ul class="data-list" style="margin-top: 12px;">
                    ${(data.latestNews || []).slice(0, 3).map(h => `
                        <li class="haber-item">
                            <div>
                                ${h.hisse ? `<span class="haber-badge">${escapeHtml(h.hisse)}</span>` : ''}
                                <span class="haber-kaynak">${escapeHtml(h.kaynak)}</span><br>
                                <span class="haber-baslik">${escapeHtml(h.baslik)}</span>
                            </div>
                            <a class="haber-oku-btn" href="${h.link || '#'}" target="_blank">Oku</a>
                        </li>
                    `).join('') || '<li class="status-text">Portföy ve izleme listesi için güncel haber yok.</li>'}
                </ul>
            </div>
        </div>

        <!-- Faz 3: AI Portföy Yönlendirme -->
        <div style="margin-top: 24px; padding: 16px; background: linear-gradient(145deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: var(--radius-lg); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
                <h3 style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">✨ Portföyünü AI ile yorumlat</h3>
                <p class="sub-text" style="font-size: 13px;">Stoxer AI ile portföyünün güçlü ve zayıf yönlerini analiz et.</p>
            </div>
            <button class="portfolio-ai-btn-primary" onclick="menuSec('portfoy')">Portföyüm'e Git</button>
        </div>
    `;
}
