/**
 * alarms.js — Fiyat Alarmı İşlemleri
 * Alarmlar, Portföyüm sekmesinin 'portfoyAlarmlar' alt sekmesinde gösterilir.
 */

let activeAlarms = [];

/**
 * Alarm listesini backend'den çeker ve gösterir.
 * Portföyüm sekmesi zaten auth korumalı, burada ayrı gate gerekmez.
 */
window.loadAlarms = window.loadUserAlerts = async function() {
    if (typeof stockxerUser === 'undefined' || !stockxerUser) return;

    const grid = document.getElementById('alarmsGrid');
    if (grid) grid.innerHTML = '<div class="status-text">Yükleniyor...</div>';

    try {
        const res = await fetch(`/api/alerts/${stockxerUser.id}`);
        const data = await res.json();

        if (data.success) {
            activeAlarms = data.alerts || [];
            renderAlarmsGrid();
        } else {
            if (grid) grid.innerHTML = '<div class="status-text">Alarmlar yüklenemedi.</div>';
        }
    } catch (e) {
        console.error("Alarmlar yüklenemedi:", e);
        if (grid) grid.innerHTML = '<div class="status-text">Bağlantı hatası.</div>';
    }
};

window.createAlert = window.createPriceAlert = async function() {
    if (typeof stockxerUser === 'undefined' || !stockxerUser) return;

    const symbolEl    = document.getElementById('alarmSymbol');
    const condEl      = document.getElementById('alarmCondition');
    const priceEl     = document.getElementById('alarmPrice');

    const symbol      = symbolEl ? symbolEl.value.trim().toUpperCase() : '';
    const conditionType = condEl ? condEl.value : 'ABOVE';
    const targetPrice = priceEl ? parseFloat(priceEl.value) : NaN;

    if (!symbol) { alert("Hisse kodu giriniz."); return; }
    if (!targetPrice || targetPrice <= 0) { alert("Geçerli bir hedef fiyat giriniz."); return; }

    try {
        const res = await fetch(`/api/alerts/${stockxerUser.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, conditionType, targetPrice })
        });
        const data = await res.json();
        if (data.success) {
            if (symbolEl) symbolEl.value = '';
            if (priceEl)  priceEl.value  = '';
            loadAlarms();
        } else {
            alert(data.message || "Alarm oluşturulamadı.");
        }
    } catch (e) {
        console.error("Alarm oluşturulamadı:", e);
        alert("Bağlantı hatası oluştu.");
    }
};

window.toggleAlert = window.togglePriceAlert = async function(alertId) {
    if (typeof stockxerUser === 'undefined' || !stockxerUser) return;
    try {
        await fetch(`/api/alerts/${stockxerUser.id}/${alertId}/toggle`, { method: 'PATCH' });
        loadAlarms();
    } catch (e) {
        console.error("Alarm güncellenemedi:", e);
    }
};

window.deleteAlert = window.deletePriceAlert = async function(alertId) {
    if (typeof stockxerUser === 'undefined' || !stockxerUser) return;
    try {
        await fetch(`/api/alerts/${stockxerUser.id}/${alertId}`, { method: 'DELETE' });
        loadAlarms();
    } catch (e) {
        console.error("Alarm silinemedi:", e);
    }
};

function renderAlarmsGrid() {
    const grid = document.getElementById('alarmsGrid');
    if (!grid) return;

    if (activeAlarms.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">🔔</div>
                <div class="empty-state-title">Alarm Yok</div>
                <div class="empty-state-desc">Henüz fiyat alarmı oluşturmadın. İlgilendiğin hisseler için fiyat hedefleri belirleyebilirsin.</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';
    activeAlarms.forEach(a => {
        const condText   = a.conditionType === 'ABOVE' ? 'Üstüne Çıkarsa' : 'Altına Düşerse';
        const activeClass = a.triggered ? 'negative' : (a.active ? 'positive' : 'neutral');
        const statusText  = a.triggered ? 'Tetiklendi' : (a.active ? 'Aktif' : 'Pasif');

        grid.innerHTML += `
            <div class="metric-card" style="position: relative; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="metric-label" style="font-size:16px; font-weight:bold; color:var(--text-color);">${escapeHtml(a.symbol)}</div>
                    <div class="metric-value ${activeClass}" style="font-size:12px;">${statusText}</div>
                </div>
                <div style="font-size:14px; color:var(--sub-text);">
                    ${condText} <strong>₺${typeof formatTL === 'function' ? formatTL(a.targetPrice) : a.targetPrice}</strong>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button class="btn-buy-row" style="background:var(--card-bg); color:var(--text-color); border:1px solid var(--border-color);" onclick="toggleAlert(${a.id})">
                        ${a.active && !a.triggered ? 'Kapat' : 'Aç'}
                    </button>
                    <button class="btn-sell-row" onclick="deleteAlert(${a.id})">Sil</button>
                </div>
            </div>
        `;
    });
}

/** Dashboard'dan Portföyüm > Alarmlar alt sekmesine git */
window.portfoyAlarmlarAc = function() {
    const portfoyMenuItem = document.querySelector("[data-tab='portfoy']");
    if (typeof sekmeGoster === 'function') {
        sekmeGoster('portfoy', portfoyMenuItem);
    }
    setTimeout(() => {
        const alarmBtn = document.querySelector("[data-portfolio-tab='portfoyAlarmlar']");
        if (typeof portfoySekmeGoster === 'function') {
            portfoySekmeGoster('portfoyAlarmlar', alarmBtn);
        }
    }, 100);
};
