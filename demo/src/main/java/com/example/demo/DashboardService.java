package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final PortfolioService portfolioService;
    private final PriceAlertService priceAlertService;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DashboardService(PortfolioService portfolioService, PriceAlertService priceAlertService) {
        this.portfolioService = portfolioService;
        this.priceAlertService = priceAlertService;
    }

    public Map<String, Object> getPublicDashboard() {
        Map<String, Object> data = new HashMap<>();

        // BIST 100 endeks verisi
        try {
            Map<String, Object> piyasa = callApi("/api/piyasa");
            Map<String, Object> marketSummary = new HashMap<>();
            if (piyasa != null && piyasa.containsKey("endeks")) {
                marketSummary.put("endeks", piyasa.get("endeks"));
            }
            data.put("marketSummary", marketSummary);
        } catch (Exception e) {
            data.put("marketSummary", new HashMap<>());
        }

        // Genel borsa haberleri
        try {
            Map<String, Object> haberlerResp = callApi("/api/haberler?hisseler=BIST");
            if (haberlerResp != null && haberlerResp.containsKey("haberler")) {
                data.put("latestNews", haberlerResp.get("haberler"));
            } else {
                data.put("latestNews", new ArrayList<>());
            }
        } catch (Exception e) {
            data.put("latestNews", new ArrayList<>());
        }

        data.put("guest", true);
        return data;
    }

    public Map<String, Object> getUserDashboard(Long userId) {
        Map<String, Object> data = new HashMap<>();

        // Portfolio P&L Summary
        try {
            data.put("portfolioSummary", portfolioService.getPortfolioSummary(userId));
        } catch (Exception e) {
            data.put("portfolioSummary", null);
        }

        // Active Alerts
        try {
            List<PriceAlert> alerts = priceAlertService.getUserAlerts(userId).stream()
                .filter(PriceAlert::getActive).collect(Collectors.toList());
            
            List<Map<String, Object>> alertDtos = alerts.stream().map(a -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", a.getId());
                map.put("symbol", a.getSymbol());
                map.put("targetPrice", a.getTargetPrice());
                map.put("conditionType", a.getConditionType());
                map.put("active", a.getActive());
                map.put("triggered", a.getTriggered());
                return map;
            }).collect(Collectors.toList());
            
            data.put("alerts", alertDtos);
        } catch (Exception e) {
            data.put("alerts", new ArrayList<>());
        }

        // Market (BIST 100 endeks)
        try {
            Map<String, Object> piyasa = callApi("/api/piyasa");
            Map<String, Object> marketSummary = new HashMap<>();
            if (piyasa != null && piyasa.containsKey("endeks")) {
                marketSummary.put("endeks", piyasa.get("endeks"));
            }
            data.put("marketSummary", marketSummary);
        } catch (Exception e) {
            data.put("marketSummary", new HashMap<>());
        }

        // Watchlist haberler
        try {
            List<UserWatchlistItem> watchlist = portfolioService.getUserWatchlist(userId);
            String querySymbol = watchlist.isEmpty() ? "BIST" : watchlist.get(0).getSymbol();
            Map<String, Object> haberlerResp = callApi("/api/haberler?hisseler=" + URLEncoder.encode(querySymbol, StandardCharsets.UTF_8));
            if (haberlerResp != null && haberlerResp.containsKey("haberler")) {
                data.put("latestNews", haberlerResp.get("haberler"));
            } else {
                data.put("latestNews", new ArrayList<>());
            }
        } catch (Exception e) {
            data.put("latestNews", new ArrayList<>());
        }

        data.put("guest", false);
        return data;
    }

    /** Localhost API çağrısı — dış servislere Spring Bean bağımlılığı olmadan. */
    @SuppressWarnings("unchecked")
    private Map<String, Object> callApi(String path) {
        try {
            String url = "http://localhost:8080" + path;
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return objectMapper.readValue(response.body(), Map.class);
            }
        } catch (Exception ignored) {}
        return null;
    }
}
