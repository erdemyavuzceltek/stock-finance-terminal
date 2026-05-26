/**
 * portfolio.js — Portföy Yönetimi ve İşlem Paneli.
 *
 * İçerik:
 *  - tabloyCiz()           — Portföy tablosunu API ile güncel fiyatlarla render eder
 *  - islemPanelAc()        — Al/Sat işlem panelini açar
 *  - islemPanelKapat()     — İşlem panelini kapatır
 *  - tradeTutarGuncelle()  — Adet değişince tahmini tutarı günceller
 *  - tradeIslemOnayla()    — Al/Sat emrini uygular ve kaydeder
 *  - emirGecmisiCiz()      — Emir geçmişi listesini render eder
 *  - portfoyeAl()          — Hızlı form üzerinden portföye hisse ekler
 *  - guneKaydet()          — Günlük performans verilerini localStorage'e kaydeder
 *  - gecmisiCiz()          — Performans geçmişini listeler
 *  - performansDetayAc()   — Seçili güne ait detaylı performans tablosunu açar
 *  - hissePerformanslariniHesapla() — Başlangıç/bitiş portföyünden kar/zarar hesaplar
 */

// ── Portföy Tablosu ───────────────────────────────────────────────────────────

/**
 * Portföydeki her hisse için /api/fiyat çağrısı yaparak tabloyu günceller.
 * Başarılı veri çekimlerinde toplam değeri hem tablo altında hem başlıkta gösterir.
 * Çekilen veriler aynı zamanda günlük performans geçmişine kaydedilir.
 */
async function tabloyCiz() {
    let tbody  = document.getElementById('portfoyTablosu');
    tbody.innerHTML = '';

    if (portfoy.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="status-text">Henüz portföyünde hisse yok.</td></tr>';
        const headerTotal = document.getElementById('genelToplamHeader');
        if (headerTotal) headerTotal.innerText = '₺0.00';
        guneKaydet(0, []);
        gecmisiCiz();
        return;
    }

    let toplam           = 0;
    let portfoyDetaylari = [];

    for (let item of portfoy) {
        try {
            let res = await fetch(`/api/fiyat?hisse=${encodeURIComponent(item.hisse)}&adet=${item.adet}`);
            let d   = await res.json();

            if (d.durum === 'basarili' && d.veriVar !== false) {
                const f = Number(d.guncelFiyat) || 0;
                const a = Number(d.adet) || 0;
                const satirToplam = f * a;
                toplam += satirToplam;

                portfoyDetaylari.push({
                    hisse: d.hisse,
                    adet:  a,
                    fiyat: f,
                    deger: satirToplam
                });

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <span class="portfoy-hisse-link" onclick="teknikAnalizAc('${d.hisse}')">
                                ${escapeHtml(d.hisse)}
                            </span>
                        </td>
                        <td>${a}</td>
                        <td>₺${f.toFixed(2)}</td>
                        <td><strong>₺${satirToplam.toFixed(2)}</strong></td>
                        <td>
                            <div class="portfolio-action-buttons">
                                <button class="btn-buy-row"  onclick="islemPanelAc('${d.hisse}', 'al',  ${Number(d.guncelFiyat)}, ${Number(d.adet)})">Al</button>
                                <button class="btn-sell-row" onclick="islemPanelAc('${d.hisse}', 'sat', ${Number(d.guncelFiyat)}, ${Number(d.adet)})">Sat</button>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML += `
                    <tr>
                        <td>
                            <span class="portfoy-hisse-link" onclick="teknikAnalizAc('${escapeJs(item.hisse)}')">
                                ${escapeHtml(item.hisse)}
                            </span>
                        </td>
                        <td>${item.adet}</td>
                        <td>-</td>
                        <td><strong>-</strong></td>
                        <td>
                            <div class="portfolio-action-buttons">
                                <button class="btn-buy-row"  onclick="islemPanelAc('${escapeJs(item.hisse)}', 'al',  0, ${Number(item.adet)})">Al</button>
                                <button class="btn-sell-row" onclick="islemPanelAc('${escapeJs(item.hisse)}', 'sat', 0, ${Number(item.adet)})">Sat</button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        } catch (err) {
            console.log('Fiyat çekme hatası:', err);
        }
    }

    const genelTopEl = document.getElementById('genelToplam');
    if (genelTopEl) genelTopEl.innerText = '₺' + toplam.toFixed(2);

    const headerTotal = document.getElementById('genelToplamHeader');
    if (headerTotal) headerTotal.innerText = '₺' + toplam.toFixed(2);

    guneKaydet(toplam, portfoyDetaylari);
    gecmisiCiz();
}

// ── İşlem Paneli ──────────────────────────────────────────────────────────────

/**
 * Al veya Sat işlem panelini açar ve alanları doldurur.
 *
 * @param {string} hisse      - Hisse kodu
 * @param {string} tip        - 'al' veya 'sat'
 * @param {number} fiyat      - Güncel fiyat
 * @param {number} mevcutAdet - Portföydeki mevcut adet
 */
function islemPanelAc(hisse, tip, fiyat, mevcutAdet) {
    aktifTrade = {
        hisse:      hisse,
        tip:        tip,
        fiyat:      Number(fiyat      || 0),
        mevcutAdet: Number(mevcutAdet || 0)
    };

    document.getElementById('tradePanelTitle').innerText =
        `${hisse} ${tip === 'al' ? 'Alım Emri' : 'Satış Emri'}`;

    document.getElementById('tradePanelSub').innerText =
        tip === 'al'
            ? 'Bu hisse için yeni alım emri oluştur.'
            : 'Bu hisse için satış emri oluştur.';

    document.getElementById('tradeHisse').value    = hisse;
    document.getElementById('tradeTip').value      = tip === 'al' ? 'Al' : 'Sat';
    document.getElementById('tradeAdet').value     = '';
    document.getElementById('tradeFiyat').value    = fiyat > 0 ? `₺${Number(fiyat).toFixed(2)}` : 'Fiyat alınamadı';
    document.getElementById('tradeMevcutAdet').innerText    = mevcutAdet;
    document.getElementById('tradeTahminiTutar').innerText  = '₺0.00';

    const btn = document.getElementById('tradeConfirmBtn');
    btn.className = `trade-confirm-btn ${tip === 'al' ? 'buy' : 'sell'}`;
    btn.innerText = tip === 'al' ? 'Alım Emrini Onayla' : 'Satış Emrini Onayla';

    emirGecmisiCiz();

    document.getElementById('tradePanelBackdrop').classList.add('active');
    document.getElementById('tradeBottomPanel').classList.add('active');
}

/**
 * İşlem panelini kapatır ve aktif trade bilgisini temizler.
 */
function islemPanelKapat() {
    document.getElementById('tradePanelBackdrop').classList.remove('active');
    document.getElementById('tradeBottomPanel').classList.remove('active');
    aktifTrade = null;
}

/**
 * Adet inputu değişince tahmini işlem tutarını günceller.
 */
function tradeTutarGuncelle() {
    if (!aktifTrade) return;
    const adet  = parseInt(document.getElementById('tradeAdet').value) || 0;
    const fiyat = Number(aktifTrade.fiyat || 0);
    const tutar = adet * fiyat;
    document.getElementById('tradeTahminiTutar').innerText =
        fiyat > 0 ? `₺${tutar.toFixed(2)}` : '-';
}

/**
 * İşlem panelindeki "Onayla" butonuna basıldığında emri uygular.
 * Portföyü ve emir geçmişini localStorage'e kaydeder,
 * portföy tablosunu ve ilgili ekranları yeniler.
 */
async function tradeIslemOnayla() {
    if (!aktifTrade) return;

    const adet = parseInt(document.getElementById('tradeAdet').value);
    if (!adet || adet <= 0) {
        alert('Lütfen geçerli bir adet gir.');
        return;
    }

    const hisse = aktifTrade.hisse;
    const tip   = aktifTrade.tip;

    let mevcut = portfoy.find(i => i.hisse === hisse);

    if (tip === 'al') {
        if (mevcut) {
            mevcut.adet += adet;
        } else {
            portfoy.push({ hisse, adet });
        }
    }

    if (tip === 'sat') {
        if (!mevcut) {
            alert('Bu hisse portföyde bulunamadı.');
            return;
        }
        if (adet > mevcut.adet) {
            alert(`Portföyünde ${hisse} için yalnızca ${mevcut.adet} adet var.`);
            return;
        }
        mevcut.adet -= adet;
        if (mevcut.adet === 0) {
            portfoy = portfoy.filter(i => i.hisse !== hisse);
        }
    }

    const emir = {
        tarih: new Date().toLocaleDateString('tr-TR'),
        saat:  new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        hisse,
        tip,
        adet,
        fiyat: aktifTrade.fiyat || 0,
        tutar: adet * Number(aktifTrade.fiyat || 0)
    };

    emirGecmisi.unshift(emir);
    if (emirGecmisi.length > 50) emirGecmisi = emirGecmisi.slice(0, 50);

    localStorage.setItem('borsa_portfoy',       JSON.stringify(portfoy));
    localStorage.setItem('borsa_emir_gecmisi',  JSON.stringify(emirGecmisi));

    await tabloyCiz();
    emirGecmisiCiz();

    document.getElementById('tradeAdet').value             = '';
    document.getElementById('tradeTahminiTutar').innerText = '₺0.00';

    if (document.getElementById('haberler').classList.contains('active')) {
        haberleriBaslat();
    }
}

/**
 * Emir geçmişi listesini işlem panelinde render eder.
 * En fazla 12 emir gösterilir.
 */
function emirGecmisiCiz() {
    const list = document.getElementById('tradeHistoryList');
    if (!list) return;

    if (!emirGecmisi || emirGecmisi.length === 0) {
        list.innerHTML = '<li class="status-text">Henüz emir geçmişi yok.</li>';
        return;
    }

    list.innerHTML = '';

    emirGecmisi.slice(0, 12).forEach(e => {
        const li       = document.createElement('li');
        li.className   = 'trade-history-item';
        const tipText  = e.tip === 'al' ? 'AL'  : 'SAT';
        const tipClass = e.tip === 'al' ? 'buy' : 'sell';

        li.innerHTML = `
            <span class="trade-history-type ${tipClass}">${tipText}</span>
            <span class="trade-history-code">${escapeHtml(e.hisse)}</span>
            <span class="trade-history-detail">
                ${e.adet} adet · ${e.fiyat > 0 ? '₺' + Number(e.fiyat).toFixed(2) : 'Fiyat yok'}
                <br>
                ${escapeHtml(e.tarih)} ${escapeHtml(e.saat)}
            </span>
        `;
        list.appendChild(li);
    });
}

// ── Hızlı Alım Formu ─────────────────────────────────────────────────────────

/**
 * Portföy sekmesindeki hızlı form üzerinden yeni hisse ekler.
 * Validasyon, localStorage güncelleme ve tablo yenilemeyi kapsar.
 */
async function portfoyeAl() {
    const hisseInput = document.getElementById('hisseInput');
    const adetInput  = document.getElementById('adetInput');

    const hisse = hisseInput.value.trim().toUpperCase();
    const adet  = parseInt(adetInput.value);

    if (!hisse || !adet || adet <= 0) {
        alert('Lütfen geçerli bir hisse ve adet gir.');
        return;
    }

    const mevcut = portfoy.find(i => i.hisse === hisse);
    if (mevcut) {
        mevcut.adet += adet;
    } else {
        portfoy.push({ hisse, adet });
    }

    const emir = {
        tarih: new Date().toLocaleDateString('tr-TR'),
        saat:  new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        hisse,
        tip:   'al',
        adet,
        fiyat: 0,
        tutar: 0
    };

    emirGecmisi.unshift(emir);
    if (emirGecmisi.length > 50) emirGecmisi = emirGecmisi.slice(0, 50);

    localStorage.setItem('borsa_portfoy',      JSON.stringify(portfoy));
    localStorage.setItem('borsa_emir_gecmisi', JSON.stringify(emirGecmisi));

    hisseInput.value = '';
    adetInput.value  = '';

    await tabloyCiz();
    emirGecmisiCiz();

    if (document.getElementById('haberler').classList.contains('active')) {
        haberleriBaslat();
    }
}

// ── Performans Geçmişi ────────────────────────────────────────────────────────

/**
 * Günlük portföy değerini ve hisse detaylarını localStorage'e kaydeder.
 * Aynı gün için birden fazla kayıt "güncellemeler" dizisine eklenir.
 *
 * @param {number} toplam           - Toplam portföy değeri
 * @param {Array}  portfoyDetaylari - Hisse bazlı fiyat detayları
 */
function guneKaydet(toplam, portfoyDetaylari) {
    const tarih = new Date().toLocaleDateString('tr-TR');
    const saat  = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    let gecmisDetay = JSON.parse(localStorage.getItem('borsa_gecmis_detay')) || {};
    const detayKopya = JSON.parse(JSON.stringify(portfoyDetaylari));

    if (!gecmisDetay[tarih]) {
        gecmisDetay[tarih] = {
            tarih,
            baslangicSaat:   saat,
            bitisSaat:       saat,
            baslangicToplam: Number(toplam),
            bitisToplam:     Number(toplam),
            baslangicPortfoy: detayKopya,
            bitisPortfoy:    detayKopya,
            guncellemeler:   []
        };
    } else {
        gecmisDetay[tarih].bitisSaat    = saat;
        gecmisDetay[tarih].bitisToplam  = Number(toplam);
        gecmisDetay[tarih].bitisPortfoy = detayKopya;
    }

    gecmisDetay[tarih].guncellemeler.push({ saat, toplam: Number(toplam), portfoy: detayKopya });

    if (gecmisDetay[tarih].guncellemeler.length > 50) {
        gecmisDetay[tarih].guncellemeler.shift();
    }

    localStorage.setItem('borsa_gecmis_detay', JSON.stringify(gecmisDetay));

    let basitGecmis = JSON.parse(localStorage.getItem('borsa_gecmis')) || {};
    basitGecmis[tarih] = Number(toplam);
    localStorage.setItem('borsa_gecmis', JSON.stringify(basitGecmis));
}

/**
 * Performans Geçmişi sekmesindeki gün listesini render eder.
 * En güncel kayıt için otomatik olarak detay açılır.
 */
function gecmisiCiz() {
    let gecmisDetay = JSON.parse(localStorage.getItem('borsa_gecmis_detay')) || {};
    let eskiGecmis  = JSON.parse(localStorage.getItem('borsa_gecmis'))       || {};
    let list        = document.getElementById('gecmisTablosu');

    list.innerHTML = '';

    const detayliGunler = Object.keys(gecmisDetay).reverse();

    if (detayliGunler.length === 0 && Object.keys(eskiGecmis).length === 0) {
        list.innerHTML = '<li class="status-text">Henüz performans geçmişi yok.</li>';
        document.getElementById('performansDetayAlani').innerHTML = '';
        return;
    }

    detayliGunler.forEach(tarih => {
        const g           = gecmisDetay[tarih];
        const karZarar    = Number(g.bitisToplam || 0) - Number(g.baslangicToplam || 0);
        const karZararYuzde = Number(g.baslangicToplam || 0) === 0
            ? 0
            : (karZarar / Number(g.baslangicToplam)) * 100;
        const cls = karZarar > 0 ? 'positive' : karZarar < 0 ? 'negative' : 'neutral';

        list.innerHTML += `
            <li class="performans-gun" onclick="performansDetayAc('${tarih}')">
                <div class="performans-gun-baslik">${escapeHtml(tarih)}</div>
                <div class="performans-gun-ozet">
                    <span>Başlangıç: ₺${formatTL(g.baslangicToplam)}</span>
                    <span>Son: ₺${formatTL(g.bitisToplam)}</span>
                    <span class="${cls}">Kar/Zarar: ₺${formatTL(karZarar)} (${formatYuzde(karZararYuzde)})</span>
                    <span>${escapeHtml(g.baslangicSaat || '-')} → ${escapeHtml(g.bitisSaat || '-')}</span>
                </div>
            </li>
        `;
    });

    // Eski format kayıtlar (sadece toplam değer var)
    Object.entries(eskiGecmis).reverse().forEach(([tarih, toplam]) => {
        if (gecmisDetay[tarih]) return;
        list.innerHTML += `
            <li class="performans-gun">
                <div class="performans-gun-baslik">${escapeHtml(tarih)}</div>
                <div class="performans-gun-ozet">
                    <span>Toplam: ₺${formatTL(toplam)}</span>
                    <span>Bu kayıt eski sistemden geldiği için hisse bazlı detay yok.</span>
                </div>
            </li>
        `;
    });

    if (detayliGunler.length > 0) {
        performansDetayAc(detayliGunler[0]);
    }
}

/**
 * Seçili gün için detaylı performans tablosunu ekrana yazar.
 *
 * @param {string} tarih - Detay açılacak tarih ('dd.MM.yyyy' formatında)
 */
function performansDetayAc(tarih) {
    let gecmisDetay = JSON.parse(localStorage.getItem('borsa_gecmis_detay')) || {};
    const g         = gecmisDetay[tarih];
    const alan      = document.getElementById('performansDetayAlani');

    if (!g) {
        alan.innerHTML = '<div class="status-text">Bu gün için detay bulunamadı.</div>';
        return;
    }

    const baslangicToplam   = Number(g.baslangicToplam || 0);
    const bitisToplam       = Number(g.bitisToplam     || 0);
    const toplamKarZarar    = bitisToplam - baslangicToplam;
    const toplamKarZararYuzde = baslangicToplam === 0
        ? 0
        : (toplamKarZarar / baslangicToplam) * 100;
    const toplamClass = toplamKarZarar > 0 ? 'positive' : toplamKarZarar < 0 ? 'negative' : 'neutral';

    const satirlar = hissePerformanslariniHesapla(
        g.baslangicPortfoy || [],
        g.bitisPortfoy     || []
    );

    alan.innerHTML = `
        <h3 style="margin-bottom:16px;">${escapeHtml(tarih)} Detaylı Performans</h3>

        <div class="performans-detay-kartlar">
            <div class="performans-kart">
                <div class="performans-kart-label">Gün Başı Değer</div>
                <div class="performans-kart-value">₺${formatTL(baslangicToplam)}</div>
            </div>
            <div class="performans-kart">
                <div class="performans-kart-label">Gün Sonu / Son Değer</div>
                <div class="performans-kart-value">₺${formatTL(bitisToplam)}</div>
            </div>
            <div class="performans-kart">
                <div class="performans-kart-label">Toplam Kar / Zarar</div>
                <div class="performans-kart-value ${toplamClass}">₺${formatTL(toplamKarZarar)}</div>
            </div>
            <div class="performans-kart">
                <div class="performans-kart-label">Toplam Getiri</div>
                <div class="performans-kart-value ${toplamClass}">${formatYuzde(toplamKarZararYuzde)}</div>
            </div>
        </div>

        <div class="performans-table-wrapper">
            <table>
                <thead>
                <tr>
                    <th>Hisse</th>
                    <th>Adet</th>
                    <th>Gün Başı Fiyat</th>
                    <th>Son Fiyat</th>
                    <th>Gün Başı Değer</th>
                    <th>Son Değer</th>
                    <th>Kar / Zarar</th>
                    <th>Kar / Zarar (%)</th>
                </tr>
                </thead>
                <tbody>
                    ${satirlar}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Başlangıç ve bitiş portföyünü karşılaştırarak her hisse için
 * kar/zarar satırlarından oluşan HTML döndürür.
 *
 * @param {Array} baslangicPortfoy - Gün başı portföy snapshot'ı
 * @param {Array} bitisPortfoy     - Gün sonu portföy snapshot'ı
 * @returns {string} HTML tablo satırları
 */
function hissePerformanslariniHesapla(baslangicPortfoy, bitisPortfoy) {
    const map = new Map();

    baslangicPortfoy.forEach(h => {
        map.set(h.hisse, {
            hisse:    h.hisse,
            basAdet:  Number(h.adet  || 0),
            basFiyat: Number(h.fiyat || 0),
            basDeger: Number(h.deger || 0),
            sonAdet:  0,
            sonFiyat: 0,
            sonDeger: 0
        });
    });

    bitisPortfoy.forEach(h => {
        if (!map.has(h.hisse)) {
            map.set(h.hisse, {
                hisse:    h.hisse,
                basAdet:  0,
                basFiyat: 0,
                basDeger: 0,
                sonAdet:  Number(h.adet  || 0),
                sonFiyat: Number(h.fiyat || 0),
                sonDeger: Number(h.deger || 0)
            });
        } else {
            const item = map.get(h.hisse);
            item.sonAdet  = Number(h.adet  || 0);
            item.sonFiyat = Number(h.fiyat || 0);
            item.sonDeger = Number(h.deger || 0);
        }
    });

    let html = '';

    map.forEach(h => {
        const karZarar      = h.sonDeger - h.basDeger;
        const karZararYuzde = h.basDeger === 0 ? null : (karZarar / h.basDeger) * 100;
        const cls           = karZarar > 0 ? 'positive' : karZarar < 0 ? 'negative' : 'neutral';
        const yuzdeText     = karZararYuzde === null ? 'Yeni kayıt' : formatYuzde(karZararYuzde);

        html += `
            <tr>
                <td><strong>${escapeHtml(h.hisse)}</strong></td>
                <td>${h.sonAdet || h.basAdet}</td>
                <td>₺${formatTL(h.basFiyat)}</td>
                <td>₺${formatTL(h.sonFiyat)}</td>
                <td>₺${formatTL(h.basDeger)}</td>
                <td>₺${formatTL(h.sonDeger)}</td>
                <td class="${cls}">₺${formatTL(karZarar)}</td>
                <td class="${cls}">${yuzdeText}</td>
            </tr>
        `;
    });

    if (!html) {
        html = '<tr><td colspan="8" class="status-text">Bu gün için hisse detayı yok.</td></tr>';
    }

    return html;
}

// ── Portföy Alt Sekme Yönetimi ────────────────────────────────────────────────

window.portfoySekmeGoster = function(id, btn) {
    // Tüm alt sekmeleri gizle
    const subtabs = document.querySelectorAll('.portfolio-subtab');
    subtabs.forEach(c => {
        c.style.display = 'none';
        c.classList.remove('active');
    });

    // Tüm butonlardan active sınıfını kaldır
    const btns = document.querySelectorAll('.portfolio-tab-btn');
    btns.forEach(b => b.classList.remove('active'));

    // İlgili sekmeyi göster
    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    // İlgili butonu aktif yap
    if (btn) {
        btn.classList.add('active');
    } else {
        // Eğer btn referansı verilmediyse (başlangıç yüklemesinde vb.)
        const matchingBtn = Array.from(btns).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(id));
        if (matchingBtn) matchingBtn.classList.add('active');
    }

    // Özel yüklemeler
    if (id === 'portfoyWatchlist') watchlistCiz();
    if (id === 'portfoyGecmis') gecmisiCiz();
};

// ── Portföy Hızlı Alım Arama Dropdown ────────────────────────────────────────

let portfoyAramaTimer = null;

function portfoyAramaDegisti() {
    clearTimeout(portfoyAramaTimer);
    portfoyAramaTimer = setTimeout(() => portfoyAramaDropdown(), 250);
}

async function portfoyAramaDropdown() {
    const q = document.getElementById('hisseInput').value.trim().toUpperCase();
    const dropdown = document.getElementById('portfoyAramaDropdown');

    if (q.length < 2) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
    }

    dropdown.style.display = 'block';
    dropdown.innerHTML = '<div class="arama-dropdown-header">Hisse aranıyor...</div>';

    try {
        const res = await fetch(`/api/hisse-ara?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        
        if (d.durum !== 'basarili' || !d.sonuclar || d.sonuclar.length === 0) {
            dropdown.innerHTML = '<div class="arama-dropdown-header">Sonuç bulunamadı</div>';
            return;
        }

        dropdown.innerHTML = '<div class="arama-dropdown-header">Sonuçlar</div>';
        d.sonuclar.forEach(s => {
            const item = document.createElement('div');
            item.className = 'arama-sonuc';
            item.onclick = () => portfoyAramaSec(s.kod);
            item.innerHTML = `
                <span class="arama-kod">${escapeHtml(s.kod)}</span>
                <span class="arama-ad">${escapeHtml(s.ad || s.kod)}</span>
            `;
            dropdown.appendChild(item);
        });
    } catch (err) {
        dropdown.innerHTML = `<div class="arama-dropdown-header">Arama hatası</div>`;
    }
}

function portfoyAramaEnter(event) {
    if (event.key === 'Enter') {
        const dropdown = document.getElementById('portfoyAramaDropdown');
        if (dropdown.style.display === 'block') {
            const first = dropdown.querySelector('.arama-sonuc .arama-kod');
            if (first) portfoyAramaSec(first.innerText);
        }
    }
}

function portfoyAramaSec(kod) {
    document.getElementById('hisseInput').value = kod;
    document.getElementById('portfoyAramaDropdown').style.display = 'none';
    document.getElementById('adetInput').focus();
}

// ── Watchlist Yönetimi ───────────────────────────────────────────────────────

async function watchlistCiz() {
    const tbody = document.getElementById('watchlistTablosu');
    if (watchlist.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="status-text">Henüz izleme listene hisse eklemedin.</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="5" class="status-text">İzleme listesi yükleniyor...</td></tr>';
    let html = '';

    for (let w of watchlist) {
        try {
            let res = await fetch(`/api/fiyat?hisse=${encodeURIComponent(w.hisse)}`);
            let d = await res.json();

            if (d.durum === 'basarili' && d.veriVar !== false) {
                const degisimClass = d.degisimYuzde > 0 ? 'positive' : d.degisimYuzde < 0 ? 'negative' : 'neutral';
                html += `
                    <tr>
                        <td><span class="portfoy-hisse-link" onclick="teknikAnalizAc('${escapeJs(d.hisse)}')">${escapeHtml(d.hisse)}</span></td>
                        <td>${escapeHtml(w.ad || d.hisse)}</td>
                        <td>₺${Number(d.guncelFiyat).toFixed(2)}</td>
                        <td class="${degisimClass}">${formatYuzde(d.degisimYuzde)}</td>
                        <td>
                            <div class="portfolio-action-buttons">
                                <button class="btn-buy-row" onclick="islemPanelAc('${escapeJs(d.hisse)}', 'al', ${Number(d.guncelFiyat)}, 0)">Al</button>
                                <button class="btn-sell-row" style="background:var(--bg-elevated); border-color:var(--border); color:var(--text-secondary);" onclick="watchlisttenKaldir('${escapeJs(d.hisse)}')">Kaldır</button>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                html += `
                    <tr>
                        <td><span class="portfoy-hisse-link" onclick="teknikAnalizAc('${escapeJs(w.hisse)}')">${escapeHtml(w.hisse)}</span></td>
                        <td>${escapeHtml(w.ad || w.hisse)}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>
                            <div class="portfolio-action-buttons">
                                <button class="btn-buy-row" onclick="islemPanelAc('${escapeJs(w.hisse)}', 'al', 0, 0)">Al</button>
                                <button class="btn-sell-row" style="background:var(--bg-elevated); border-color:var(--border); color:var(--text-secondary);" onclick="watchlisttenKaldir('${escapeJs(w.hisse)}')">Kaldır</button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        } catch (err) {
            console.log('Watchlist fiyat hatası:', err);
        }
    }
    tbody.innerHTML = html;
}

let watchlistAramaTimer = null;

function watchlistAramaDegisti() {
    clearTimeout(watchlistAramaTimer);
    watchlistAramaTimer = setTimeout(() => watchlistAramaDropdown(), 250);
}

async function watchlistAramaDropdown() {
    const q = document.getElementById('watchlistInput').value.trim().toUpperCase();
    const dropdown = document.getElementById('watchlistAramaDropdown');

    if (q.length < 2) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
    }

    dropdown.style.display = 'block';
    dropdown.innerHTML = '<div class="arama-dropdown-header">Hisse aranıyor...</div>';

    try {
        const res = await fetch(`/api/hisse-ara?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        
        if (d.durum !== 'basarili' || !d.sonuclar || d.sonuclar.length === 0) {
            dropdown.innerHTML = '<div class="arama-dropdown-header">Sonuç bulunamadı</div>';
            return;
        }

        dropdown.innerHTML = '<div class="arama-dropdown-header">Sonuçlar</div>';
        d.sonuclar.forEach(s => {
            const item = document.createElement('div');
            item.className = 'arama-sonuc';
            item.onclick = () => watchlistAramaSec(s.kod, s.ad);
            item.innerHTML = `
                <span class="arama-kod">${escapeHtml(s.kod)}</span>
                <span class="arama-ad">${escapeHtml(s.ad || s.kod)}</span>
            `;
            dropdown.appendChild(item);
        });
    } catch (err) {
        dropdown.innerHTML = `<div class="arama-dropdown-header">Arama hatası</div>`;
    }
}

function watchlistAramaEnter(event) {
    if (event.key === 'Enter') {
        const dropdown = document.getElementById('watchlistAramaDropdown');
        if (dropdown.style.display === 'block') {
            const firstKod = dropdown.querySelector('.arama-sonuc .arama-kod');
            const firstAd = dropdown.querySelector('.arama-sonuc .arama-ad');
            if (firstKod) watchlistAramaSec(firstKod.innerText, firstAd ? firstAd.innerText : firstKod.innerText);
        } else {
            watchlisteEkleManuel();
        }
    }
}

function watchlistAramaSec(kod, ad) {
    document.getElementById('watchlistInput').value = kod;
    document.getElementById('watchlistInput').dataset.ad = ad;
    document.getElementById('watchlistAramaDropdown').style.display = 'none';
    watchlisteEkle(kod, ad);
}

function watchlisteEkleManuel() {
    const input = document.getElementById('watchlistInput');
    const kod = input.value.trim().toUpperCase();
    const ad = input.dataset.ad || kod;
    if (kod) watchlisteEkle(kod, ad);
}

function watchlisteEkle(hisse, ad) {
    if (!hisse) return;
    
    if (watchlist.some(w => w.hisse === hisse)) {
        alert(hisse + ' zaten izleme listesinde var.');
        document.getElementById('watchlistInput').value = '';
        return;
    }
    
    watchlist.push({ hisse, ad: ad || hisse });
    localStorage.setItem('borsa_watchlist', JSON.stringify(watchlist));
    document.getElementById('watchlistInput').value = '';
    delete document.getElementById('watchlistInput').dataset.ad;
    watchlistCiz();
}

function watchlisttenKaldir(hisse) {
    watchlist = watchlist.filter(w => w.hisse !== hisse);
    localStorage.setItem('borsa_watchlist', JSON.stringify(watchlist));
    watchlistCiz();
}
