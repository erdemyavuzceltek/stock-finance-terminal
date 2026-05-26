package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.http.HttpClient;
import java.util.*;

/**
 * Tüm REST endpoint'lerini barındıran controller.
 *
 * Endpoint listesi:
 *   GET /api/fiyat              – Hisse fiyatı ve portföy değeri
 *   GET /api/hisse-ozet         – Hisse özet bilgisi
 *   GET /api/hisse-ara          – Hisse arama
 *   GET /api/piyasa             – BIST 100 piyasa verisi
 *   GET /api/teknik             – Teknik analiz (grafik, RSI, MA)
 *   GET /api/haberler           – Hisse haberleri
 *   GET /api/kesfet-kategorileri – Tematik hisse kategorileri
 */
@RestController
public class MarketController {

    private final HttpClient      client      = HttpClient.newHttpClient();
    private final ObjectMapper    mapper      = new ObjectMapper();
    private final StockService    stockService;
    private final NewsService     newsService;
    private final DiscoverService discoverService;

    public MarketController() {
        this.stockService    = new StockService(client, mapper);
        this.newsService     = new NewsService(client, stockService);
        this.discoverService = new DiscoverService(stockService);
    }

    // ── /api/fiyat ────────────────────────────────────────────────────────────

    /**
     * Belirtilen hisse ve adet için güncel fiyat ile toplam portföy değerini döndürür.
     *
     * @param hisse Hisse kodu (örn. ASELS)
     * @param adet  Portföydeki adet
     */
    @GetMapping("/api/fiyat")
    public Map<String, Object> hisseFiyatGetir(@RequestParam String hisse,
                                               @RequestParam int adet) {
        Map<String, Object> sonuc = new HashMap<>();

        try {
            String              temizHisse = stockService.temizleHisseKodu(hisse);
            Map<String, Object> ozet       = stockService.hisseOzetGetir(temizHisse);

            if (ozet == null || Boolean.FALSE.equals(ozet.get("veriVar"))) {
                sonuc.put("durum",       "basarili");
                sonuc.put("veriVar",     false);
                sonuc.put("hisse",       temizHisse);
                sonuc.put("adet",        adet);
                sonuc.put("guncelFiyat", null);
                sonuc.put("toplamDeger", null);
                sonuc.put("mesaj",       "Bu hisse için fiyat verisi alınamadı.");
                return sonuc;
            }

            double f = doubleAl(ozet.get("sonFiyat"));
            sonuc.put("hisse",       temizHisse);
            sonuc.put("guncelFiyat", stockService.yuvarla(f));
            sonuc.put("adet",        adet);
            sonuc.put("toplamDeger", stockService.yuvarla(f * adet));
            sonuc.put("veriVar",     true);
            sonuc.put("durum",       "basarili");

        } catch (Exception e) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", e.getMessage());
        }

        return sonuc;
    }

    // ── /api/hisse-ozet ───────────────────────────────────────────────────────

    /**
     * Bir hisse için son fiyat, değişim yüzdesi ve hacim bilgilerini döndürür.
     *
     * @param hisse Hisse kodu
     */
    @GetMapping("/api/hisse-ozet")
    public Map<String, Object> hisseOzetApi(@RequestParam String hisse) {
        Map<String, Object> sonuc = new HashMap<>();

        try {
            String              temizHisse = stockService.temizleHisseKodu(hisse);
            Map<String, Object> ozet       = stockService.hisseOzetGetir(temizHisse);

            if (ozet == null) {
                sonuc.put("durum",        "basarili");
                sonuc.put("veriVar",      false);
                sonuc.put("hisse",        temizHisse);
                sonuc.put("sirket",       stockService.sirketAdiBul(temizHisse));
                sonuc.put("sonFiyat",     null);
                sonuc.put("degisimYuzde", null);
                sonuc.put("degisimTl",    null);
                sonuc.put("hacimTl",      null);
                sonuc.put("hacimAdet",    null);
                sonuc.put("mesaj",        temizHisse + " için fiyat verisi bulunamadı.");
                return sonuc;
            }

            ozet.put("durum", "basarili");
            return ozet;

        } catch (Exception e) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", e.getMessage());
            return sonuc;
        }
    }

    // ── /api/hisse-ara ────────────────────────────────────────────────────────

    /**
     * Hisse kodu veya şirket adına göre arama yapar.
     * Önce canlı listede, bulunamazsa statik haritada arar.
     *
     * @param q Arama terimi (minimum 2 karakter)
     */
    @GetMapping("/api/hisse-ara")
    public Map<String, Object> hisseAra(@RequestParam String q) {
        Map<String, Object>        sonuc    = new HashMap<>();
        List<Map<String, String>>  sonuclar = new ArrayList<>();

        try {
            String arama = stockService.temizleArama(q);

            if (arama.length() < 2) {
                sonuc.put("durum",    "basarili");
                sonuc.put("sonuclar", sonuclar);
                return sonuc;
            }

            List<Map<String, String>> tumHisseler = stockService.tumHisseListesiGetir();

            for (Map<String, String> h : tumHisseler) {
                String kod = h.getOrDefault("kod", "");
                String ad  = h.getOrDefault("ad",  "");

                if (kod.toUpperCase(Locale.ROOT).contains(arama) ||
                        ad.toUpperCase(new Locale("tr", "TR")).contains(arama)) {
                    sonuclar.add(h);
                }

                if (sonuclar.size() >= 15) break;
            }

            // Canlı listede bulunamazsa statik haritada dene
            if (sonuclar.isEmpty()) {
                for (Map.Entry<String, String> e : StockConstants.SIRKET_ADLARI.entrySet()) {
                    String kod = e.getKey();
                    String ad  = e.getValue();

                    if (kod.contains(arama) || ad.toUpperCase(new Locale("tr", "TR")).contains(arama)) {
                        Map<String, String> h = new HashMap<>();
                        h.put("kod", kod);
                        h.put("ad",  ad);
                        sonuclar.add(h);
                    }

                    if (sonuclar.size() >= 15) break;
                }
            }

            sonuclar.sort(Comparator.comparing(a -> a.getOrDefault("kod", "")));
            sonuc.put("durum",    "basarili");
            sonuc.put("sonuclar", sonuclar);

        } catch (Exception e) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", e.getMessage());
        }

        return sonuc;
    }

    // ── /api/piyasa ───────────────────────────────────────────────────────────

    /**
     * BIST 100 hisselerinin tamamını paralel olarak çeker ve endeks özeti ile
     * birlikte döndürür.
     */
    @GetMapping("/api/piyasa")
    public Map<String, Object> piyasaVerisiGetir() {
        Map<String, Object>        sonuc    = new HashMap<>();
        List<Map<String, Object>>  hisseler = Collections.synchronizedList(new ArrayList<>());

        List<Map<String, String>> bist100Listesi = stockService.bist100ListesiGetir();

        bist100Listesi.parallelStream().forEach(h -> {
            String kod = h.get("kod");
            String ad  = h.get("ad");
            try {
                Map<String, Object> veri = stockService.hisseOzetGetir(kod);
                hisseler.add(veri != null ? veri : sinirliHisseObjesi(kod, ad));
            } catch (Exception ignored) {
                hisseler.add(sinirliHisseObjesi(kod, ad));
            }
        });

        hisseler.sort(Comparator.comparing(a -> String.valueOf(a.get("hisse"))));

        sonuc.put("durum",   "basarili");
        sonuc.put("endeks",  stockService.bist100OzetGetir());
        sonuc.put("hisseler", hisseler);
        return sonuc;
    }

    // ── /api/teknik ───────────────────────────────────────────────────────────

    /**
     * Bir hisse için son 30 günlük grafik verisi, RSI, hareketli ortalama ve
     * otomatik oluşturulan teknik yorum döndürür.
     *
     * @param hisse Hisse kodu
     */
    @GetMapping("/api/teknik")
    public Map<String, Object> teknikAnalizGetir(@RequestParam String hisse) {
        Map<String, Object> sonuc = new HashMap<>();

        try {
            String     temizHisse = stockService.temizleHisseKodu(hisse);
            JsonNode   resultNode = stockService.yahooChartResultGetir(temizHisse, "1mo", "1d");

            if (resultNode == null) {
                return teknikVeriYokYanit(sonuc, temizHisse);
            }

            JsonNode meta       = resultNode.path("meta");
            JsonNode timestamps = resultNode.path("timestamp");
            JsonNode quote      = resultNode.path("indicators").path("quote").get(0);

            if (quote == null || quote.isMissingNode()) {
                return teknikVeriYokYanit(sonuc, temizHisse);
            }

            JsonNode opens   = quote.path("open");
            JsonNode closes  = quote.path("close");
            JsonNode highs   = quote.path("high");
            JsonNode lows    = quote.path("low");
            JsonNode volumes = quote.path("volume");

            List<Map<String, Object>> grafik    = new ArrayList<>();
            List<Double>              kapanislar = new ArrayList<>();

            for (int i = 0; i < closes.size(); i++) {
                if (closes.get(i).isNull()) continue;

                double close  = closes.get(i).asDouble();
                double open   = i < opens.size()   && !opens.get(i).isNull()   ? opens.get(i).asDouble()   : close;
                double high   = i < highs.size()   && !highs.get(i).isNull()   ? highs.get(i).asDouble()   : close;
                double low    = i < lows.size()    && !lows.get(i).isNull()    ? lows.get(i).asDouble()    : close;
                long   volume = i < volumes.size() && !volumes.get(i).isNull() ? volumes.get(i).asLong()   : 0;

                String tarih = "";
                if (i < timestamps.size()) {
                    long ts = timestamps.get(i).asLong();
                    tarih = java.time.Instant.ofEpochSecond(ts)
                            .atZone(java.time.ZoneId.of("Europe/Istanbul"))
                            .toLocalDate()
                            .toString();
                }

                Map<String, Object> gun = new HashMap<>();
                gun.put("tarih",  tarih);
                gun.put("acilis", stockService.yuvarla(open));
                gun.put("kapanis", stockService.yuvarla(close));
                gun.put("yuksek", stockService.yuvarla(high));
                gun.put("dusuk",  stockService.yuvarla(low));
                gun.put("hacim",  volume);

                grafik.add(gun);
                kapanislar.add(close);
            }

            if (kapanislar.isEmpty()) {
                return teknikVeriYokYanit(sonuc, temizHisse);
            }

            double guncelFiyat  = meta.path("regularMarketPrice")
                    .asDouble(discoverService.sonDeger(kapanislar));
            double oncekiKapanis = meta.path("chartPreviousClose")
                    .asDouble(kapanislar.size() > 1
                            ? kapanislar.get(kapanislar.size() - 2)
                            : guncelFiyat);
            double degisimTl    = guncelFiyat - oncekiKapanis;
            double degisimYuzde = oncekiKapanis == 0 ? 0 : (degisimTl / oncekiKapanis) * 100.0;

            double gunlukYuksek = meta.path("regularMarketDayHigh")
                    .asDouble(discoverService.sonGecerliDegerJson(highs));
            double gunlukDusuk  = meta.path("regularMarketDayLow")
                    .asDouble(discoverService.sonGecerliDegerJson(lows));
            long   hacim        = meta.path("regularMarketVolume")
                    .asLong(discoverService.sonGecerliLongJson(volumes));

            double ma7 = discoverService.hareketliOrtalama(kapanislar, 7);
            double rsi = discoverService.rsiHesapla(kapanislar, 14);

            sonuc.put("durum",             "basarili");
            sonuc.put("veriVar",           true);
            sonuc.put("hisse",             temizHisse);
            sonuc.put("sirket",            stockService.sirketAdiBul(temizHisse));
            sonuc.put("guncelFiyat",       stockService.yuvarla(guncelFiyat));
            sonuc.put("degisimYuzde",      stockService.yuvarla(degisimYuzde));
            sonuc.put("degisimTl",         stockService.yuvarla(degisimTl));
            sonuc.put("gunlukYuksek",      stockService.yuvarla(gunlukYuksek));
            sonuc.put("gunlukDusuk",       stockService.yuvarla(gunlukDusuk));
            sonuc.put("hacim",             hacim);
            sonuc.put("hareketliOrtalama7", stockService.yuvarla(ma7));
            sonuc.put("rsi",               stockService.yuvarla(rsi));
            sonuc.put("grafik",            grafik);
            sonuc.put("yorum",             discoverService.teknikYorumOlustur(
                    temizHisse, guncelFiyat, degisimYuzde, ma7, rsi));

        } catch (Exception e) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", e.getMessage());
        }

        return sonuc;
    }

    // ── /api/haberler ─────────────────────────────────────────────────────────

    /**
     * Virgülle ayrılmış hisse listesi için haber akışını döndürür.
     * Haberler zaman damgasına göre azalan sırada sıralanır.
     *
     * @param hisseler Virgülle ayrılmış hisse kodları (isteğe bağlı)
     */
    @GetMapping("/api/haberler")
    public Map<String, Object> hisseHaberGetir(
            @RequestParam(required = false) String hisseler) {

        Map<String, Object>        sonuc         = new HashMap<>();
        List<Map<String, String>>  tumHaberler   = new ArrayList<>();
        Set<String>                eklenenLinkler = new HashSet<>();

        try {
            if (hisseler == null || hisseler.trim().isEmpty()) {
                sonuc.put("durum",   "basarili");
                sonuc.put("haberler", tumHaberler);
                sonuc.put("mesaj",   "Haber görmek için hisseler parametresi gönderilmeli.");
                return sonuc;
            }

            String[] hisseListesi = hisseler.split(",");

            for (String h : hisseListesi) {
                String temizHisse = stockService.temizleHisseKodu(h);
                if (temizHisse.isEmpty()) continue;

                for (Map<String, String> haber : newsService.turkBorsaHaberAra(temizHisse)) {
                    String link = haber.getOrDefault("link", "");
                    if (!link.isEmpty() && eklenenLinkler.contains(link)) continue;
                    if (!link.isEmpty()) eklenenLinkler.add(link);

                    tumHaberler.add(haber);
                    if (tumHaberler.size() >= 30) break;
                }

                if (tumHaberler.size() >= 30) break;
            }

            tumHaberler.sort((a, b) ->
                    b.getOrDefault("timestamp", "0")
                     .compareTo(a.getOrDefault("timestamp", "0")));

            sonuc.put("durum",    "basarili");
            sonuc.put("haberler", tumHaberler);

        } catch (Exception e) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", e.getMessage());
        }

        return sonuc;
    }

    // ── /api/kesfet-kategorileri ──────────────────────────────────────────────

    /**
     * Keşfet ekranı için önceden tanımlanmış tematik hisse kategorilerini
     * güncel fiyat verileriyle döndürür.
     */
    @GetMapping("/api/kesfet-kategorileri")
    public Map<String, Object> kesfetKategorileriGetir() {
        Map<String, Object> sonuc = new LinkedHashMap<>();

        try {
            List<Map<String, Object>> kategoriler = discoverService.kesfetKategorileriniGetir();

            sonuc.put("durum", "basarili");
            sonuc.put("guncellemeNotu",
                    "Kutucuklardaki fiyat ve değişim değerleri sayfa yenilendikçe güncel "
                    + "kaynaklardan çekilir. Listeler takip kolaylığı içindir; yatırım tavsiyesi değildir.");
            sonuc.put("kategoriler", kategoriler);

        } catch (Exception e) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", e.getMessage());
        }

        return sonuc;
    }

    // ── Yardımcı metotlar ─────────────────────────────────────────────────────

    /** Teknik veri alınamayan durumlar için standart hata yanıtı oluşturur. */
    private Map<String, Object> teknikVeriYokYanit(Map<String, Object> sonuc, String hisse) {
        sonuc.put("durum",  "basarili");
        sonuc.put("veriVar", false);
        sonuc.put("hisse",  hisse);
        sonuc.put("sirket", stockService.sirketAdiBul(hisse));
        sonuc.put("mesaj",  "Bu hisse için teknik veri alınamadı.");
        return sonuc;
    }

    /** Fiyat verisi olmayan hisseler için temel bilgileri içeren nesne oluşturur. */
    private Map<String, Object> sinirliHisseObjesi(String kod, String ad) {
        Map<String, Object> veri = new HashMap<>();
        veri.put("hisse",      kod);
        veri.put("sirket",     ad);
        veri.put("veriVar",    false);
        veri.put("sonFiyat",   null);
        veri.put("degisimYuzde", null);
        veri.put("degisimTl",  null);
        veri.put("hacimTl",    null);
        veri.put("hacimAdet",  null);
        veri.put("veriDurumu", "Fiyat alınamadı");
        return veri;
    }

    /** Object'ten double değer çıkarır; dönüştürülemezse 0 döner. */
    private double doubleAl(Object o) {
        if (o instanceof Number) return ((Number) o).doubleValue();
        try {
            return Double.parseDouble(String.valueOf(o));
        } catch (Exception e) {
            return 0;
        }
    }
}
