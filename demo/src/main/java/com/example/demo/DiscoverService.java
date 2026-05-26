package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.*;

/**
 * "Keşfet" ekranındaki tematik hisse kategorilerini oluşturan servis.
 * Her kategori; başlık, açıklama, rozet ve içindeki hisselerin özet
 * fiyat verilerini içerir.
 */
public class DiscoverService {

    private final StockService stockService;

    public DiscoverService(StockService stockService) {
        this.stockService = stockService;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Keşfet ekranı için önceden tanımlanmış dört kategoriyi,
     * her hissenin güncel fiyat verisiyle birlikte döndürür.
     */
    public List<Map<String, Object>> kesfetKategorileriniGetir() {
        List<Map<String, Object>> kategoriler = new ArrayList<>();

        kategoriler.add(kategoriOlustur(
                "Yabancıların Favorileri",
                "BIST tarafında yabancı yatırımcı ve büyük kurumların sık takip ettiği, "
                        + "likiditesi yüksek ana hisselerden oluşan izleme listesi.",
                "Kurum radar",
                "Büyük ölçekli ve yüksek hacimli hisselerde teknik görünümü hızlı kontrol et.",
                Arrays.asList("THYAO", "GARAN", "AKBNK", "KCHOL", "TUPRS", "BIMAS", "ASELS", "TCELL")
        ));

        kategoriler.add(kategoriOlustur(
                "Popüler Takip Listesi",
                "Keşfet ekranında hızlı analiz için öne çıkarılmış, yatırımcıların sık aradığı semboller.",
                "Popüler",
                "Fiyat, hacim ve haber akışını birlikte incele.",
                Arrays.asList("SASA", "EREGL", "SISE", "KRDMD", "ASTOR", "FROTO", "PGSUS", "SAHOL")
        ));

        kategoriler.add(kategoriOlustur(
                "Temettü ve Değer Odağı",
                "Düzenli gelir, nakit akışı ve güçlü bilanço anlatısı üzerinden "
                        + "takip edilebilecek büyük şirketler.",
                "Değer",
                "Uzun vade bakışta haber ve bilanço etkilerini ayrıca kontrol et.",
                Arrays.asList("TUPRS", "FROTO", "TOASO", "ENJSA", "AKCNS", "ULKER", "CCOLA", "MGROS")
        ));

        kategoriler.add(kategoriOlustur(
                "Sektör Radarları",
                "Bankacılık, savunma, havacılık, perakende ve enerji gibi farklı sektörlerden "
                        + "dengeli örnekler.",
                "Sektör",
                "Aynı sektördeki hisseleri karşılaştırarak yorum yap.",
                Arrays.asList("ISCTR", "YKBNK", "ASELS", "OTKAR", "THYAO", "TAVHL", "BIMAS", "AKSEN")
        ));

        return kategoriler;
    }

    // ── Yardımcı metotlar ─────────────────────────────────────────────────────

    /**
     * Tek bir kategori nesnesi oluşturur.
     * Her hisse için güncel fiyat çekilmeye çalışılır; alınamazsa sınırlı nesne kullanılır.
     */
    private Map<String, Object> kategoriOlustur(String baslik, String aciklama,
                                                 String rozet, String kisaNot,
                                                 List<String> kodlar) {
        Map<String, Object>        kategori = new LinkedHashMap<>();
        List<Map<String, Object>>  hisseler = new ArrayList<>();

        for (String kod : kodlar) {
            String temizKod = stockService.temizleHisseKodu(kod);
            if (temizKod.isEmpty()) continue;

            hisseler.add(kategoriHisseObjesi(temizKod, kisaNot));
        }

        kategori.put("baslik",   baslik);
        kategori.put("aciklama", aciklama);
        kategori.put("rozet",    rozet);
        kategori.put("kisaNot",  kisaNot);
        kategori.put("hisseler", hisseler);

        return kategori;
    }

    /**
     * Kategori içindeki tek bir hisse için fiyat ve metrik bilgilerini içeren
     * nesne oluşturur. Fiyat alınamazsa sınırlı bir nesne döner.
     */
    private Map<String, Object> kategoriHisseObjesi(String kod, String kisaNot) {
        try {
            Map<String, Object> ozet = stockService.hisseOzetGetir(kod);

            if (ozet != null) {
                Map<String, Object> hisse = new LinkedHashMap<>();
                hisse.put("hisse",       ozet.get("hisse"));
                hisse.put("sirket",      ozet.get("sirket"));
                hisse.put("veriVar",     true);
                hisse.put("sonFiyat",    ozet.get("sonFiyat"));
                hisse.put("degisimYuzde", ozet.get("degisimYuzde"));
                hisse.put("degisimTl",   ozet.get("degisimTl"));
                hisse.put("hacimTl",     ozet.get("hacimTl"));
                hisse.put("hacimAdet",   ozet.get("hacimAdet"));
                hisse.put("not",         kisaNot);
                return hisse;
            }
        } catch (Exception ignored) {
        }

        Map<String, Object> sinirli = sinirliHisseObjesi(kod, stockService.sirketAdiBul(kod));
        sinirli.put("not", "Fiyat kaynağı sınırlı; yine de haber ve teknik ekranından kontrol edebilirsin.");
        return sinirli;
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

    // ── Teknik analiz yardımcıları ────────────────────────────────────────────

    /**
     * Belirtilen periyot için basit hareketli ortalama hesaplar.
     * Liste boşsa 0 döner.
     */
    public double hareketliOrtalama(List<Double> values, int period) {
        if (values.isEmpty()) return 0;
        int    start  = Math.max(0, values.size() - period);
        double toplam = 0;
        int    adet   = 0;
        for (int i = start; i < values.size(); i++) {
            toplam += values.get(i);
            adet++;
        }
        return adet == 0 ? 0 : toplam / adet;
    }

    /**
     * RSI (Göreceli Güç Endeksi) hesaplar (standart 14 periyot).
     * Yeterli veri yoksa 50 döner.
     */
    public double rsiHesapla(List<Double> values, int period) {
        if (values.size() <= period) return 50;

        double kazanc = 0;
        double kayip  = 0;
        int    start  = Math.max(1, values.size() - period);

        for (int i = start; i < values.size(); i++) {
            double fark = values.get(i) - values.get(i - 1);
            if (fark >= 0) kazanc += fark;
            else           kayip  += Math.abs(fark);
        }

        double ortKazanc = kazanc / period;
        double ortKayip  = kayip  / period;

        if (ortKayip == 0) return 100;

        double rs = ortKazanc / ortKayip;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Teknik analiz verilerini yorumlayan Türkçe açıklama metni üretir.
     * Yatırım tavsiyesi niteliği taşımadığı vurgulanır.
     */
    public String teknikYorumOlustur(String hisse, double fiyat, double degisimYuzde,
                                      double ma7, double rsi) {
        StringBuilder yorum = new StringBuilder();
        yorum.append(hisse).append(" için güncel fiyat ").append(stockService.yuvarla(fiyat)).append(" TL. ");

        if      (degisimYuzde > 0) yorum.append("Hisse günü pozitif bölgede sürdürüyor. ");
        else if (degisimYuzde < 0) yorum.append("Hisse günü negatif bölgede sürdürüyor. ");
        else                       yorum.append("Hissede günlük değişim yatay görünüyor. ");

        if (ma7 > 0) {
            if (fiyat > ma7) yorum.append("Fiyat 7 günlük ortalamanın üzerinde. ");
            else              yorum.append("Fiyat 7 günlük ortalamanın altında. ");
        }

        if      (rsi >= 70) yorum.append("RSI değeri yüksek bölgede; kısa vadede aşırı alım sinyali olarak yorumlanabilir. ");
        else if (rsi <= 30) yorum.append("RSI değeri düşük bölgede; kısa vadede aşırı satım bölgesine yakın görünüyor. ");
        else                yorum.append("RSI değeri nötr bölgede. ");

        yorum.append("Bu bölüm yatırım tavsiyesi değil, yalnızca teknik veri özetidir.");
        return yorum.toString();
    }

    /** Liste sonundaki double değerini döndürür. */
    public double sonDeger(List<Double> values) {
        if (values.isEmpty()) return 0;
        return values.get(values.size() - 1);
    }

    /** JSON dizisindeki en son null-olmayan double değerini döndürür. */
    public double sonGecerliDegerJson(JsonNode arr) {
        if (arr == null || !arr.isArray()) return 0;
        for (int i = arr.size() - 1; i >= 0; i--) {
            if (!arr.get(i).isNull()) return arr.get(i).asDouble();
        }
        return 0;
    }

    /** JSON dizisindeki en son null-olmayan long değerini döndürür. */
    public long sonGecerliLongJson(JsonNode arr) {
        if (arr == null || !arr.isArray()) return 0;
        for (int i = arr.size() - 1; i >= 0; i--) {
            if (!arr.get(i).isNull()) return arr.get(i).asLong();
        }
        return 0;
    }
}
