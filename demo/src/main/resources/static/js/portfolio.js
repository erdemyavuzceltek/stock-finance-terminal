/**
 * portfolio.js — Portföy Yönetimi, P&L, Watchlist ve İşlem Geçmişi
 */

let portfoy = [];
let watchlist = [];
let aktifTrade = null;

// ── Alt Sekme Yönetimi ────────────────────────────────────────────────────────
window.portfoySekmeGoster = function(subtabId, btn) {
    // Tüm portföy subtabları kapat
    document.querySelectorAll('.portfolio-subtab').forEach(t => {
        t.style.display = 'none';
        t.classList.remove('active');
    });
    // Buton active güncelle
    document.querySelectorAll('.portfolio-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Hedef subtabı aç
    const target = document.getElementById(subtabId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    // Sekmeye özgü veri yükleme
    if (subtabId === 'portfoyWatchlist') {
        if (typeof watchlistCiz === 'function') watchlistCiz();
    }
    if (subtabId === 'portfoyGecmis') {
        if (typeof loadTransactionHistory === 'function') loadTransactionHistory();
    }
    if (subtabId === 'portfoyAlarmlar') {
        if (typeof loadAlarms === 'function') loadAlarms();
    }
};

// ── Auth Gate Yönetimi ────────────────────────────────────────────────────────
window.updatePortfolioAuthState = function() {
    const authGate = document.getElementById('portfolioAuthGate');
    const content  = document.getElementById('portfolioContentUnlocked');
    if (!authGate || !content) return;

    if (typeof stockxerUser !== 'undefined' && stockxerUser) {
        authGate.style.display = 'none';
        content.style.display  = 'block';
    } else {
        authGate.style.display = 'flex';
        content.style.display  = 'none';
        portfoy = [];
        watchlist = [];
    }
};

window.migratePortfolioData = async function() {
    if (!stockxerUser) return;
    const email = stockxerUser.email;
    const migKey = 'stockxerPortfolioMigrated_' + email;
    if (localStorage.getItem(migKey)) return;

    const eskiPortfoy = JSON.parse(localStorage.getItem('borsa_portfoy')) || [];
    const eskiWatchlist = JSON.parse(localStorage.getItem('borsa_watchlist')) || [];

    if (eskiPortfoy.length > 0) {
        try {
            await fetch(`/api/portfolio/${stockxerUser.id}/migrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eskiPortfoy)
            });
        } catch (e) { console.error(e); }
    }

    if (eskiWatchlist.length > 0) {
        try {
            const symbols = eskiWatchlist.map(w => w.hisse);
            await fetch(`/api/portfolio/${stockxerUser.id}/watchlist/migrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(symbols)
            });
        } catch (e) { console.error(e); }
    }

    localStorage.setItem(migKey, 'true');
};

window.loadUserPortfolio = async function() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : stockxerUser;
    
    if (!user || !user.id) {
        if (typeof clearCurrentUser === 'function') clearCurrentUser();
        if (typeof updatePortfolioAuthState === 'function') updatePortfolioAuthState();
        return;
    }

    try {
        let res = await fetch(`/api/portfolio/${user.id}/summary`);
        if (res.status === 404 || res.status === 401) {
            if (typeof clearCurrentUser === 'function') clearCurrentUser();
            if (typeof updatePortfolioAuthState === 'function') updatePortfolioAuthState();
            alert("Oturum geçersiz, lütfen tekrar giriş yap.");
            return;
        }

        let data = await res.json();
        if (data.success) {
            portfoy = data.holdings || [];
            tabloyCiz(data);
        } else {
            if (typeof clearCurrentUser === 'function') clearCurrentUser();
            if (typeof updatePortfolioAuthState === 'function') updatePortfolioAuthState();
            return;
        }

        let wRes = await fetch(`/api/portfolio/${user.id}/watchlist`);
        let wData = await wRes.json();
        if (wData.success) {
            watchlist = wData.watchlist || [];
            if (document.getElementById('portfoyWatchlist').classList.contains('active')) {
                watchlistCiz();
            }
        }
        
        // Faz 2: Sektör Dağılımı tetikle
        if (typeof loadSectorDistribution === 'function') {
            loadSectorDistribution();
        }
    } catch (e) {
        console.error("Portföy yüklenirken hata:", e);
    }
};

// ── Portföy Tablosu ve Kartları ───────────────────────────────────────────────
function tabloyCiz(data) {
    let tbody = document.getElementById('portfoyTablosu');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Kartları Güncelle
    document.getElementById('summaryTotalValue').innerText = `₺${formatTL(data.currentValue)}`;
    document.getElementById('summaryTotalCost').innerText = `₺${formatTL(data.totalCost)}`;
    
    const pnlEl = document.getElementById('summaryTotalPnL');
    pnlEl.innerText = `₺${formatTL(data.totalProfitLoss)} (${formatYuzde(data.totalProfitLossPercent)})`;
    pnlEl.className = 'metric-value ' + (data.totalProfitLoss > 0 ? 'positive' : data.totalProfitLoss < 0 ? 'negative' : 'neutral');

    const dpnlEl = document.getElementById('summaryDailyPnL');
    dpnlEl.innerText = `₺${formatTL(data.dailyProfitLoss)} (${formatYuzde(data.dailyProfitLossPercent)})`;
    dpnlEl.className = 'metric-value ' + (data.dailyProfitLoss > 0 ? 'positive' : data.dailyProfitLoss < 0 ? 'negative' : 'neutral');

    // Tabloyu Güncelle
    if (portfoy.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="status-text">Henüz portföyünde hisse yok.</td></tr>';
        return;
    }

    portfoy.forEach(h => {
        const cls = h.profitLoss > 0 ? 'positive' : h.profitLoss < 0 ? 'negative' : 'neutral';
        const priceText = h.currentPrice === '-' ? '-' : `₺${formatTL(h.currentPrice)}`;
        
        tbody.innerHTML += `
            <tr>
                <td><span class="portfoy-hisse-link" onclick="teknikAnalizAc('${h.symbol}')">${escapeHtml(h.symbol)}</span></td>
                <td>${h.quantity}</td>
                <td>₺${formatTL(h.averagePrice)}</td>
                <td>${priceText}</td>
                <td><strong>₺${formatTL(h.currentValue)}</strong></td>
                <td class="${cls}">₺${formatTL(h.profitLoss)} <br><span style="font-size:11px;">(${formatYuzde(h.profitLossPercent)})</span></td>
                <td>${formatTL(h.weightPercent)}%</td>
                <td>
                    ${typeof generateNoteBadgesHTML === 'function' ? generateNoteBadgesHTML(h.symbol) : ''}
                </td>
                <td>
                    <div class="portfolio-action-buttons">
                        <button class="btn-buy-row" onclick="islemPanelAc('${h.symbol}', 'al', ${h.currentPrice !== '-' ? h.currentPrice : 0}, ${h.quantity})">Al</button>
                        <button class="btn-sell-row" onclick="islemPanelAc('${h.symbol}', 'sat', ${h.currentPrice !== '-' ? h.currentPrice : 0}, ${h.quantity})">Sat</button>
                        <button class="btn-note" onclick="openStockNoteModal('${h.symbol}')">Not</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// ── İşlem Paneli ──────────────────────────────────────────────────────────────
window.islemPanelAc = function(hisse, tip, fiyat, mevcutAdet) {
    if (!stockxerUser) {
        alert("İşlem yapmak için giriş yapmalısınız.");
        return;
    }
    aktifTrade = { hisse, tip, fiyat: Number(fiyat||0), mevcutAdet: Number(mevcutAdet||0) };

    document.getElementById('tradePanelTitle').innerText = `${hisse} ${tip === 'al' ? 'Alım Emri' : 'Satış Emri'}`;
    document.getElementById('tradeHisse').value = hisse;
    document.getElementById('tradeTip').value = tip === 'al' ? 'Al' : 'Sat';
    document.getElementById('tradeAdet').value = '';
    document.getElementById('tradeFiyat').value = fiyat > 0 ? `₺${Number(fiyat).toFixed(2)}` : 'Fiyat yok';
    document.getElementById('tradeMevcutAdet').innerText = mevcutAdet;
    document.getElementById('tradeTahminiTutar').innerText = '₺0.00';

    const btn = document.getElementById('tradeConfirmBtn');
    btn.className = `trade-confirm-btn ${tip === 'al' ? 'buy' : 'sell'}`;
    btn.innerText = tip === 'al' ? 'Alım Emrini Onayla' : 'Satış Emrini Onayla';

    document.getElementById('tradePanelBackdrop').classList.add('active');
    document.getElementById('tradeBottomPanel').classList.add('active');
    
    // Panel içindeki son işlemler backend'den çekilebilir
    loadTransactionHistory(hisse, 'tradeHistoryList', 5);
};

window.islemPanelKapat = function() {
    document.getElementById('tradePanelBackdrop').classList.remove('active');
    document.getElementById('tradeBottomPanel').classList.remove('active');
    aktifTrade = null;
};

window.tradeTutarGuncelle = function() {
    if (!aktifTrade) return;
    const adet = parseInt(document.getElementById('tradeAdet').value) || 0;
    const fiyat = aktifTrade.fiyat || 0;
    document.getElementById('tradeTahminiTutar').innerText = fiyat > 0 ? `₺${(adet * fiyat).toFixed(2)}` : '-';
};

window.tradeIslemOnayla = async function() {
    if (!aktifTrade || !stockxerUser) return;
    const adet = parseInt(document.getElementById('tradeAdet').value);
    if (!adet || adet <= 0) { alert('Geçerli bir adet gir.'); return; }

    const hisse = aktifTrade.hisse;
    const tip = aktifTrade.tip;
    const fiyat = aktifTrade.fiyat || 0;

    let res;
    if (tip === 'al') {
        res = await fetch(`/api/portfolio/${stockxerUser.id}/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: hisse, quantity: adet, price: fiyat })
        });
    } else {
        const mevcut = portfoy.find(i => i.symbol === hisse);
        if (!mevcut || mevcut.quantity < adet) { alert('Yetersiz bakiye.'); return; }
        res = await fetch(`/api/portfolio/${stockxerUser.id}/sell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: hisse, quantity: adet })
        });
    }

    const data = await res.json();
    if (data.success) {
        await loadUserPortfolio();
        islemPanelKapat();
        if (typeof dashboardYukle === 'function') dashboardYukle();
    } else {
        alert(data.message);
    }
};

window.portfoyeAl = async function() {
    if (!stockxerUser) { alert("Giriş yapmalısınız."); return; }
    const hisseInput = document.getElementById('hisseInput');
    const adetInput = document.getElementById('adetInput');
    const hisse = hisseInput.value.trim().toUpperCase();
    const adet = parseInt(adetInput.value);

    if (!hisse || !adet || adet <= 0) return alert('Geçerli hisse ve adet girin.');

    let fRes = await fetch(`/api/fiyat?hisse=${hisse}`);
    let fData = await fRes.json();
    let p = 0;
    if (fData.durum === 'basarili') p = Number(fData.guncelFiyat);

    let res = await fetch(`/api/portfolio/${stockxerUser.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: hisse, quantity: adet, price: p })
    });
    
    let d = await res.json();
    if (d.success) {
        hisseInput.value = ''; adetInput.value = '';
        await loadUserPortfolio();
        if (typeof dashboardYukle === 'function') dashboardYukle();
    }
};

// ── İşlem Geçmişi ─────────────────────────────────────────────────────────────
window.loadTransactionHistory = async function(symbol = null, targetId = 'islemGecmisiTablosu', limit = 100) {
    if (!stockxerUser) return;
    const tbody = document.getElementById(targetId);
    if (!tbody) return;

    let url = `/api/portfolio/${stockxerUser.id}/transactions`;
    if (symbol) url += `?symbol=${symbol}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success) {
            const txs = data.transactions || [];
            if (txs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="status-text">Henüz işlem geçmişin yok.</td></tr>`;
                return;
            }
            tbody.innerHTML = '';
            
            txs.slice(0, limit).forEach(tx => {
                const isBuy = tx.type === 'BUY';
                const typeClass = isBuy ? 'positive' : 'negative';
                const typeText = isBuy ? 'ALIM' : 'SATIM';
                
                // Tarih formatlama
                const dateObj = new Date(tx.createdAt);
                const dateStr = dateObj.toLocaleDateString('tr-TR') + ' ' + dateObj.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});

                if(targetId === 'tradeHistoryList') {
                    // Liste Görünümü
                    tbody.innerHTML += `
                        <li class="trade-history-item">
                            <span class="trade-history-type ${isBuy?'buy':'sell'}">${typeText}</span>
                            <span class="trade-history-code">${escapeHtml(tx.symbol)}</span>
                            <span class="trade-history-detail">${tx.quantity} adet · ₺${formatTL(tx.price)}<br>${dateStr}</span>
                        </li>
                    `;
                } else {
                    // Tablo Görünümü
                    tbody.innerHTML += `
                        <tr>
                            <td>${dateStr}</td>
                            <td><strong>${escapeHtml(tx.symbol)}</strong></td>
                            <td class="${typeClass}">${typeText}</td>
                            <td>${tx.quantity}</td>
                            <td>₺${formatTL(tx.price)}</td>
                            <td>₺${formatTL(tx.totalAmount)}</td>
                        </tr>
                    `;
                }
            });
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="status-text">Geçmiş yüklenemedi.</td></tr>`;
    }
};

// ── Alt Sekme Yönetimi ────────────────────────────────────────────────────────
window.portfoySekmeGoster = function(id, btn) {
    document.querySelectorAll('.portfolio-subtab').forEach(c => { c.style.display = 'none'; c.classList.remove('active'); });
    document.querySelectorAll('.portfolio-tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(id);
    if (target) { target.style.display = 'block'; target.classList.add('active'); }
    if (btn) btn.classList.add('active');
    
    if (id === 'portfoyWatchlist') watchlistCiz();
    if (id === 'portfoyGecmis') loadTransactionHistory();
};

// ── Watchlist Yönetimi ────────────────────────────────────────────────────────
window.watchlistCiz = async function() {
    const tbody = document.getElementById('watchlistTablosu');
    if (!tbody) return;
    
    if (!watchlist || watchlist.length === 0) { 
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="status-text">
                    <div class="empty-state">
                        <div class="empty-state-icon">⭐</div>
                        <div class="empty-state-title">Watchlist'in boş</div>
                        <div class="empty-state-desc">Takip etmek istediğin hisseleri eklediğinde fiyatlarını ve haberlerini burada görebilirsin.</div>
                    </div>
                </td>
            </tr>`; 
        return; 
    }
    
    tbody.innerHTML = '<tr><td colspan="5" class="status-text">Watchlist yükleniyor...</td></tr>';
    
    let html = '';
    for (let w of watchlist) {
        let companyName = w.symbol;
        if (typeof StockSearch !== 'undefined' && StockSearch.getCompanyBySymbol) {
            companyName = StockSearch.getCompanyBySymbol(w.symbol);
        }

        try {
            let res = await fetch(`/api/fiyat?hisse=${encodeURIComponent(w.symbol)}`);
            let d = await res.json();
            
            if (d.durum === 'basarili') {
                const cls = d.degisimYuzde > 0 ? 'positive' : d.degisimYuzde < 0 ? 'negative' : 'neutral';
                html += `<tr>
                    <td><span class="portfoy-hisse-link" style="font-weight: bold; cursor: pointer;" onclick="teknikAnalizAc('${escapeJs(w.symbol)}')">${escapeHtml(w.symbol)}</span></td>
                    <td style="color: var(--text-secondary);">${escapeHtml(companyName)}</td>
                    <td style="font-weight: 500;">₺${Number(d.guncelFiyat).toFixed(2)}</td>
                    <td class="${cls}" style="font-weight: 500;">${formatYuzde(d.degisimYuzde)}</td>
                    <td>${typeof generateNoteBadgesHTML === 'function' ? generateNoteBadgesHTML(w.symbol) : ''}</td>
                    <td>
                        <div class="portfolio-action-buttons">
                            <button class="btn-buy-row" onclick="islemPanelAc('${escapeJs(w.symbol)}', 'al', ${Number(d.guncelFiyat)}, 0)">Al</button>
                            <button class="btn-sell-row" onclick="watchlisttenKaldir('${escapeJs(w.symbol)}')">Sil</button>
                            <button class="btn-note" onclick="openStockNoteModal('${escapeJs(w.symbol)}')">Not</button>
                        </div>
                    </td>
                </tr>`;
            } else {
                html += `<tr>
                    <td><span class="portfoy-hisse-link" style="font-weight: bold; cursor: pointer;" onclick="teknikAnalizAc('${escapeJs(w.symbol)}')">${escapeHtml(w.symbol)}</span></td>
                    <td style="color: var(--text-secondary);">${escapeHtml(companyName)}</td>
                    <td style="font-weight: 500;">-</td>
                    <td class="neutral">-</td>
                    <td>${typeof generateNoteBadgesHTML === 'function' ? generateNoteBadgesHTML(w.symbol) : ''}</td>
                    <td>
                        <div class="portfolio-action-buttons">
                            <button class="btn-buy-row" onclick="islemPanelAc('${escapeJs(w.symbol)}', 'al', 0, 0)">Al</button>
                            <button class="btn-sell-row" onclick="watchlisttenKaldir('${escapeJs(w.symbol)}')">Sil</button>
                            <button class="btn-note" onclick="openStockNoteModal('${escapeJs(w.symbol)}')">Not</button>
                        </div>
                    </td>
                </tr>`;
            }
        } catch (e) {
            html += `<tr>
                <td><span class="portfoy-hisse-link" style="font-weight: bold; cursor: pointer;" onclick="teknikAnalizAc('${escapeJs(w.symbol)}')">${escapeHtml(w.symbol)}</span></td>
                <td style="color: var(--text-secondary);">${escapeHtml(companyName)}</td>
                <td style="font-weight: 500;">-</td>
                <td class="neutral">-</td>
                <td>${typeof generateNoteBadgesHTML === 'function' ? generateNoteBadgesHTML(w.symbol) : ''}</td>
                <td>
                    <div class="portfolio-action-buttons">
                        <button class="btn-sell-row" onclick="watchlisttenKaldir('${escapeJs(w.symbol)}')">Sil</button>
                        <button class="btn-note" onclick="openStockNoteModal('${escapeJs(w.symbol)}')">Not</button>
                    </div>
                </td>
            </tr>`;
        }
    }
    tbody.innerHTML = html;
};

window.watchlisteEkleManuel = async function() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : stockxerUser;
    if (!user || !user.id) { alert("Giriş yapmalısınız."); return; }
    const q = document.getElementById('watchlistInput').value.trim().toUpperCase();
    if (q.length < 2) return;
    await fetch(`/api/portfolio/${user.id}/watchlist/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: q })
    });
    document.getElementById('watchlistInput').value = '';
    await loadUserPortfolio();
};

window.watchlisttenKaldir = async function(symbol) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : stockxerUser;
    if (!user || !user.id) return;
    await fetch(`/api/portfolio/${user.id}/watchlist/remove/${symbol}`, { method: 'DELETE' });
    await loadUserPortfolio();
};
