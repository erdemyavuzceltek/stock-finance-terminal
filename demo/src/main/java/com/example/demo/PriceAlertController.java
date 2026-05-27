package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/alerts")
public class PriceAlertController {

    private final PriceAlertService alertService;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PriceAlertController(PriceAlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserAlerts(@PathVariable Long userId) {
        try {
            List<PriceAlert> alerts = alertService.getUserAlerts(userId);

            // Aktif alarmlar için güncel fiyatı kontrol et ve tetikle
            alerts.stream()
                  .filter(a -> a.getActive() && !a.getTriggered())
                  .forEach(a -> {
                      try {
                          Double price = fetchStockPrice(a.getSymbol());
                          if (price != null) {
                              alertService.checkAndTriggerAlerts(a.getSymbol(), price);
                          }
                      } catch (Exception ignored) {}
                  });

            // Tekrar çek — tetiklenmiş olabilir
            alerts = alertService.getUserAlerts(userId);

            List<Map<String, Object>> response = alerts.stream().map(a -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", a.getId());
                map.put("symbol", a.getSymbol());
                map.put("targetPrice", a.getTargetPrice());
                map.put("conditionType", a.getConditionType());
                map.put("active", a.getActive());
                map.put("triggered", a.getTriggered());
                map.put("createdAt", a.getCreatedAt().toString());
                if (a.getTriggeredAt() != null) map.put("triggeredAt", a.getTriggeredAt().toString());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("success", true, "alerts", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/{userId}")
    public ResponseEntity<?> createAlert(@PathVariable Long userId, @RequestBody Map<String, Object> req) {
        try {
            String symbol = (String) req.get("symbol");
            Double targetPrice = Double.valueOf(req.get("targetPrice").toString());
            String conditionType = (String) req.get("conditionType");

            PriceAlert alert = alertService.createAlert(userId, symbol, targetPrice, conditionType);
            return ResponseEntity.ok(Map.of("success", true, "message", "Alarm oluşturuldu", "alertId", alert.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{userId}/{alertId}")
    public ResponseEntity<?> deleteAlert(@PathVariable Long userId, @PathVariable Long alertId) {
        try {
            alertService.deleteAlert(alertId, userId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Alarm silindi"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PatchMapping("/{userId}/{alertId}/toggle")
    public ResponseEntity<?> toggleAlert(@PathVariable Long userId, @PathVariable Long alertId) {
        try {
            PriceAlert alert = alertService.toggleAlert(alertId, userId);
            return ResponseEntity.ok(Map.of("success", true, "message", "Alarm durumu güncellendi", "active", alert.getActive()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /** /api/fiyat endpoint'ini çağırarak anlık hisse fiyatını alır. */
    @SuppressWarnings("unchecked")
    private Double fetchStockPrice(String symbol) {
        try {
            String url = "http://localhost:8080/api/fiyat?hisse="
                    + URLEncoder.encode(symbol, StandardCharsets.UTF_8) + "&adet=1";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                Map<String, Object> body = objectMapper.readValue(response.body(), Map.class);
                Object fiyat = body.get("guncelFiyat");
                if (fiyat != null) return Double.valueOf(fiyat.toString());
            }
        } catch (Exception ignored) {}
        return null;
    }
}
