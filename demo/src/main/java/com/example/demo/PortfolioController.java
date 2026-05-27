package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @GetMapping("/{userId}")
    public Map<String, Object> getPortfolio(@PathVariable Long userId) {
        return portfolioService.getPortfolio(userId);
    }

    @GetMapping("/{userId}/summary")
    public Map<String, Object> getPortfolioSummary(@PathVariable Long userId) {
        return portfolioService.getPortfolioSummary(userId);
    }

    @GetMapping("/{userId}/transactions")
    public Map<String, Object> getTransactions(@PathVariable Long userId, @RequestParam(required = false) String symbol) {
        if (symbol != null && !symbol.isEmpty()) {
            return Map.of("success", true, "transactions", portfolioService.getTransactionsBySymbol(userId, symbol));
        }
        return Map.of("success", true, "transactions", portfolioService.getTransactions(userId));
    }

    @PostMapping("/{userId}/buy")
    public Map<String, Object> buyHolding(@PathVariable Long userId, @RequestBody Map<String, Object> payload) {
        String symbol = (String) payload.get("symbol");
        Integer quantity = payload.get("quantity") != null ? Integer.valueOf(payload.get("quantity").toString()) : 0;
        Double price = payload.get("price") != null ? Double.valueOf(payload.get("price").toString()) : 0.0;
        return portfolioService.buyHolding(userId, symbol, quantity, price);
    }

    @PostMapping("/{userId}/sell")
    public Map<String, Object> sellHolding(@PathVariable Long userId, @RequestBody Map<String, Object> payload) {
        String symbol = (String) payload.get("symbol");
        Integer quantity = payload.get("quantity") != null ? Integer.valueOf(payload.get("quantity").toString()) : 0;
        return portfolioService.sellHolding(userId, symbol, quantity);
    }

    @DeleteMapping("/{userId}/holding/{symbol}")
    public Map<String, Object> removeHolding(@PathVariable Long userId, @PathVariable String symbol) {
        return portfolioService.removeHolding(userId, symbol);
    }

    @PostMapping("/{userId}/migrate")
    public Map<String, Object> migratePortfolio(@PathVariable Long userId, @RequestBody List<Map<String, Object>> portfolioData) {
        return portfolioService.migratePortfolio(userId, portfolioData);
    }

    // --- Watchlist Endpoints ---

    @GetMapping("/{userId}/watchlist")
    public Map<String, Object> getWatchlist(@PathVariable Long userId) {
        return portfolioService.getWatchlist(userId);
    }

    @PostMapping("/{userId}/watchlist/add")
    public Map<String, Object> addToWatchlist(@PathVariable Long userId, @RequestBody Map<String, String> payload) {
        String symbol = payload.get("symbol");
        return portfolioService.addToWatchlist(userId, symbol);
    }

    @DeleteMapping("/{userId}/watchlist/remove/{symbol}")
    public Map<String, Object> removeFromWatchlist(@PathVariable Long userId, @PathVariable String symbol) {
        return portfolioService.removeFromWatchlist(userId, symbol);
    }

    @PostMapping("/{userId}/watchlist/migrate")
    public Map<String, Object> migrateWatchlist(@PathVariable Long userId, @RequestBody List<String> symbols) {
        return portfolioService.migrateWatchlist(userId, symbols);
    }
}
