package com.example.demo;

import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Hisse senedi haberlerini Google News RSS üzerinden çeken servis.
 * Her hisse için birden fazla sorgu terimi dener ve Türk finans medyasına
 * yönelik ilgililik filtresi uygular.
 */
public class NewsService {

    private final HttpClient client;
    private final StockService stockService;

    public NewsService(HttpClient client, StockService stockService) {
        this.client       = client;
        this.stockService = stockService;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Verilen hisse kodu için Google News RSS'ten haber listesi döndürür.
     * Sonuçlar Türk borsasıyla ilgili olup olmadığına göre filtrelenir.
     */
    public List<Map<String, String>> turkBorsaHaberAra(String hisse) {
        List<Map<String, String>> haberler       = new ArrayList<>();
        Set<String>               eklenenLinkler = new HashSet<>();

        try {
            String       sirketAdi = stockService.sirketAdiBul(hisse);
            List<String> sorgular  = haberSorgulariOlustur(hisse, sirketAdi);

            for (String sorgu : sorgular) {
                if (haberler.size() >= 10) break;

                String url = "https://news.google.com/rss/search?q="
                        + URLEncoder.encode(sorgu, StandardCharsets.UTF_8)
                        + "&hl=tr&gl=TR&ceid=TR:tr";

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("User-Agent", stockService.browserUserAgent())
                        .header("Accept", "application/rss+xml, application/xml, text/xml")
                        .GET()
                        .build();

                HttpResponse<String> response = client.send(request,
                        HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    continue;
                }

                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                DocumentBuilder        builder = factory.newDocumentBuilder();

                Document doc = builder.parse(
                        new java.io.ByteArrayInputStream(
                                response.body().getBytes(StandardCharsets.UTF_8))
                );

                NodeList items = doc.getElementsByTagName("item");

                for (int i = 0; i < items.getLength() && haberler.size() < 10; i++) {
                    org.w3c.dom.Node item = items.item(i);

                    String baslik  = getXmlText(item, "title");
                    String link    = getXmlText(item, "link");
                    String kaynak  = getXmlText(item, "source");
                    String pubDate = getXmlText(item, "pubDate");

                    if (baslik.isBlank() || link.isBlank()) continue;
                    if (eklenenLinkler.contains(link))      continue;

                    if (!turkBorsasiIleIlgiliMi(baslik, kaynak, link, hisse, sirketAdi)) {
                        continue;
                    }

                    Map<String, String> haber = new HashMap<>();
                    haber.put("hisse",     hisse);
                    haber.put("baslik",    temizleGoogleNewsBaslik(baslik));
                    haber.put("link",      link);
                    haber.put("kaynak",    kaynak.isBlank() ? "Google News" : kaynak);
                    haber.put("tarih",     tarihFormatla(pubDate));
                    haber.put("timestamp", timestampAl(pubDate));

                    haberler.add(haber);
                    eklenenLinkler.add(link);
                }
            }

        } catch (Exception ignored) {
        }

        return haberler;
    }

    // ── Yardımcı metotlar ─────────────────────────────────────────────────────

    /** Hisse kodu ve şirket adından RSS sorgu listesi oluşturur. */
    private List<String> haberSorgulariOlustur(String hisse, String sirketAdi) {
        List<String> sorgular = new ArrayList<>();
        sorgular.add(hisse + " BIST");
        sorgular.add(hisse + " KAP");
        sorgular.add(hisse + " hisse");
        sorgular.add(hisse + " borsa");
        sorgular.add(hisse + " bilanço");
        sorgular.add(hisse + " temettü");

        if (!sirketAdi.equalsIgnoreCase(hisse)) {
            sorgular.add("\"" + sirketAdi + "\" hisse");
            sorgular.add("\"" + sirketAdi + "\" borsa");
            sorgular.add("\"" + sirketAdi + "\" KAP");
            sorgular.add("\"" + sirketAdi + "\" bilanço");
        }

        return sorgular;
    }

    /**
     * Bir haberin Türk borsasıyla ilgili olup olmadığını kontrol eder.
     * Hisse kodu veya şirket adının finansal anahtar kelimelerle birlikte
     * geçmesi ya da Türk finans kaynağından gelmesi gerekir.
     */
    private boolean turkBorsasiIleIlgiliMi(String baslik, String kaynak, String link,
                                            String hisse, String sirketAdi) {
        Locale tr = new Locale("tr", "TR");

        String text        = (baslik + " " + kaynak + " " + link).toLowerCase(tr);
        String hisseLower  = hisse.toLowerCase(tr);
        String sirketLower = sirketAdi.toLowerCase(tr);

        boolean hisseGeciyor  = text.contains(hisseLower);
        boolean sirketGeciyor = !sirketLower.equals(hisseLower)
                && sirketLowerParcalariGeciyorMu(text, sirketLower);

        boolean finansKelimesiGeciyor =
                text.contains("bist") || text.contains("borsa")  || text.contains("hisse")  ||
                text.contains("kap")  || text.contains("bilanço") || text.contains("bilanco") ||
                text.contains("temettü") || text.contains("temettu") ||
                text.contains("yatırım") || text.contains("yatirim") ||
                text.contains("pay")  || text.contains("endeks") ||
                text.contains("tavan") || text.contains("taban") ||
                text.contains("halka arz") || text.contains("sermaye") ||
                text.contains("bedelli") || text.contains("bedelsiz") ||
                text.contains("finansal") || text.contains("net kar") ||
                text.contains("kâr") || text.contains("kar");

        boolean turkFinansKaynak =
                text.contains("kap.org.tr") || text.contains("foreks") ||
                text.contains("borsa gündem") || text.contains("borsagundem") ||
                text.contains("ekonomim") || text.contains("dünya") || text.contains("dunya") ||
                text.contains("bloomberg ht") || text.contains("bigpara") ||
                text.contains("mynet finans") || text.contains("investing.com") ||
                text.contains("matriks") || text.contains("finnet") ||
                text.contains("para analiz") || text.contains("paraanaliz") ||
                text.contains("getmidas") || text.contains("fintables") ||
                text.contains("tradingview");

        boolean turkiyeBaglantisi =
                text.contains(".tr") || text.contains("türkiye") || text.contains("turkiye") ||
                text.contains("istanbul") || text.contains("bist") || turkFinansKaynak;

        if (hisseGeciyor  && (finansKelimesiGeciyor || turkiyeBaglantisi || turkFinansKaynak)) return true;
        if (sirketGeciyor && (finansKelimesiGeciyor || turkFinansKaynak))                      return true;

        return false;
    }

    /** Şirket adının anlamlı parçalarının metin içinde geçip geçmediğini kontrol eder. */
    private boolean sirketLowerParcalariGeciyorMu(String text, String sirketLower) {
        String[] parcalar = sirketLower.split(" ");
        int eslesen = 0;
        for (String p : parcalar) {
            if (p.length() >= 3 && text.contains(p)) {
                eslesen++;
            }
        }
        return eslesen >= 1;
    }

    /** XML öğesinden verilen etiketin metin içeriğini döndürür. */
    private String getXmlText(org.w3c.dom.Node item, String tagName) {
        try {
            NodeList children = ((org.w3c.dom.Element) item).getElementsByTagName(tagName);
            if (children.getLength() == 0) return "";
            return children.item(0).getTextContent();
        } catch (Exception e) {
            return "";
        }
    }

    /** Google News başlığının sonundaki kaynak adını kırpar. */
    private String temizleGoogleNewsBaslik(String baslik) {
        if (baslik == null) return "";
        int sonTire = baslik.lastIndexOf(" - ");
        return sonTire > 0 ? baslik.substring(0, sonTire).trim() : baslik.trim();
    }

    /** RFC 1123 tarihini "dd.MM.yyyy HH:mm" (İstanbul) formatına çevirir. */
    private String tarihFormatla(String pubDate) {
        try {
            ZonedDateTime   zdt       = ZonedDateTime.parse(pubDate, DateTimeFormatter.RFC_1123_DATE_TIME);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm",
                    new Locale("tr", "TR"));
            return zdt.withZoneSameInstant(java.time.ZoneId.of("Europe/Istanbul")).format(formatter);
        } catch (Exception e) {
            return "";
        }
    }

    /** RFC 1123 tarihinden epoch milisaniyesini string olarak döndürür. */
    private String timestampAl(String pubDate) {
        try {
            ZonedDateTime zdt = ZonedDateTime.parse(pubDate, DateTimeFormatter.RFC_1123_DATE_TIME);
            return String.valueOf(zdt.toInstant().toEpochMilli());
        } catch (Exception e) {
            return "0";
        }
    }
}
