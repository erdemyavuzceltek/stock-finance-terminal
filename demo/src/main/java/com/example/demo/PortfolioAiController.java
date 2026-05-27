package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/ai")
public class PortfolioAiController {

    private final GeminiService geminiService;
    private final PortfolioService portfolioService;
    private final PortfolioAnalyticsService analyticsService;
    private final StockUserNoteService noteService;

    private final PortfolioHoldingRepository holdingRepository;

    public PortfolioAiController(GeminiService geminiService, PortfolioService portfolioService,
                                 PortfolioAnalyticsService analyticsService, StockUserNoteService noteService,
                                 PortfolioHoldingRepository holdingRepository) {
        this.geminiService = geminiService;
        this.portfolioService = portfolioService;
        this.analyticsService = analyticsService;
        this.noteService = noteService;
        this.holdingRepository = holdingRepository;
    }

    @PostMapping("/portfolio-review/{userId}")
    public Map<String, Object> reviewPortfolio(@PathVariable Long userId, @RequestBody(required = false) Map<String, Boolean> payload) {
        try {
            // 1. Kullanıcının portföyünü çek
            Map<String, Object> summary = portfolioService.getPortfolioSummary(userId);
            List<PortfolioHolding> holdings = holdingRepository.findByUserId(userId);

            if (holdings == null || holdings.isEmpty()) {
                return Map.of(
                    "success", false,
                    "message", "Portföyünde hisse bulunamadığı için AI yorumu yapılamaz."
                );
            }

            // 2. Sektör dağılımını çek
            Map<String, Object> sectorData = analyticsService.getSectorDistribution(userId);
            
            // 3. Günlük raporu çek (En çok kazandıran vb. için)
            Map<String, Object> dailyReport = analyticsService.getDailyPerformanceReport(userId);

            // 4. Kullanıcı notlarını çek
            List<StockUserNote> notes = noteService.getUserNotes(userId);

            // 5. Basit bir hash/checksum üret
            String portfolioHash = generatePortfolioHash(holdings, notes);

            // 6. Prompt'u hazırla
            String prompt = buildPrompt(summary, holdings, sectorData, dailyReport, notes);

            // 7. Gemini'ye yolla
            Map<String, Object> geminiResult = geminiService.generatePortfolioReview(prompt);

            if ("basarili".equals(geminiResult.get("durum"))) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("review", geminiResult.get("cevap"));
                response.put("createdAt", new java.util.Date().toString());
                response.put("portfolioHash", portfolioHash);
                return response;
            } else {
                return Map.of(
                    "success", false,
                    "message", geminiResult.getOrDefault("mesaj", "Gemini'den yanıt alınamadı.")
                );
            }

        } catch (Exception e) {
            return Map.of(
                "success", false,
                "message", "Portföy analiz edilirken beklenmeyen bir hata oluştu: " + e.getMessage()
            );
        }
    }

    private String generatePortfolioHash(List<PortfolioHolding> holdings, List<StockUserNote> notes) {
        StringBuilder sb = new StringBuilder();
        for (PortfolioHolding h : holdings) {
            sb.append(h.getSymbol()).append(h.getQuantity()).append(h.getAveragePrice());
        }
        for (StockUserNote n : notes) {
            sb.append(n.getSymbol());
            if (n.getTargetPrice() != null) sb.append(n.getTargetPrice());
            if (n.getStopLossPrice() != null) sb.append(n.getStopLossPrice());
        }
        return Integer.toHexString(sb.toString().hashCode());
    }

    private String buildPrompt(Map<String, Object> summary, List<PortfolioHolding> holdings, 
                               Map<String, Object> sectorData, Map<String, Object> dailyReport, 
                               List<StockUserNote> notes) {
        StringBuilder sb = new StringBuilder();
        sb.append("Aşağıdaki portföy verilerini kullanarak kapsamlı, yapıcı ve temkinli bir analiz yap.\n\n");
        
        sb.append("=== Portföy Özeti ===\n");
        sb.append("Toplam Değer: ₺").append(summary.get("currentValue")).append("\n");
        sb.append("Toplam Kar/Zarar: ₺").append(summary.get("totalProfitLoss")).append(" (%").append(summary.get("profitLossPercent")).append(")\n");
        if (dailyReport.get("dailyProfitLossPercent") != null) {
            sb.append("Günlük Değişim: %").append(dailyReport.get("dailyProfitLossPercent")).append("\n");
        }

        sb.append("\n=== Hisseler ===\n");
        for (PortfolioHolding h : holdings) {
            sb.append("- ").append(h.getSymbol())
              .append(" | Adet: ").append(h.getQuantity())
              .append(" | Maliyet: ₺").append(h.getAveragePrice())
              .append("\n");
        }

        if (sectorData != null && Boolean.TRUE.equals(sectorData.get("success"))) {
            sb.append("\n=== Sektör Dağılımı ===\n");
            List<Map<String, Object>> sectors = (List<Map<String, Object>>) sectorData.get("sectors");
            if (sectors != null) {
                for (Map<String, Object> s : sectors) {
                    sb.append("- ").append(s.get("sector")).append(": %").append(s.get("weightPercent")).append("\n");
                }
            }
        }

        if (notes != null && !notes.isEmpty()) {
            sb.append("\n=== Kullanıcı Hedef & Stop Seviyeleri ===\n");
            for (StockUserNote n : notes) {
                sb.append("- ").append(n.getSymbol()).append(":");
                if (n.getTargetPrice() != null) sb.append(" Hedef ₺").append(n.getTargetPrice());
                if (n.getStopLossPrice() != null) sb.append(" Stop ₺").append(n.getStopLossPrice());
                sb.append("\n");
            }
        }

        sb.append("\nLütfen şu başlıkları içerecek şekilde kısa bir değerlendirme yaz:\n");
        sb.append("1. Genel Portföy Özeti\n");
        sb.append("2. Sektörel Dağılım ve Yoğunlaşma\n");
        sb.append("3. Risk ve Fırsat Noktaları\n");
        sb.append("4. Genel Değerlendirme\n");

        return sb.toString();
    }
}
