package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Hisse fiyatı, özeti ve BIST 100 listesi gibi temel piyasa verilerini
 * Yahoo Finance üzerinden çeken servis.
 */
public class StockService {

    private final HttpClient client;
    private final ObjectMapper mapper;

    /** Tüm hisseler için bellek-içi önbellek */
    private List<Map<String, String>> cachedTumHisseler = null;
    /** BIST 100 hisseleri için bellek-içi önbellek */
    private List<Map<String, String>> cachedBist100 = null;
    /** Önbelleğin son güncellendiği zaman (ms) */
    private long cachedAt = 0;

    public StockService(HttpClient client, ObjectMapper mapper) {
        this.client = client;
        this.mapper = mapper;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Belirtilen hisse için Yahoo Finance'den 5 günlük grafik verisi çeker ve
     * son fiyat, değişim yüzdesi, hacim gibi özet bilgileri döndürür.
     * Veri alınamazsa {@code null} döner.
     */
    public Map<String, Object> hisseOzetGetir(String hisse) {
        try {
            JsonNode resultNode = yahooChartResultGetir(hisse, "5d", "1d");

            if (resultNode == null) {
                return null;
            }

            JsonNode meta    = resultNode.path("meta");
            JsonNode quote   = resultNode.path("indicators").path("quote").get(0);

            if (quote == null || quote.isMissingNode()) {
                return null;
            }

            JsonNode closes  = quote.path("close");
            JsonNode volumes = quote.path("volume");

            double sonFiyat = meta.path("regularMarketPrice").asDouble(sonGecerliDeger(closes));

            if (sonFiyat <= 0) {
                return null;
            }

            double oncekiKapanis = meta.path("chartPreviousClose")
                    .asDouble(sondanOncekiGecerliDeger(closes, sonFiyat));

            double degisimTl    = sonFiyat - oncekiKapanis;
            double degisimYuzde = oncekiKapanis == 0 ? 0 : (degisimTl / oncekiKapanis) * 100.0;

            long   hacimAdet = meta.path("regularMarketVolume").asLong(sonGecerliLong(volumes));
            double hacimTl   = hacimAdet * sonFiyat;

            Map<String, Object> veri = new HashMap<>();
            veri.put("hisse",        hisse);
            veri.put("sirket",       sirketAdiBul(hisse));
            veri.put("veriVar",      true);
            veri.put("sonFiyat",     yuvarla(sonFiyat));
            veri.put("degisimYuzde", yuvarla(degisimYuzde));
            veri.put("degisimTl",    yuvarla(degisimTl));
            veri.put("hacimTl",      Math.round(hacimTl));
            veri.put("hacimAdet",    hacimAdet);
            veri.put("previousClose", yuvarla(oncekiKapanis));

            return veri;

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Belirtilen hisse kodunun güncel fiyatını döndürür.
     * Fiyat alınamazsa veya sembol geçersizse {@code null} döner.
     * Hiçbir zaman exception fırlatmaz.
     */
    public Double getStockPrice(String symbol) {
        try {
            if (symbol == null || symbol.isBlank()) return null;
            Map<String, Object> ozet = hisseOzetGetir(symbol);
            if (ozet == null) return null;
            Object fiyat = ozet.get("sonFiyat");
            if (fiyat == null) return null;
            return Double.valueOf(fiyat.toString());
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Belirtilen hisse için detaylı veriyi Map olarak döndürür.
     * Veri alınamazsa boş (empty) map döner.
     * Hiçbir zaman exception fırlatmaz.
     */
    public Map<String, Object> getDetailedStockData(String symbol) {
        try {
            if (symbol == null || symbol.isBlank()) return new HashMap<>();
            Map<String, Object> ozet = hisseOzetGetir(symbol);
            return ozet != null ? ozet : new HashMap<>();
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    /**
     * BIST 100 endeks özeti (son fiyat, değişim) döndürür.
     * Alınamazsa {@code null} döner.
     */
    public Map<String, Object> bist100OzetGetir() {
        try {
            JsonNode resultNode = yahooChartResultGetir("XU100", "5d", "1d");

            if (resultNode == null) {
                return null;
            }

            JsonNode meta  = resultNode.path("meta");
            JsonNode quote = resultNode.path("indicators").path("quote").get(0);

            if (quote == null || quote.isMissingNode()) {
                return null;
            }

            JsonNode closes = quote.path("close");

            double sonFiyat      = meta.path("regularMarketPrice").asDouble(sonGecerliDeger(closes));
            double oncekiKapanis = meta.path("chartPreviousClose")
                    .asDouble(sondanOncekiGecerliDeger(closes, sonFiyat));
            double degisimTl     = sonFiyat - oncekiKapanis;
            double degisimYuzde  = oncekiKapanis == 0 ? 0 : (degisimTl / oncekiKapanis) * 100.0;

            Map<String, Object> veri = new HashMap<>();
            veri.put("hisse",        "XU100");
            veri.put("sonFiyat",     yuvarla(sonFiyat));
            veri.put("degisimYuzde", yuvarla(degisimYuzde));
            veri.put("degisimTl",    yuvarla(degisimTl));

            return veri;

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Yahoo Finance chart API'sinden ham sonuç düğümünü döndürür.
     * Birden fazla base URL ve sembol varyantını sırayla dener.
     */
    public JsonNode yahooChartResultGetir(String hisse, String range, String interval) {
        List<String> bases   = Arrays.asList(
                "https://query1.finance.yahoo.com",
                "https://query2.finance.yahoo.com"
        );
        List<String> symbols = Arrays.asList(hisse + ".IS", hisse + ".E", hisse);

        for (String base : bases) {
            for (String symbol : symbols) {
                try {
                    String url = base + "/v8/finance/chart/"
                            + URLEncoder.encode(symbol, StandardCharsets.UTF_8)
                            + "?range="    + URLEncoder.encode(range,    StandardCharsets.UTF_8)
                            + "&interval=" + URLEncoder.encode(interval, StandardCharsets.UTF_8);

                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("User-Agent", browserUserAgent())
                            .header("Accept", "application/json")
                            .GET()
                            .build();

                    HttpResponse<String> response = client.send(request,
                            HttpResponse.BodyHandlers.ofString());

                    if (response.statusCode() < 200 || response.statusCode() >= 300) {
                        continue;
                    }

                    JsonNode root   = mapper.readTree(response.body());
                    JsonNode result = root.path("chart").path("result");

                    if (result.isArray() && result.size() > 0) {
                        JsonNode first = result.get(0);
                        JsonNode quote = first.path("indicators").path("quote").get(0);

                        if (quote != null && !quote.isMissingNode()) {
                            return first;
                        }
                    }

                } catch (Exception ignored) {
                    // Bir sonraki varyantı dene
                }
            }
        }

        return null;
    }

    /**
     * BIST 100 hisse listesini döndürür.
     * Önce Borsa İstanbul CSV'sini dener, alınamazsa yedek listeye döner.
     */
    public List<Map<String, String>> bist100ListesiGetir() {
        try {
            hisseleriGuncelle();

            if (cachedBist100 != null && !cachedBist100.isEmpty()) {
                return cachedBist100;
            }

        } catch (Exception ignored) {
        }

        // Yedek liste
        List<Map<String, String>> fallback = new ArrayList<>();
        for (String kod : StockConstants.YEDEK_BIST100) {
            Map<String, String> item = new HashMap<>();
            item.put("kod", kod);
            item.put("ad",  sirketAdiBul(kod));
            fallback.add(item);
        }
        fallback.sort(Comparator.comparing(a -> a.getOrDefault("kod", "")));
        return fallback;
    }

    /**
     * Borsa İstanbul'daki tüm hisselerin listesini döndürür.
     * Önce CSV önbelleğini kullanır, alınamazsa SIRKET_ADLARI ve yedek listeye döner.
     */
    public List<Map<String, String>> tumHisseListesiGetir() {
        try {
            hisseleriGuncelle();

            if (cachedTumHisseler != null && !cachedTumHisseler.isEmpty()) {
                return cachedTumHisseler;
            }

        } catch (Exception ignored) {
        }

        // Yedek: statik listeden oluştur
        List<Map<String, String>> fallback = new ArrayList<>();
        for (Map.Entry<String, String> e : StockConstants.SIRKET_ADLARI.entrySet()) {
            Map<String, String> item = new HashMap<>();
            item.put("kod", e.getKey());
            item.put("ad",  e.getValue());
            fallback.add(item);
        }
        for (String kod : StockConstants.YEDEK_BIST100) {
            boolean varMi = fallback.stream().anyMatch(x -> x.get("kod").equals(kod));
            if (!varMi) {
                Map<String, String> item = new HashMap<>();
                item.put("kod", kod);
                item.put("ad",  sirketAdiBul(kod));
                fallback.add(item);
            }
        }
        fallback.sort(Comparator.comparing(a -> a.getOrDefault("kod", "")));
        return fallback;
    }

    /**
     * Hisse kodu için bilinen şirket adını döndürür.
     * Bulunamazsa kodu olduğu gibi döndürür.
     */
    public String sirketAdiBul(String kod) {
        return StockConstants.SIRKET_ADLARI.getOrDefault(kod, kod);
    }

    // ── Yardımcı metotlar ─────────────────────────────────────────────────────

    /** Borsa İstanbul CSV'sini çekerek önbelleği günceller (senkronize). */
    private synchronized void hisseleriGuncelle() {
        long now = System.currentTimeMillis();

        if (cachedTumHisseler != null && cachedBist100 != null
                && now - cachedAt < StockConstants.CACHE_MS) {
            return;
        }

        try {
            String url = "https://www.borsaistanbul.com/datum/hisse_endeks_ds.csv";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", browserUserAgent())
                    .header("Accept", "text/csv,text/plain,*/*")
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return;
            }

            String body = response.body();

            Map<String, Map<String, String>> tumMap    = new LinkedHashMap<>();
            Map<String, Map<String, String>> bist100Map = new LinkedHashMap<>();

            String[] lines = body.split("\\R");

            for (String line : lines) {
                String kod = kodCikar(line);
                if (kod.isEmpty()) continue;

                String ad = adCikar(line, kod);

                Map<String, String> item = new HashMap<>();
                item.put("kod", kod);
                item.put("ad",  ad);

                tumMap.put(kod, item);

                String upper = line.toUpperCase(Locale.ROOT);
                if (upper.contains(";XU100;") || upper.contains(";BIST 100;")) {
                    bist100Map.put(kod, item);
                }
            }

            if (!tumMap.isEmpty()) {
                cachedTumHisseler = new ArrayList<>(tumMap.values());
                cachedTumHisseler.sort(Comparator.comparing(a -> a.getOrDefault("kod", "")));
            }

            if (!bist100Map.isEmpty()) {
                cachedBist100 = new ArrayList<>(bist100Map.values());
                cachedBist100.sort(Comparator.comparing(a -> a.getOrDefault("kod", "")));
            }

            cachedAt = now;

        } catch (Exception ignored) {
        }
    }

    /** CSV satırından hisse kodunu çıkarır (.E uzantısını arar). */
    private String kodCikar(String line) {
        try {
            Pattern p = Pattern.compile("([A-Z0-9]+)\\.E");
            Matcher m = p.matcher(line.toUpperCase(Locale.ROOT));
            if (m.find()) {
                return temizleHisseKodu(m.group(1));
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    /** CSV satırından şirket adını çıkarır; bulunamazsa statik listeden alır. */
    private String adCikar(String line, String kod) {
        try {
            String[] parts = line.split(";");
            if (parts.length >= 2) {
                String ad = parts[1].trim();
                if (!ad.isBlank() && !ad.toUpperCase(Locale.ROOT).contains("BIST")) {
                    return ad;
                }
            }
        } catch (Exception ignored) {
        }
        return sirketAdiBul(kod);
    }

    // ── Matematiksel / veri yardımcıları ─────────────────────────────────────

    /** JSON dizisindeki en son null-olmayan değeri döndürür. */
    public double sonGecerliDeger(JsonNode arr) {
        if (arr == null || !arr.isArray()) return 0;
        for (int i = arr.size() - 1; i >= 0; i--) {
            if (!arr.get(i).isNull()) return arr.get(i).asDouble();
        }
        return 0;
    }

    /** JSON dizisindeki sondan bir önceki null-olmayan değeri döndürür. */
    public double sondanOncekiGecerliDeger(JsonNode arr, double varsayilan) {
        if (arr == null || !arr.isArray()) return varsayilan;
        int bulunan = 0;
        for (int i = arr.size() - 1; i >= 0; i--) {
            if (!arr.get(i).isNull()) {
                bulunan++;
                if (bulunan == 2) return arr.get(i).asDouble();
            }
        }
        return varsayilan;
    }

    /** JSON dizisindeki en son null-olmayan long değerini döndürür. */
    public long sonGecerliLong(JsonNode arr) {
        if (arr == null || !arr.isArray()) return 0;
        for (int i = arr.size() - 1; i >= 0; i--) {
            if (!arr.get(i).isNull()) return arr.get(i).asLong();
        }
        return 0;
    }

    /** Double değerini iki ondalık basamağa yuvarlar. */
    public double yuvarla(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    /**
     * Hisse kodunu temizler: büyük harfe çevirir, .IS/.E uzantılarını ve
     * alfanumerik olmayan karakterleri kaldırır.
     */
    public String temizleHisseKodu(String hisse) {
        if (hisse == null) return "";
        return hisse
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace(".IS", "")
                .replace(".E",  "")
                .replaceAll("[^A-Z0-9]", "");
    }

    /**
     * Arama sorgusunu temizler: Türkçe karakterleri koruyarak büyük harfe çevirir,
     * .IS/.E eklerini ve geçersiz karakterleri kaldırır.
     */
    public String temizleArama(String q) {
        if (q == null) return "";
        return q
                .trim()
                .toUpperCase(new Locale("tr", "TR"))
                .replace(".IS", "")
                .replace(".E",  "")
                .replaceAll("[^A-Z0-9ÇĞİÖŞÜ\\s]", "");
    }

    /** Gerçekçi bir tarayıcı User-Agent başlığı döndürür. */
    public String browserUserAgent() {
        return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                + "AppleWebKit/537.36 (KHTML, like Gecko) "
                + "Chrome/120.0.0.0 Safari/537.36";
    }
}
