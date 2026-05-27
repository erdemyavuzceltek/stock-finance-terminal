/**
 * user-notes.js
 * Kullanıcı hisse notları, hedef fiyat ve stop-loss yönetimi
 */

let activeNoteSymbol = null;
let currentNotesMap = {}; // { 'ASELS': { note: '...', targetPrice: 120, stopLossPrice: 85 } }

window.loadUserStockNotes = async function() {
    if (typeof stockxerUser === 'undefined' || !stockxerUser || !stockxerUser.id) {
        currentNotesMap = {};
        return;
    }

    try {
        const response = await fetch(`/api/user-notes/${stockxerUser.id}`);
        const data = await response.json();
        
        currentNotesMap = {};
        if (data.success && data.items) {
            data.items.forEach(item => {
                currentNotesMap[item.symbol] = item;
            });
        }
    } catch (e) {
        console.error("Notlar yüklenirken hata oluştu:", e);
    }
};

window.openStockNoteModal = function(symbol) {
    if (typeof stockxerUser === 'undefined' || !stockxerUser || !stockxerUser.id) {
        if (typeof authModalAc === 'function') {
            authModalAc('login');
        } else {
            alert("Bu özelliği kullanmak için giriş yapmalısın.");
        }
        return;
    }

    activeNoteSymbol = symbol;
    document.getElementById('stockNoteSymbolTitle').textContent = `${symbol} Notları ve Hedefler`;
    
    const noteData = currentNotesMap[symbol] || {};
    document.getElementById('stockNoteTextarea').value = noteData.note || '';
    document.getElementById('stockTargetPriceInput').value = noteData.targetPrice || '';
    document.getElementById('stockStopLossInput').value = noteData.stopLossPrice || '';
    
    document.getElementById('stockNoteError').style.display = 'none';
    document.getElementById('stockNoteBackdrop').style.display = 'block';
    document.getElementById('stockNoteModal').style.display = 'block';
};

window.closeStockNoteModal = function() {
    document.getElementById('stockNoteBackdrop').style.display = 'none';
    document.getElementById('stockNoteModal').style.display = 'none';
    activeNoteSymbol = null;
};

window.saveUserStockNote = async function() {
    if (!activeNoteSymbol || typeof stockxerUser === 'undefined' || !stockxerUser.id) return;
    
    const note = document.getElementById('stockNoteTextarea').value.trim();
    const targetPriceStr = document.getElementById('stockTargetPriceInput').value.trim();
    const stopLossPriceStr = document.getElementById('stockStopLossInput').value.trim();
    
    const errorEl = document.getElementById('stockNoteError');
    errorEl.style.display = 'none';
    
    let targetPrice = null;
    if (targetPriceStr !== '') {
        targetPrice = parseFloat(targetPriceStr);
        if (isNaN(targetPrice) || targetPrice < 0) {
            errorEl.textContent = "Hedef fiyat geçerli bir pozitif sayı olmalıdır.";
            errorEl.style.display = 'block';
            return;
        }
    }
    
    let stopLossPrice = null;
    if (stopLossPriceStr !== '') {
        stopLossPrice = parseFloat(stopLossPriceStr);
        if (isNaN(stopLossPrice) || stopLossPrice < 0) {
            errorEl.textContent = "Stop-loss geçerli bir pozitif sayı olmalıdır.";
            errorEl.style.display = 'block';
            return;
        }
    }
    
    if (note.length > 1000) {
        errorEl.textContent = "Notunuz 1000 karakterden uzun olamaz.";
        errorEl.style.display = 'block';
        return;
    }

    const payload = { note, targetPrice, stopLossPrice };

    try {
        const response = await fetch(`/api/user-notes/${stockxerUser.id}/${activeNoteSymbol}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (data.success) {
            currentNotesMap[activeNoteSymbol] = data.item;
            closeStockNoteModal();
            refreshPortfolioAndWatchlistUI();
        } else {
            errorEl.textContent = data.message || "Kaydedilirken hata oluştu.";
            errorEl.style.display = 'block';
        }
    } catch (e) {
        errorEl.textContent = "Bağlantı hatası.";
        errorEl.style.display = 'block';
        console.error(e);
    }
};

window.deleteUserStockNote = async function() {
    if (!activeNoteSymbol || typeof stockxerUser === 'undefined' || !stockxerUser.id) return;
    
    if (!confirm(`${activeNoteSymbol} notunu ve hedeflerini silmek istediğinize emin misiniz?`)) return;

    try {
        const response = await fetch(`/api/user-notes/${stockxerUser.id}/${activeNoteSymbol}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            delete currentNotesMap[activeNoteSymbol];
            closeStockNoteModal();
            refreshPortfolioAndWatchlistUI();
        } else {
            const errorEl = document.getElementById('stockNoteError');
            errorEl.textContent = data.message || "Silinirken hata oluştu.";
            errorEl.style.display = 'block';
        }
    } catch (e) {
        console.error(e);
    }
};

function refreshPortfolioAndWatchlistUI() {
    // Portföy ve Watchlist yeniden çizilebilir veya dom manipülasyonu yapılabilir.
    // Kolaylık olması için tabloları tekrar yükleyelim.
    if (document.getElementById('portfoy').classList.contains('active')) {
        const activePortTab = document.querySelector('.portfolio-tab-btn.active');
        if (activePortTab) {
            const view = activePortTab.getAttribute('onclick');
            if (view && view.includes('portfoy-genel')) {
                if (typeof loadUserPortfolio === 'function') loadUserPortfolio();
            } else if (view && view.includes('portfoy-watchlist')) {
                if (typeof loadUserWatchlist === 'function') loadUserWatchlist();
            }
        }
    }
}

// Portfolio/Watchlist yüklendikten sonra chipleri oluşturmak için yardımcı fonksiyon
window.generateNoteBadgesHTML = function(symbol) {
    if (typeof stockxerUser === 'undefined' || !stockxerUser || !stockxerUser.id) return '';
    
    const data = currentNotesMap[symbol];
    if (!data) return '';
    
    let html = '<div class="note-badges-container">';
    if (data.targetPrice) {
        html += `<span class="note-chip target-chip" title="Hedef Fiyat">🎯 ₺${data.targetPrice}</span>`;
    }
    if (data.stopLossPrice) {
        html += `<span class="note-chip stop-chip" title="Stop-Loss">🛡️ ₺${data.stopLossPrice}</span>`;
    }
    if (data.note && data.note.trim() !== '') {
        html += `<span class="note-chip text-chip" title="${data.note.replace(/"/g, '&quot;')}">📝 Not</span>`;
    }
    html += '</div>';
    
    return html;
};
