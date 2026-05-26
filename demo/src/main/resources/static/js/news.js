/**
 * news.js — Haber Akışı sekmesi.
 *
 * İçerik:
 *  - haberTabMenuOlustur() — Portföydeki hisseler için filtre butonları oluşturur
 *  - haberleriYukle()      — /api/haberler endpoint'inden haber çeker ve listeler
 *  - haberleriBaslat()     — Haber sekmesi açıldığında menü + ilk yüklemeyi tetikler
 */

// ── Haber Sekme Menüsü ────────────────────────────────────────────────────────

/**
 * Portföydeki her hisse için bir filtre butonu ve "Tümü" butonu oluşturur.
 * Portföy boşsa bilgi mesajı gösterir.
 */
function haberTabMenuOlustur() {
    const menu = document.getElementById('haberTabMenu');
    if (!menu) return;

    menu.innerHTML = '';

    if (portfoy.length === 0) {
        menu.innerHTML = '<span style="color:#94a3b8; font-size:13px;">Portföyde hisse yok.</span>';
        return;
    }

    // "Tümü" butonu
    const tumBtn       = document.createElement('button');
    tumBtn.className   = 'haber-tab-btn aktif';
    tumBtn.textContent = 'Tümü';
    tumBtn.dataset.hisse = 'TUMU';

    tumBtn.onclick = () => {
        document.querySelectorAll('.haber-tab-btn').forEach(b => b.classList.remove('aktif'));
        tumBtn.classList.add('aktif');
        haberleriYukle(portfoy.map(p => p.hisse).join(','));
    };

    menu.appendChild(tumBtn);

    // Her hisse için ayrı buton
    portfoy.forEach(item => {
        const btn       = document.createElement('button');
        btn.className   = 'haber-tab-btn';
        btn.textContent = item.hisse;
        btn.dataset.hisse = item.hisse;

        btn.onclick = () => {
            document.querySelectorAll('.haber-tab-btn').forEach(b => b.classList.remove('aktif'));
            btn.classList.add('aktif');
            haberleriYukle(item.hisse);
        };

        menu.appendChild(btn);
    });
}

// ── Haber Yükleme ─────────────────────────────────────────────────────────────

/**
 * Belirtilen hisse(ler) için /api/haberler endpoint'inden haber çeker
 * ve #haberlerListesi'ne render eder.
 *
 * @param {string} hisseler - Virgülle ayrılmış hisse kodları (örn. 'ASELS,GARAN')
 */
async function haberleriYukle(hisseler) {
    const list = document.getElementById('haberlerListesi');
    if (!list) return;

    list.innerHTML = '<li class="haber-yukleniyor">Haberler yükleniyor...</li>';

    try {
        const res = await fetch(`/api/haberler?hisseler=${encodeURIComponent(hisseler)}`);
        if (!res.ok) throw new Error(`Sunucu hatası: HTTP ${res.status}`);

        const d = await res.json();
        if (d.durum !== 'basarili') throw new Error(d.mesaj || 'API başarısız yanıt döndürdü.');

        if (!d.haberler || d.haberler.length === 0) {
            list.innerHTML = '<li class="haber-yukleniyor">Bu hisse için haber bulunamadı.</li>';
            return;
        }

        list.innerHTML = '';

        d.haberler.forEach(h => {
            const li     = document.createElement('li');
            li.className = 'haber-item';

            const badge  = h.hisse  ? `<span class="haber-badge">${escapeHtml(h.hisse)}</span>`   : '';
            const kaynak = h.kaynak ? `<span class="haber-kaynak">${escapeHtml(h.kaynak)}</span>`  : '';
            const tarih  = h.tarih  ? `<span class="haber-tarih">${escapeHtml(h.tarih)}</span>`    : '';

            li.innerHTML = `
                <div>
                    ${badge}${kaynak}${tarih}<br>
                    <span class="haber-baslik">${escapeHtml(h.baslik || 'Başlık yok')}</span>
                </div>
                <a class="haber-oku-btn" href="${h.link || '#'}" target="_blank" rel="noopener noreferrer">Oku →</a>
            `;

            list.appendChild(li);
        });

    } catch (err) {
        console.log('[Haberler Hatası]', err);
        list.innerHTML = `<li class="haber-hata">⚠️ Haberler yüklenemedi: ${escapeHtml(err.message)}</li>`;
    }
}

// ── Haber Başlatma ────────────────────────────────────────────────────────────

/**
 * Haber sekmesi açıldığında çağrılır.
 * Sekme menüsünü oluşturur ve portföyde hisse varsa tüm haberleri yükler.
 */
function haberleriBaslat() {
    haberTabMenuOlustur();

    if (portfoy.length > 0) {
        haberleriYukle(portfoy.map(p => p.hisse).join(','));
    } else {
        const list = document.getElementById('haberlerListesi');
        if (list) {
            list.innerHTML = '<li class="haber-yukleniyor">Haber görmek için portföye hisse ekle.</li>';
        }
    }
}
