/**
 * portfolio-ai.js
 * Faz 3: Portföyü AI ile Yorumla Mantığı
 */

window.requestPortfolioAiReview = async function(forceRefresh = false) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : stockxerUser;
    
    if (!user || !user.id) {
        if (typeof authModalAc === 'function') authModalAc();
        return;
    }

    // Check if portfolio is empty
    if (!window.portfoy || window.portfoy.length === 0) {
        alert("Portföyünde hisse bulunmuyor. AI yorumu için önce hisse eklemelisin.");
        return;
    }

    const resultContainer = document.getElementById('portfolioAiResultContent');
    const cacheBadge = document.getElementById('portfolioAiCacheBadge');
    
    if (!resultContainer) return;

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
        const cachedReview = readPortfolioAiCache(user.id);
        if (cachedReview) {
            renderPortfolioAiResult(cachedReview.review, true);
            return;
        }
    }

    // Yükleniyor durumu
    renderPortfolioAiLoading();

    try {
        const response = await fetch(`/api/ai/portfolio-review/${user.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forceRefresh })
        });

        const data = await response.json();

        if (data.success) {
            // Save to cache
            savePortfolioAiCache(user.id, data.portfolioHash, data.review);
            renderPortfolioAiResult(data.review, false);
        } else {
            // Hata ama eğer backend 429 quota yemişse veya başka hataysa
            renderPortfolioAiError(data.message || "AI yorumu alınırken bir sorun oluştu.");
        }
    } catch (error) {
        console.error("AI Portfolio Review Error:", error);
        renderPortfolioAiError("AI servisine ulaşılamadı. Lütfen tekrar dene.");
    }
};

function readPortfolioAiCache(userId) {
    try {
        const cacheStr = localStorage.getItem(`stoxerAiPortfolioReview_${userId}`);
        if (!cacheStr) return null;

        const cacheObj = JSON.parse(cacheStr);
        
        // Sadece bugünün cache'ini kabul et
        const todayStr = new Date().toISOString().split('T')[0];
        if (cacheObj.date !== todayStr) return null;

        return cacheObj;
    } catch (e) {
        return null;
    }
}

function savePortfolioAiCache(userId, portfolioHash, review) {
    try {
        const cacheObj = {
            date: new Date().toISOString().split('T')[0],
            portfolioHash: portfolioHash || "unknown",
            review: review,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(`stoxerAiPortfolioReview_${userId}`, JSON.stringify(cacheObj));
    } catch (e) {
        console.error("Cache kaydetme hatası", e);
    }
}

function renderPortfolioAiLoading() {
    const content = document.getElementById('portfolioAiResultContent');
    const badge = document.getElementById('portfolioAiCacheBadge');
    
    if (badge) badge.style.display = 'none';
    if (content) {
        content.innerHTML = `
            <div class="portfolio-ai-loading">
                <span class="spinner" style="display:inline-block; margin-right:8px;">⏳</span> 
                Portföyün AI tarafından yorumlanıyor... Bu işlem birkaç saniye sürebilir.
            </div>
        `;
    }
}

function renderPortfolioAiResult(reviewText, isCached) {
    const content = document.getElementById('portfolioAiResultContent');
    const badge = document.getElementById('portfolioAiCacheBadge');

    if (badge) {
        badge.style.display = isCached ? 'inline-block' : 'none';
    }

    if (content) {
        // Line breakleri HTML br taglerine çevir
        let formattedText = reviewText.replace(/\n/g, '<br>');
        
        // Markdown bold (**) parse
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Markdown list parse (basitçe)
        formattedText = formattedText.replace(/\* (.*?)<br>/g, '<li>$1</li>');

        content.innerHTML = `
            <div class="portfolio-ai-review-text">${formattedText}</div>
        `;
    }
}

function renderPortfolioAiError(msg) {
    const content = document.getElementById('portfolioAiResultContent');
    const badge = document.getElementById('portfolioAiCacheBadge');
    
    if (badge) badge.style.display = 'none';
    
    if (content) {
        content.innerHTML = `
            <div class="portfolio-ai-error" style="color: var(--negative); padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                ⚠️ ${msg}
            </div>
        `;
    }
}
