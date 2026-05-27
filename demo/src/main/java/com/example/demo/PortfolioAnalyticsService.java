package com.example.demo;

import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioAnalyticsService {

    private final PortfolioHoldingRepository holdingRepository;
    private final StockService stockService;

    public PortfolioAnalyticsService(PortfolioHoldingRepository holdingRepository) {
        this.holdingRepository = holdingRepository;
        this.stockService = new StockService(java.net.http.HttpClient.newHttpClient(), new com.fasterxml.jackson.databind.ObjectMapper());
    }

    public Map<String, Object> getSectorDistribution(Long userId) {
        List<PortfolioHolding> holdings = holdingRepository.findByUserId(userId);
        
        if (holdings == null || holdings.isEmpty()) {
            return Map.of(
                "success", true,
                "totalValue", 0.0,
                "sectors", new ArrayList<>(),
                "emptyReason", "NO_PORTFOLIO",
                "message", "Portföyünde henüz hisse yok."
            );
        }

        double totalPortfolioValue = 0.0;
        Map<String, SectorData> sectorMap = new HashMap<>();

        for (PortfolioHolding h : holdings) {
            String symbol = h.getSymbol();
            double quantity = h.getQuantity();
            
            // Güncel fiyatı al, yoksa ortalama maliyetten devam et
            Double currentPrice = null;
            try {
                Map<String, Object> stockData = stockService.hisseOzetGetir(symbol);
                if (stockData != null && stockData.get("sonFiyat") != null) {
                    currentPrice = Double.parseDouble(stockData.get("sonFiyat").toString());
                }
            } catch (Exception e) {
                // Ignore, fallback to averagePrice
            }

            double priceToUse = currentPrice != null ? currentPrice : h.getAveragePrice();
            double value = priceToUse * quantity;
            totalPortfolioValue += value;

            String sectorName = StockSectorMapper.getSector(symbol);
            
            SectorData sData = sectorMap.computeIfAbsent(sectorName, k -> new SectorData(sectorName));
            sData.addValue(value);
            sData.addSymbol(symbol);
        }

        List<Map<String, Object>> sectorList = new ArrayList<>();
        for (SectorData sData : sectorMap.values()) {
            Map<String, Object> map = new HashMap<>();
            map.put("sector", sData.name);
            map.put("value", sData.value);
            double weight = totalPortfolioValue > 0 ? (sData.value / totalPortfolioValue) * 100.0 : 0.0;
            map.put("weightPercent", weight);
            map.put("holdingCount", sData.symbols.size());
            map.put("symbols", sData.symbols);
            sectorList.add(map);
        }

        // Değere göre büyükten küçüğe sırala
        sectorList.sort((a, b) -> Double.compare((Double) b.get("value"), (Double) a.get("value")));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("totalValue", totalPortfolioValue);
        response.put("sectors", sectorList);
        return response;
    }

    public Map<String, Object> getDailyPerformanceReport(Long userId) {
        List<PortfolioHolding> holdings = holdingRepository.findByUserId(userId);
        
        if (holdings == null || holdings.isEmpty()) {
            return Map.of(
                "success", true,
                "emptyReason", "NO_PORTFOLIO",
                "message", "Portföyünde henüz hisse yok."
            );
        }

        double totalValue = 0.0;
        double totalCost = 0.0;
        double dailyProfitLoss = 0.0;
        double previousTotalValue = 0.0;

        Map<String, Object> bestPerformer = null;
        double maxChangePercent = -Double.MAX_VALUE;

        Map<String, Object> worstPerformer = null;
        double minChangePercent = Double.MAX_VALUE;

        for (PortfolioHolding h : holdings) {
            String symbol = h.getSymbol();
            double quantity = h.getQuantity();
            double avgPrice = h.getAveragePrice();
            
            totalCost += avgPrice * quantity;

            Double currentPrice = null;
            Double changePercent = null;
            
            try {
                Map<String, Object> stockData = stockService.hisseOzetGetir(symbol);
                if (stockData != null && stockData.get("sonFiyat") != null) {
                    currentPrice = Double.parseDouble(stockData.get("sonFiyat").toString());
                }
                if (stockData != null && stockData.get("degisimYuzde") != null) {
                    changePercent = Double.parseDouble(stockData.get("degisimYuzde").toString());
                }
            } catch (Exception e) {
                // Ignore
            }

            if (currentPrice == null) currentPrice = avgPrice;
            if (changePercent == null) changePercent = 0.0;

            double currentValue = currentPrice * quantity;
            totalValue += currentValue;
            
            // Önceki kapanış fiyatını bulalım
            // currentPrice = previousPrice * (1 + changePercent/100) -> previousPrice = currentPrice / (1 + changePercent/100)
            double previousPrice = currentPrice / (1 + (changePercent / 100.0));
            previousTotalValue += previousPrice * quantity;

            double holdingDailyProfitLoss = currentValue - (previousPrice * quantity);

            if (changePercent > maxChangePercent) {
                maxChangePercent = changePercent;
                bestPerformer = Map.of(
                    "symbol", symbol,
                    "changePercent", changePercent,
                    "profitLoss", holdingDailyProfitLoss
                );
            }

            if (changePercent < minChangePercent) {
                minChangePercent = changePercent;
                worstPerformer = Map.of(
                    "symbol", symbol,
                    "changePercent", changePercent,
                    "profitLoss", holdingDailyProfitLoss
                );
            }
        }

        dailyProfitLoss = totalValue - previousTotalValue;
        double dailyProfitLossPercent = previousTotalValue > 0 ? (dailyProfitLoss / previousTotalValue) * 100.0 : 0.0;
        
        double totalProfitLoss = totalValue - totalCost;
        double totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100.0 : 0.0;

        String summaryText = generateSummaryText(dailyProfitLossPercent, bestPerformer, worstPerformer);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("portfolioValue", totalValue);
        response.put("dailyProfitLoss", dailyProfitLoss);
        response.put("dailyProfitLossPercent", dailyProfitLossPercent);
        response.put("totalProfitLoss", totalProfitLoss);
        response.put("totalProfitLossPercent", totalProfitLossPercent);
        
        if (bestPerformer != null) response.put("bestPerformer", bestPerformer);
        if (worstPerformer != null) response.put("worstPerformer", worstPerformer);
        
        response.put("summaryText", summaryText);
        
        // Aktif alarm count (Opsiyonel, basitlik için 0 dönebiliriz veya PriceAlertRepository inject edebiliriz)
        // Şimdilik 0 diyelim.
        response.put("activeAlertCount", 0);

        return response;
    }

    private String generateSummaryText(double dailyProfitLossPercent, Map<String, Object> best, Map<String, Object> worst) {
        StringBuilder sb = new StringBuilder();
        
        if (dailyProfitLossPercent > 0) {
            sb.append(String.format("Bugün portföyün %%%.2f yükseldi. ", dailyProfitLossPercent));
        } else if (dailyProfitLossPercent < 0) {
            sb.append(String.format("Bugün portföyün %%%.2f düştü. ", Math.abs(dailyProfitLossPercent)));
        } else {
            sb.append("Bugün portföyün yatay seyretti. ");
        }

        if (best != null && (Double) best.get("changePercent") > 0) {
            sb.append(String.format("En çok katkı sağlayan hisse %s oldu. ", best.get("symbol")));
        }

        if (worst != null && (Double) worst.get("changePercent") < 0) {
            sb.append(String.format("En zayıf performans %s tarafında.", worst.get("symbol")));
        }

        return sb.toString().trim();
    }

    private static class SectorData {
        String name;
        double value;
        List<String> symbols;

        SectorData(String name) {
            this.name = name;
            this.value = 0.0;
            this.symbols = new ArrayList<>();
        }

        void addValue(double v) {
            this.value += v;
        }

        void addSymbol(String s) {
            if (!this.symbols.contains(s)) {
                this.symbols.add(s);
            }
        }
    }
}
