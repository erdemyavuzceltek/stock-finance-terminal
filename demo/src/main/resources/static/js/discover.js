/**
 * discover.js — Keşfet sekmesi ve teknik analiz ekranı.
 *
 * İçerik:
 *  - piyasaYukle()          — BIST 100 piyasa verisini API'den çeker
 *  - endeksOzetCiz()        — XU100 endeks kutucuklarını günceller
 *  - kesfetKategorileriYukle() / Ciz() — Tematik kategori kutucukları
 *  - kesfetFiltrele()       — Tabloda anlık filtreleme ve sıralama
 *  - hisseSecVeAc()         — Hisse seçip teknik analiz ekranına geçiş
 *  - sirala()               — Tablo sıralaması
 *  - kesfetTablosuCiz()     — BIST 100 tablosunu render eder
 *  - teknikAnalizAc()       — Teknik analiz ekranını API ile doldurur
 *  - teknikVeriYokCiz()     — Teknik veri yoksa bilgi ekranı
 *  - teknikAnalizCiz()      — Teknik analiz verilerini ekrana render eder
 *  - teknikHaberleriYukle() — Teknik analiz ekranındaki haber listesi
 *  - kesfeteDon()           — Teknik analiz'den keşfet'e geri dön
 */

// ── Piyasa Verisi Yükleme ─────────────────────────────────────────────────────

/**
 * /api/piyasa endpoint'inden BIST 100 verilerini çeker ve ekrana yansıtır.
 * Başarılı yanıtta keşfet tablosu ve kategori kutucukları da yüklenir.
 */
async function piyasaYukle() {
    const tbody = document.getElementById('kesfetTablosu');
    tbody.innerHTML = '<tr><td colspan="6" class="status-text">BIST 100 verileri yükleniyor...</td></tr>';

    try {
        const res = await fetch('/api/piyasa');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const d = await res.json();
        if (d.durum !== 'basarili') throw new Error(d.mesaj || 'Piyasa verisi alınamadı.');

        piyasaVerisi = d.hisseler || [];
        endeksOzetCiz(d.endeks || null);
        kesfetFiltrele();
        kesfetKategorileriYukle();

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="status-text">Piyasa verileri alınamadı: ${escapeHtml(err.message)}</td></tr>`;
    }
}

// ── Endeks Kutucukları ────────────────────────────────────────────────────────

/**
 * XU100 endeks özetini sayfa başındaki kartlara yazar.
 *
 * @param {Object|null} endeks - API'den gelen endeks objesi
 */
function endeksOzetCiz(endeks) {
    if (!endeks) {
        document.getElementById('xu100Fiyat').innerText     = '-';
        document.getElementById('xu100Degisim').innerText   = '-';
        document.getElementById('xu100DegisimTl').innerText = '-';
        document.getElementById('xu100Adet').innerText      = String(piyasaVerisi.length || 100);
        return;
    }

    const cls = endeks.degisimYuzde > 0 ? 'positive' : endeks.degisimYuzde < 0 ? 'negative' : 'neutral';

    document.getElementById('xu100Fiyat').innerText      = formatSayi(endeks.sonFiyat);
    document.getElementById('xu100Degisim').innerHTML    = `<span class="${cls}">${formatYuzde(endeks.degisimYuzde)}</span>`;
    document.getElementById('xu100DegisimTl').innerHTML  = `<span class="${cls}">${formatTL(endeks.degisimTl)}</span>`;
    document.getElementById('xu100Adet').innerText       = String(piyasaVerisi.length || 100);
}

// ── Keşfet Kategorileri ───────────────────────────────────────────────────────

/**
 * /api/kesfet-kategorileri endpoint'inden kategori verilerini çeker ve render eder.
 * Yüklenirken ve hata durumunda uygun yer tutucu içerik gösterilir.
 */
async function kesfetKategorileriYukle() {
    const alan = document.getElementById('kesfetKategorilerAlani');
    if (!alan) return;

    alan.innerHTML = `
        <div class="kategori-section">
            <div class="kategori-header">
                <div class="kategori-title-wrap">
                    <h3>Keşfet Kutucukları</h3>
                    <p class="kategori-desc">Yabancıların favorileri, popüler takip listeleri ve tematik hisse sepetleri yükleniyor.</p>
                </div>
                <span class="kategori-rozet">Canlı veriyle güncellenir</span>
            </div>
            <div class="status-text">Kategori verileri yükleniyor...</div>
        </div>
    `;

    try {
        const res = await fetch('/api/kesfet-kategorileri');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const d = await res.json();
        if (d.durum !== 'basarili') throw new Error(d.mesaj || 'Kategori verisi alınamadı.');

        kesfetKategorileriCiz(d.kategoriler || [], d.guncellemeNotu || '');

    } catch (err) {
        alan.innerHTML = `
            <div class="kategori-section">
                <div class="kategori-header">
                    <div class="kategori-title-wrap">
                        <h3>Keşfet Kutucukları</h3>
                        <p class="kategori-desc">Kategori alanı yüklenemedi.</p>
                    </div>
                    <span class="kategori-rozet">Hata</span>
                </div>
                <div class="haber-hata">⚠️ Kategoriler yüklenemedi: ${escapeHtml(err.message)}</div>
            </div>
        `;
    }
}

/**
 * API'den gelen kategori listesini kartlar halinde DOM'a ekler.
 *
 * @param {Array}  kategoriler    - Kategori objeleri listesi
 * @param {string} guncellemeNotu - Altbilgi notu
 */
function kesfetKategorileriCiz(kategoriler, guncellemeNotu) {
    const alan = document.getElementById('kesfetKategorilerAlani');
    if (!alan) return;

    if (!kategoriler || kategoriler.length === 0) {
        alan.innerHTML = '<div class="status-text">Gösterilecek kategori bulunamadı.</div>';
        return;
    }

    alan.innerHTML = '';

    kategoriler.forEach(kategori => {
        const section = document.createElement('div');
        section.className = 'kategori-section';

        const cards = (kategori.hisseler || []).map(h => {
            const degisimClass = Number(h.degisimYuzde || 0) > 0 ? 'positive'
                               : Number(h.degisimYuzde || 0) < 0 ? 'negative' : 'neutral';
            const fiyatText    = h.veriVar === false ? 'Veri sınırlı' : formatTL(h.sonFiyat) + ' TL';
            const hacimText    = h.hacimTl ? 'Hacim: ' + formatKisaSayi(h.hacimTl) : 'Hacim: -';

            return `
                <div class="kategori-card" onclick="hisseSecVeAc('${escapeJs(h.hisse)}')">
                    <div class="kategori-card-top">
                        <div class="kategori-kod">${escapeHtml(h.hisse || '-')}</div>
                        <div class="kategori-fiyat">${fiyatText}</div>
                    </div>
                    <div class="kategori-sirket">${escapeHtml(h.sirket || h.hisse || '-')}</div>
                    <div class="kategori-metrikler">
                        <span class="kategori-chip ${degisimClass}">${formatYuzde(h.degisimYuzde)}</span>
                        <span class="kategori-chip">${hacimText}</span>
                    </div>
                    <div class="kategori-not">${escapeHtml(h.not || kategori.kisaNot || 'Detay için teknik analiz ekranını aç.')}</div>
                </div>
            `;
        }).join('');

        section.innerHTML = `
            <div class="kategori-header">
                <div class="kategori-title-wrap">
                    <h3>${escapeHtml(kategori.baslik || 'Kategori')}</h3>
                    <p class="kategori-desc">${escapeHtml(kategori.aciklama || '')}</p>
                </div>
                <span class="kategori-rozet">${escapeHtml(kategori.rozet || 'Liste')}</span>
            </div>
            <div class="kategori-cards">
                ${cards}
            </div>
        `;

        alan.appendChild(section);
    });

    const note = document.createElement('div');
    note.className   = 'kategori-footer-note';
    note.textContent = guncellemeNotu || 'Bu kutucuklar takip kolaylığı içindir; yatırım tavsiyesi değildir.';
    alan.appendChild(note);
}

// Tabloyu filtrelemek için input listener
document.addEventListener('DOMContentLoaded', () => {
    const kesfetArama = document.getElementById('kesfetArama');
    if (kesfetArama) {
        kesfetArama.addEventListener('input', kesfetFiltrele);
    }
});

/**
 * Piyasa verisi üzerinde anlık filtreleme ve sıralama yaparak tabloyu günceller.
 */
function kesfetFiltrele() {
    const q = document.getElementById('kesfetArama').value.trim().toUpperCase();

    let liste = piyasaVerisi.filter(h =>
        String(h.hisse  || '').toUpperCase().includes(q) ||
        String(h.sirket || '').toUpperCase().includes(q)
    );

    liste.sort((a, b) => {
        let av = a[siralamaAlan];
        let bv = b[siralamaAlan];

        if (typeof av === 'string') av = av.toUpperCase();
        if (typeof bv === 'string') bv = bv.toUpperCase();

        if (av === null || av === undefined) av = -999_999_999;
        if (bv === null || bv === undefined) bv = -999_999_999;

        if (av < bv) return siralamaYon === 'asc' ? -1 :  1;
        if (av > bv) return siralamaYon === 'asc' ?  1 : -1;
        return 0;
    });

    kesfetTablosuCiz(liste);
}



/**
 * Verilen hisse kodunu seçip teknik analiz ekranını açar.
 * Hisse piyasa verisinde yoksa /api/hisse-ozet ile çekip ekler.
 *
 * @param {string} kod - Hisse kodu
 */
async function hisseSecVeAc(kod) {
    const inputEl = document.getElementById('kesfetArama');
    if(inputEl) inputEl.value = kod;

    if (!piyasaVerisi.some(h => h.hisse === kod)) {
        try {
            const res = await fetch(`/api/hisse-ozet?hisse=${encodeURIComponent(kod)}`);
            const d   = await res.json();
            if (d.durum === 'basarili') {
                piyasaVerisi.push(d);
                kesfetFiltrele();
            }
        } catch (err) {
            console.log('Hisse özet alınamadı:', err);
        }
    }

    teknikAnalizAc(kod);
}

// ── Tablo Sıralama & Render ───────────────────────────────────────────────────

/**
 * Tablo başlığına tıklanınca sıralama alanı / yönünü değiştirir.
 *
 * @param {string} alan - Sıralanacak veri alanı adı
 */
function sirala(alan) {
    if (siralamaAlan === alan) {
        siralamaYon = siralamaYon === 'asc' ? 'desc' : 'asc';
    } else {
        siralamaAlan = alan;
        siralamaYon  = 'asc';
    }
    kesfetFiltrele();
}

/**
 * Filtrelenmiş hisse listesini BIST 100 tablosuna yazar.
 *
 * @param {Array} liste - Render edilecek hisse objeleri
 */
function kesfetTablosuCiz(liste) {
    const tbody = document.getElementById('kesfetTablosu');
    tbody.innerHTML = '';

    if (liste.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="status-text">BIST 100 listesinde eşleşen hisse yok. Arama kutusundaki dropdown üzerinden tüm hisseleri arayabilirsin.</td></tr>';
        return;
    }

    liste.forEach(h => {
        const degisimClass = h.degisimYuzde > 0 ? 'positive' : h.degisimYuzde < 0 ? 'negative' : 'neutral';
        tbody.innerHTML += `
            <tr class="clickable-row" onclick="teknikAnalizAc('${h.hisse}')">
                <td>${escapeHtml(h.hisse)}</td>
                <td>${formatTL(h.sonFiyat)}</td>
                <td class="${degisimClass}">${formatYuzde(h.degisimYuzde)}</td>
                <td class="${degisimClass}">${formatTL(h.degisimTl)}</td>
                <td>${formatSayi(h.hacimTl)}</td>
                <td>${formatSayi(h.hacimAdet)}</td>
            </tr>
        `;
    });
}

// ── Teknik Analiz ─────────────────────────────────────────────────────────────

let aktifTeknikHisse = null;
let aktifTeknikData = null;

async function teknikAnalizAc(hisse, options = {}) {
    window.aktifTeknikHisse = hisse;

    if (!options.silentRefresh) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('teknikAnaliz').classList.add('active');
        
        // Tab menüsünü göster ve ilk sekmeyi aktif et
        document.getElementById('teknikTabMenu').style.display = 'flex';
        document.querySelectorAll('#teknikTabMenu .portfolio-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('#teknikTabMenu .portfolio-tab-btn').classList.add('active');

        if (typeof menuAktifYap === 'function') menuAktifYap(0); // Keşfet seçili kalabilir veya none
        if (typeof restartAutoRefresh === 'function') restartAutoRefresh();
    }

    document.getElementById('teknikBaslik').innerText  = `${hisse} Teknik Analiz`;
    if (typeof stockxerUser !== 'undefined' && stockxerUser && stockxerUser.id) {
        document.getElementById('btnTeknikNot').style.display = 'block';
    } else {
        document.getElementById('btnTeknikNot').style.display = 'none';
    }
    document.getElementById('teknikIcerik').innerHTML  = '<div class="status-text">Teknik veriler yükleniyor...</div>';
    
    aktifTeknikHisse = hisse;

    try {
        const res = await fetch(`/api/teknik?hisse=${encodeURIComponent(hisse)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const d = await res.json();
        if (d.durum !== 'basarili') throw new Error(d.mesaj || 'Teknik analiz alınamadı.');

        aktifTeknikData = d;

        if (d.veriVar === false) {
            teknikVeriYokCiz(d);
            teknikHaberleriYukle(hisse);
            return;
        }

        teknikAnalizCiz(d);
        teknikTabGoster('genelBakis'); // Varsayılan sekme
        teknikHaberleriYukle(hisse);

    } catch (err) {
        document.getElementById('teknikIcerik').innerHTML =
            `<div class="status-text">Teknik analiz yüklenemedi: ${escapeHtml(err.message)}</div>`;
    }
}

/**
 * Teknik veri olmadığında bilgilendirme ekranı gösterir.
 *
 * @param {Object} d - API yanıt objesi
 */
function teknikVeriYokCiz(d) {
    document.getElementById('teknikIcerik').innerHTML = `
        <div class="warning-box">
            <strong>${escapeHtml(d.hisse || '')}</strong> Borsa İstanbul listesinde görünüyor ancak bu hisse için kullanılan fiyat kaynağından teknik veri alınamadı.
            <br>
            Bu durum bazı BIST hisselerinde Yahoo Finance tarafında veri bulunmamasından kaynaklanabilir. Hisse arama ve haberler çalışmaya devam eder.
        </div>

        <div class="cards-grid">
            <div class="metric-card">
                <div class="metric-label">Hisse</div>
                <div class="metric-value">${escapeHtml(d.hisse || '-')}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Şirket</div>
                <div class="metric-value" style="font-size:15px;">${escapeHtml(d.sirket || d.hisse || '-')}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Veri Durumu</div>
                <div class="metric-value neutral">Sınırlı</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Teknik Grafik</div>
                <div class="metric-value neutral">Yok</div>
            </div>
        </div>

        <div class="teknik-haber-box">
            <h3>Bu Hisseyle İlgili Haberler</h3>
            <p class="sub-text">Fiyat verisi olmasa da haberler aranır.</p>
            <ul class="teknik-haber-list" id="teknikHaberListesi">
                <li class="haber-yukleniyor">Haberler yükleniyor...</li>
            </ul>
        </div>
    `;
}

function teknikAnalizCiz(d) {
    const degisimClass = d.degisimYuzde > 0 ? 'positive' : d.degisimYuzde < 0 ? 'negative' : 'neutral';
    
    const mevcutHisse = typeof portfoy !== 'undefined' ? portfoy.find(p => p.symbol === d.hisse || p.hisse === d.hisse) : null;
    const mevcutAdet = mevcutHisse ? (mevcutHisse.quantity || mevcutHisse.adet || 0) : 0;
    const isSatDisabled = mevcutAdet === 0 ? 'disabled title="Bu hisse portföyünde yok."' : '';

    // İçeriği gizli tab container'larına bölelim
    document.getElementById('teknikIcerik').innerHTML = `
        <div class="teknik-islem-bar">
            <button class="btn-teknik-buy" onclick="islemPanelAc('${escapeJs(d.hisse)}', 'al', ${Number(d.guncelFiyat)}, ${mevcutAdet})">Hisse Al</button>
            <button class="btn-teknik-sell" ${isSatDisabled} onclick="islemPanelAc('${escapeJs(d.hisse)}', 'sat', ${Number(d.guncelFiyat)}, ${mevcutAdet})">Hisse Sat</button>
        </div>

        <!-- 1) Genel Bakış -->
        <div id="teknikTab_genelBakis" class="teknik-subtab">
            <div class="cards-grid">
                <div class="metric-card">
                    <div class="metric-label">Güncel Fiyat</div>
                    <div class="metric-value">${formatTL(d.guncelFiyat)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Günlük Değişim</div>
                    <div class="metric-value ${degisimClass}">${formatYuzde(d.degisimYuzde)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Değişim TL</div>
                    <div class="metric-value ${degisimClass}">${formatTL(d.degisimTl)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Hacim</div>
                    <div class="metric-value">${formatSayi(d.hacim)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Günlük Yüksek</div>
                    <div class="metric-value">${formatTL(d.gunlukYuksek)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Günlük Düşük</div>
                    <div class="metric-value">${formatTL(d.gunlukDusuk)}</div>
                </div>
            </div>
            
            <div class="analysis-comment" style="margin-top:20px;">
                ${escapeHtml(d.yorum || 'Teknik veri özeti oluşturulamadı.')}
            </div>
        </div>

        <!-- 2) Grafikler -->
        <div id="teknikTab_grafikler" class="teknik-subtab" style="display:none;">
            <div class="charts-grid">
                <div class="chart-box">
                    <h3>Son 30 Gün Fiyat Grafiği</h3>
                    <div class="chart-desc">Mavi çizgi kapanış fiyatını, turuncu çizgi 7 günlük ortalamayı gösterir.</div>
                    <canvas id="fiyatGrafik" width="1000" height="280"></canvas>
                </div>
                <div class="chart-box">
                    <h3>Son 30 Gün Günlük Değişim (%)</h3>
                    <div class="chart-desc">Her bar bir önceki kapanışa göre günlük yüzdesel değişimi gösterir.</div>
                    <canvas id="degisimGrafik" width="1000" height="280"></canvas>
                </div>
            </div>
        </div>

        <!-- 3) Göstergeler -->
        <div id="teknikTab_gostergeler" class="teknik-subtab" style="display:none;">
            <div class="cards-grid" style="margin-bottom: 24px;">
                <div class="metric-card">
                    <div class="metric-label">RSI 14</div>
                    <div class="metric-value">${formatSayi(d.rsi)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">7 Günlük Ortalama</div>
                    <div class="metric-value">${formatTL(d.hareketliOrtalama7)}</div>
                </div>
            </div>
            <div class="charts-grid">
                <div class="chart-box">
                    <h3>Son 30 Gün Hacim Grafiği</h3>
                    <canvas id="hacimGrafik" width="1000" height="280"></canvas>
                </div>
                <div class="chart-box">
                    <h3>Gün İçi Yüksek - Düşük Aralığı</h3>
                    <canvas id="aralikGrafik" width="1000" height="280"></canvas>
                </div>
            </div>
        </div>

        <!-- 4) Haberler -->
        <div id="teknikTab_haberler" class="teknik-subtab" style="display:none;">
            <div class="teknik-haber-box">
                <h3>Bu Hisseyle İlgili Haberler</h3>
                <ul class="teknik-haber-list" id="teknikHaberListesi">
                    <li class="haber-yukleniyor">Haberler yükleniyor...</li>
                </ul>
            </div>
        </div>

        <!-- 5) AI Yorumu -->
        <div id="teknikTab_aiYorumu" class="teknik-subtab" style="display:none;">
            <div class="analysis-comment" style="text-align: center; margin-bottom: 20px;">
                <h3>STOCKER AI Analizi</h3>
                <p class="sub-text">Yapay zeka asistanı, fiyat hareketlerini, RSI durumunu ve genel teknik görünümü yorumlasın.</p>
                <button class="portfolio-auth-primary" style="margin-top:10px;" onclick="aiYorumIste()">AI Yorumu İste ✨</button>
            </div>
            <div id="aiYorumSonucContainer" style="display:none; padding:20px; background:var(--card-bg); border-radius:12px; border:1px solid var(--border-color);">
                <div id="aiYorumSonucText" style="line-height:1.6;"></div>
            </div>
        </div>
    `;

    // Grafikleri çiz ama display:none içindeki canvaslar bazen boyut sorunu yaşar.
    // Chart.js bunu genelde çözer ama yine de çizelim.
    setTimeout(() => {
        fiyatGrafikCiz('fiyatGrafik',   d.grafik || []);
        degisimGrafikCiz('degisimGrafik', d.grafik || []);
        hacimGrafikCiz('hacimGrafik',   d.grafik || []);
        aralikGrafikCiz('aralikGrafik', d.grafik || []);
    }, 50);
}

window.teknikTabGoster = function(tabId, btnElement) {
    document.querySelectorAll('.teknik-subtab').forEach(t => t.style.display = 'none');
    
    if (btnElement) {
        document.querySelectorAll('#teknikTabMenu .portfolio-tab-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
    
    const target = document.getElementById(`teknikTab_${tabId}`);
    if (target) target.style.display = 'block';
};

window.aiYorumIste = async function() {
    if (!aktifTeknikHisse) return;
    
    const container = document.getElementById('aiYorumSonucContainer');
    const textEl = document.getElementById('aiYorumSonucText');
    
    container.style.display = 'block';
    textEl.innerHTML = '<div class="status-text">STOCKER AI hisseyi analiz ediyor... Lütfen bekleyin.</div>';

    try {
        const payload = { 
            message: `${aktifTeknikHisse} hissesi için son 30 günlük fiyat hareketleri, hacim ve RSI gibi göstergeleri dikkate alarak detaylı bir teknik analiz yorumu yapar mısın? Kısa, orta vadeli görünüm ve destek/direnç noktalarını belirt.`,
            history: [] 
        };

        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            textEl.innerHTML = formatMarkdown(data.reply);
        } else {
            textEl.innerHTML = `<span class="negative">Hata: ${escapeHtml(data.message)}</span>`;
        }
    } catch (e) {
        textEl.innerHTML = `<span class="negative">Bağlantı hatası: ${e.message}</span>`;
    }
};

function formatMarkdown(text) {
    if (!text) return '';
    let html = text.replace(/\\n/g, '<br>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/- (.*?)(<br>|$)/g, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    return html;
}

/**
 * Teknik analiz ekranının altındaki haberleri /api/haberler ile yükler.
 *
 * @param {string} hisse - Haber aranacak hisse kodu
 */
async function teknikHaberleriYukle(hisse) {
    const list = document.getElementById('teknikHaberListesi');
    if (!list) return;

    list.innerHTML = '<li class="haber-yukleniyor">Haberler yükleniyor...</li>';

    try {
        const res = await fetch(`/api/haberler?hisseler=${encodeURIComponent(hisse)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const d = await res.json();
        if (d.durum !== 'basarili') throw new Error(d.mesaj || 'Haber alınamadı.');

        const haberler = (d.haberler || []).slice(0, 6);

        if (haberler.length === 0) {
            list.innerHTML = '<li class="haber-yukleniyor">Bu hisse için haber bulunamadı.</li>';
            return;
        }

        list.innerHTML = '';
        haberler.forEach(h => {
            const li       = document.createElement('li');
            li.className   = 'haber-item';
            const badge    = h.hisse  ? `<span class="haber-badge">${escapeHtml(h.hisse)}</span>`  : '';
            const kaynak   = h.kaynak ? `<span class="haber-kaynak">${escapeHtml(h.kaynak)}</span>` : '';
            const tarih    = h.tarih  ? `<span class="haber-tarih">${escapeHtml(h.tarih)}</span>`   : '';

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
        list.innerHTML = `<li class="haber-hata">⚠️ Haberler yüklenemedi: ${escapeHtml(err.message)}</li>`;
    }
}

/**
 * Teknik analiz sekmesinden keşfet sekmesine geri döner.
 */
function kesfeteDon() {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('kesfet').classList.add('active');
    menuAktifYap(0);
}
