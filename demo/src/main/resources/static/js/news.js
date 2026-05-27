/**
 * news.js — Haber Akışı sekmesi.
 */

let aktifHaberKategori = 'turkBorsasi';
window.aktifHaberKategori = aktifHaberKategori;

function haberSayfasiAc(kategori, element) {
    if (typeof toggleNewsSubmenu === 'function') {
        toggleNewsSubmenu(true);
    }
    
    // Önce Haber Akışı ana sekmesini aç
    const haberlerMenuBtn = document.querySelector('.menu-item[data-tab="haberler"]');
    if (haberlerMenuBtn) {
        if (typeof sekmeGoster === 'function') {
            sekmeGoster('haberler', haberlerMenuBtn);
        }
    }
    
    if (kategori) {
        haberKategoriGoster(kategori);
    }
}

function haberKategoriGoster(kategori) {
    aktifHaberKategori = kategori;
    window.aktifHaberKategori = kategori;
    
    // Üst tabların active durumunu güncelle
    document.querySelectorAll('.news-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-news-tab') === kategori) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Sidebar alt menülerinin active durumunu güncelle
    document.querySelectorAll('.submenu-item').forEach(item => {
        if (item.getAttribute('data-news-cat') === kategori) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    const aramaInput = document.getElementById('newsSearchInput');
    if(aramaInput) aramaInput.value = '';

    haberleriYukle(kategori);
}

function haberAra() {
    const input = document.getElementById('newsSearchInput');
    const query = input ? input.value.trim() : '';
    haberleriYukle(aktifHaberKategori, query);
}

function haberAramaTemizle() {
    const input = document.getElementById('newsSearchInput');
    if (input) input.value = '';
    haberleriYukle(aktifHaberKategori, '');
}

async function haberleriYukle(kategori, query = '') {
    const list = document.getElementById('haberlerListesi');
    if (!list) return;

    let userId = '';

    // Giriş gerektiren kategoriler
    if (kategori === 'portfoyum' || kategori === 'watchlist') {
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : (typeof stockxerUser !== 'undefined' ? stockxerUser : null);
        userId = user ? user.id : null;
        
        if (!userId) {
            if (typeof clearCurrentUser === 'function') clearCurrentUser();
            renderHaberGirisYok();
            return;
        }
    }

    renderHaberLoading();

    try {
        let url = '';

        if (kategori === 'portfoyum') {
            url = `/api/news/portfolio/${encodeURIComponent(userId)}`;
        } else if (kategori === 'watchlist') {
            url = `/api/news/watchlist/${encodeURIComponent(userId)}`;
        } else {
            if (query) {
                url = `/api/news/search?category=${encodeURIComponent(kategori)}&q=${encodeURIComponent(query)}`;
            } else {
                url = `/api/news/category?category=${encodeURIComponent(kategori)}`;
            }
        }

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Sunucu hatası: HTTP ${res.status}`);
        }

        const d = await res.json();
        if (d.success === false) {
            throw new Error(d.message || 'Haberler alınırken bir sorun oluştu.');
        }

        if (!d.items || d.items.length === 0) {
            if (kategori === 'portfoyum') {
                if (d.emptyReason === 'NO_PORTFOLIO_HOLDINGS') {
                    renderPortfolioNewsEmpty();
                } else {
                    renderHaberEmpty("Portföyündeki hisseler için haber bulunamadı.");
                }
            } else if (kategori === 'watchlist') {
                if (d.emptyReason === 'NO_WATCHLIST_ITEMS') {
                    renderWatchlistNewsEmpty();
                } else {
                    renderHaberEmpty("Watchlist’indeki hisseler için haber bulunamadı.");
                }
            } else {
                renderHaberEmpty("Bu kategori için haber bulunamadı.");
            }
            return;
        }

        renderHaberler(d.items, kategori);

    } catch (err) {
        console.log('[Haberler Hatası]', err);
        renderHaberError(err.message);
    }
}

function renderHaberler(items, category) {
    const list = document.getElementById('haberlerListesi');
    if (!list) return;

    list.innerHTML = '';

    items.forEach(h => {
        const card = document.createElement('div');
        card.className = 'news-card';

        const symbolChip = h.symbol || h.hisse ? `<span class="news-symbol-chip">${escapeHtml(h.symbol || h.hisse)}</span>` : '';
        const catChip = h.category || category ? `<span class="news-chip">${escapeHtml(h.category || category)}</span>` : '';
        
        card.innerHTML = `
            <div class="news-card-top">
                <div class="news-card-meta">
                    ${catChip}
                    ${symbolChip}
                    <span class="news-source">${escapeHtml(h.source || h.kaynak || 'Haber')}</span>
                    <span class="news-date">• ${escapeHtml(h.publishedAt || h.tarih || '')}</span>
                </div>
                <a class="news-open-link" href="${h.url || h.link || '#'}" target="_blank" rel="noopener noreferrer">Haberi Oku ↗</a>
            </div>
            <div class="news-card-title">${escapeHtml(h.title || h.baslik || 'Başlık yok')}</div>
            ${h.summary ? `<div class="news-card-summary">${escapeHtml(h.summary)}</div>` : ''}
        `;

        list.appendChild(card);
    });
}

function renderHaberLoading() {
    const list = document.getElementById('haberlerListesi');
    if (list) list.innerHTML = `<div class="news-loading-state">Haberler yükleniyor...</div>`;
}

function renderHaberEmpty(message) {
    const list = document.getElementById('haberlerListesi');
    if (list) list.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function renderHaberError(message) {
    const list = document.getElementById('haberlerListesi');
    if (list) list.innerHTML = `<div class="news-error-state" style="color:var(--negative)">Haberler alınırken bir sorun oluştu. Lütfen tekrar deneyin.<br><small>${escapeHtml(message)}</small></div>`;
}

function renderHaberGirisYok() {
    const list = document.getElementById('haberlerListesi');
    if (!list) return;
    
    list.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔒</div>
            <div class="empty-state-title">Giriş yapman gerekiyor</div>
            <div class="empty-state-desc">Portföy ve Watchlist haberlerini görmek için hesabına giriş yap veya yeni hesap oluştur.</div>
            <div style="display:flex; gap:10px;">
                <div class="empty-state-actions"><button class="portfolio-auth-primary" onclick="if(typeof authModalAc === 'function') {authModalAc(); authTabGoster('login');}">Giriş Yap</button></div>
                <button class="portfolio-auth-secondary" onclick="if(typeof authModalAc === 'function') {authModalAc(); authTabGoster('register');}">Kayıt Ol</button></div>
            </div>
        </div>
    `;
}

function renderPortfolioNewsEmpty() {
    const list = document.getElementById('haberlerListesi');
    if (!list) return;
    
    list.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-title">Portföyünde henüz hisse yok</div>
            <div class="empty-state-desc">Hisse eklediğinde portföyündeki şirketlerle ilgili son haberleri burada görebilirsin.</div>
            <div class="empty-state-actions"><button class="portfolio-auth-primary" onclick="goToPortfolioTab('portfoyAktif')">Portföyüme Git</button></div>
        </div>
    `;
}

function renderWatchlistNewsEmpty() {
    const list = document.getElementById('haberlerListesi');
    if (!list) return;
    
    list.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⭐</div>
            <div class="empty-state-title">Watchlist’in boş</div>
            <div class="empty-state-desc">Takip etmek istediğin hisseleri Watchlist’e eklediğinde ilgili haberleri burada görebilirsin.</div>
            <div class="empty-state-actions"><button class="portfolio-auth-primary" onclick="goToPortfolioTab('portfoyWatchlist')">Watchlist’e Hisse Ekle</button></div>
        </div>
    `;
}

function goToPortfolioTab(subTabId) {
    const portfoyMenuBtn = document.querySelector('.menu-item[data-tab="portfoy"]');
    if (portfoyMenuBtn && typeof sekmeGoster === 'function') {
        sekmeGoster('portfoy', portfoyMenuBtn);
    }
    
    const subTabBtn = document.querySelector('.portfolio-tab-btn[data-portfolio-tab="'+subTabId+'"]');
    if (subTabBtn && typeof portfoySekmeGoster === 'function') {
        portfoySekmeGoster(subTabId, subTabBtn);
    }
}

function haberleriBaslat() {
    haberKategoriGoster('turkBorsasi');
}

window.haberSayfasiAc = haberSayfasiAc;
window.haberKategoriGoster = haberKategoriGoster;
window.haberAra = haberAra;
window.haberAramaTemizle = haberAramaTemizle;
window.haberleriBaslat = haberleriBaslat;
window.haberleriYukle = haberleriYukle;
