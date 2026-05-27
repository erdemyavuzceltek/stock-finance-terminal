package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PortfolioAnalyticsController {

    private final PortfolioAnalyticsService analyticsService;

    public PortfolioAnalyticsController(PortfolioAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/portfolio/{userId}/sector-distribution")
    public Map<String, Object> getSectorDistribution(@PathVariable Long userId) {
        try {
            return analyticsService.getSectorDistribution(userId);
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "Sektör dağılımı hesaplanırken hata oluştu.",
                "sectors", new java.util.ArrayList<>()
            );
        }
    }

    @GetMapping("/dashboard/{userId}/daily-report")
    public Map<String, Object> getDailyPerformanceReport(@PathVariable Long userId) {
        try {
            return analyticsService.getDailyPerformanceReport(userId);
        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "Günlük rapor oluşturulurken hata oluştu."
            );
        }
    }
}
