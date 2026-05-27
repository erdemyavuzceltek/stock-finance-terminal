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

public class NewsService {

    private final HttpClient client;
    private final StockService stockService;

    public NewsService(HttpClient client, StockService stockService) {
        this.client       = client;
        this.stockService = stockService;
    }

    public List<Map<String, String>> turkBorsaHaberAra(String hisse) {
        return haberAraGenel(haberSorgulariOlustur(hisse, stockService.sirketAdiBul(hisse)), "Türk Borsası", hisse);
    }
    
    public List<Map<String, String>> kategoriHaberAra(String kategori, String query) {
        List<String> sorgular = new ArrayList<>();
        String catName = "Genel";
        
        if ("turkBorsasi".equals(kategori)) {
            catName = "Türk Borsası";
            if (query != null && !query.isBlank()) {
                sorgular.add(query + " borsa");
                sorgular.add(query + " hisse");
                sorgular.add(query + " KAP");
            } else {
                sorgular.addAll(Arrays.asList("Borsa İstanbul", "BIST 100", "Türk borsası", "SPK", "KAP", "halka arz", "bankacılık endeksi", "sanayi endeksi"));
            }
        } else if ("genelPiyasa".equals(kategori)) {
            catName = "Genel Piyasa";
            if (query != null && !query.isBlank()) {
                sorgular.add(query + " finans");
                sorgular.add(query + " piyasa");
            } else {
                sorgular.addAll(Arrays.asList("piyasa", "ekonomi", "finans", "döviz", "altın", "küresel piyasalar"));
            }
        } else if ("ekonomi".equals(kategori)) {
            catName = "Ekonomi";
            if (query != null && !query.isBlank()) {
                sorgular.add(query + " ekonomi");
                sorgular.add(query + " TCMB");
            } else {
                sorgular.addAll(Arrays.asList("TCMB", "faiz", "enflasyon", "Türkiye ekonomisi", "Merkez Bankası", "büyüme", "cari açık"));
            }
        } else {
            if (query != null && !query.isBlank()) sorgular.add(query);
            else sorgular.add("ekonomi");
        }
        
        return haberAraGenel(sorgular, catName, null);
    }
    
    public List<Map<String, String>> cokluHisseHaberGetir(List<String> symbols, String kategoriAdi) {
        List<Map<String, String>> tumHaberler = new ArrayList<>();
        Set<String> eklenenLinkler = new HashSet<>();
        
        int count = 0;
        for (String hisse : symbols) {
            if (count >= 8) break; // max 8 sembol
            String temizHisse = stockService.temizleHisseKodu(hisse);
            if (temizHisse.isEmpty()) continue;
            
            for (Map<String, String> haber : turkBorsaHaberAra(temizHisse)) {
                String link = haber.getOrDefault("url", haber.getOrDefault("link", ""));
                if (!link.isEmpty() && eklenenLinkler.contains(link)) continue;
                if (!link.isEmpty()) eklenenLinkler.add(link);
                
                haber.put("category", kategoriAdi); // overwrite category explicitly
                tumHaberler.add(haber);
            }
            count++;
        }
        
        tumHaberler.sort((a, b) -> b.getOrDefault("timestamp", "0").compareTo(a.getOrDefault("timestamp", "0")));
        return tumHaberler;
    }

    private List<Map<String, String>> haberAraGenel(List<String> sorgular, String defaultCategory, String hisse) {
        List<Map<String, String>> haberler = new ArrayList<>();
        Set<String> eklenenLinkler = new HashSet<>();

        try {
            for (String sorgu : sorgular) {
                if (haberler.size() >= 20) break;

                String url = "https://news.google.com/rss/search?q="
                        + URLEncoder.encode(sorgu, StandardCharsets.UTF_8)
                        + "&hl=tr&gl=TR&ceid=TR:tr";

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("User-Agent", stockService.browserUserAgent())
                        .header("Accept", "application/rss+xml, application/xml, text/xml")
                        .GET()
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() < 200 || response.statusCode() >= 300) continue;

                DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                DocumentBuilder builder = factory.newDocumentBuilder();
                Document doc = builder.parse(new java.io.ByteArrayInputStream(response.body().getBytes(StandardCharsets.UTF_8)));

                NodeList items = doc.getElementsByTagName("item");

                for (int i = 0; i < items.getLength() && haberler.size() < 20; i++) {
                    org.w3c.dom.Node item = items.item(i);

                    String baslik = getXmlText(item, "title");
                    String link = getXmlText(item, "link");
                    String kaynak = getXmlText(item, "source");
                    String pubDate = getXmlText(item, "pubDate");

                    if (baslik.isBlank() || link.isBlank()) continue;
                    if (eklenenLinkler.contains(link)) continue;

                    Map<String, String> haber = new HashMap<>();
                    if (hisse != null && !hisse.isEmpty()) {
                        haber.put("symbol", hisse);
                        haber.put("hisse", hisse); // back-compat
                    }
                    haber.put("title", temizleGoogleNewsBaslik(baslik));
                    haber.put("baslik", temizleGoogleNewsBaslik(baslik)); // back-compat
                    haber.put("url", link);
                    haber.put("link", link); // back-compat
                    haber.put("source", kaynak.isBlank() ? "Google News" : kaynak);
                    haber.put("kaynak", kaynak.isBlank() ? "Google News" : kaynak); // back-compat
                    haber.put("publishedAt", tarihFormatla(pubDate));
                    haber.put("tarih", tarihFormatla(pubDate)); // back-compat
                    haber.put("timestamp", timestampAl(pubDate));
                    haber.put("category", defaultCategory);
                    
                    // Simple description extraction from description tag (often contains HTML, we'll strip basic HTML)
                    String summary = getXmlText(item, "description").replaceAll("<[^>]*>", "").trim();
                    if (summary.length() > 150) summary = summary.substring(0, 147) + "...";
                    haber.put("summary", summary);

                    haberler.add(haber);
                    eklenenLinkler.add(link);
                }
            }
        } catch (Exception ignored) {}

        haberler.sort((a, b) -> b.getOrDefault("timestamp", "0").compareTo(a.getOrDefault("timestamp", "0")));
        return haberler;
    }

    private List<String> haberSorgulariOlustur(String hisse, String sirketAdi) {
        List<String> sorgular = new ArrayList<>();
        sorgular.add(hisse + " BIST");
        sorgular.add(hisse + " KAP");
        sorgular.add(hisse + " hisse");
        if (!sirketAdi.equalsIgnoreCase(hisse)) {
            sorgular.add("\"" + sirketAdi + "\" hisse");
        }
        return sorgular;
    }

    private String getXmlText(org.w3c.dom.Node item, String tagName) {
        try {
            NodeList children = ((org.w3c.dom.Element) item).getElementsByTagName(tagName);
            if (children.getLength() == 0) return "";
            return children.item(0).getTextContent();
        } catch (Exception e) {
            return "";
        }
    }

    private String temizleGoogleNewsBaslik(String baslik) {
        if (baslik == null) return "";
        int sonTire = baslik.lastIndexOf(" - ");
        return sonTire > 0 ? baslik.substring(0, sonTire).trim() : baslik.trim();
    }

    private String tarihFormatla(String pubDate) {
        try {
            ZonedDateTime zdt = ZonedDateTime.parse(pubDate, DateTimeFormatter.RFC_1123_DATE_TIME);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm", new Locale("tr", "TR"));
            return zdt.withZoneSameInstant(java.time.ZoneId.of("Europe/Istanbul")).format(formatter);
        } catch (Exception e) {
            return "";
        }
    }

    private String timestampAl(String pubDate) {
        try {
            ZonedDateTime zdt = ZonedDateTime.parse(pubDate, DateTimeFormatter.RFC_1123_DATE_TIME);
            return String.valueOf(zdt.toInstant().toEpochMilli());
        } catch (Exception e) {
            return "0";
        }
    }
}
