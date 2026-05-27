package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.net.http.HttpClient;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService newsService;
    private final PortfolioService portfolioService;

    public NewsController(PortfolioService portfolioService) {
        HttpClient client = HttpClient.newHttpClient();
        StockService stockService = new StockService(client, new com.fasterxml.jackson.databind.ObjectMapper());
        this.newsService = new NewsService(client, stockService);
        this.portfolioService = portfolioService;
    }

    @GetMapping("/category")
    public Map<String, Object> getCategoryNews(@RequestParam String category) {
        Map<String, Object> result = new HashMap<>();
        try {
            List<Map<String, String>> items = newsService.kategoriHaberAra(category, null);
            result.put("success", true);
            result.put("category", category);
            result.put("items", items);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Haberler alınırken bir sorun oluştu.");
            result.put("items", new ArrayList<>());
        }
        return result;
    }

    @GetMapping("/search")
    public Map<String, Object> searchNews(
            @RequestParam String category,
            @RequestParam String q) {
        Map<String, Object> result = new HashMap<>();
        try {
            List<Map<String, String>> items = newsService.kategoriHaberAra(category, q);
            result.put("success", true);
            result.put("category", category);
            result.put("items", items);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Haberler alınırken bir sorun oluştu.");
            result.put("items", new ArrayList<>());
        }
        return result;
    }

    @GetMapping("/portfolio/{userId}")
    public Map<String, Object> getPortfolioNews(@PathVariable Long userId) {
        Map<String, Object> result = new HashMap<>();
        try {
            List<String> symbols = getPortfolioSymbols(userId);
            List<Map<String, String>> items;
            if (symbols.isEmpty()) {
                items = new ArrayList<>();
                result.put("emptyReason", "NO_PORTFOLIO_HOLDINGS");
                result.put("message", "Portföyünde henüz hisse yok.");
            } else {
                items = newsService.cokluHisseHaberGetir(symbols, "Portföyüm");
            }
            result.put("success", true);
            result.put("category", "portfoyum");
            result.put("items", items);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Haberler alınırken bir sorun oluştu.");
            result.put("items", new ArrayList<>());
        }
        return result;
    }

    @GetMapping("/watchlist/{userId}")
    public Map<String, Object> getWatchlistNews(@PathVariable Long userId) {
        Map<String, Object> result = new HashMap<>();
        try {
            List<String> symbols = getWatchlistSymbols(userId);
            List<Map<String, String>> items;
            if (symbols.isEmpty()) {
                items = new ArrayList<>();
                result.put("emptyReason", "NO_WATCHLIST_ITEMS");
                result.put("message", "Watchlist'in boş.");
            } else {
                items = newsService.cokluHisseHaberGetir(symbols, "Watchlist");
            }
            result.put("success", true);
            result.put("category", "watchlist");
            result.put("items", items);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Haberler alınırken bir sorun oluştu.");
            result.put("items", new ArrayList<>());
        }
        return result;
    }

    private List<String> getPortfolioSymbols(Long userId) {
        Map<String, Object> portfolioData = portfolioService.getPortfolio(userId);
        if (!Boolean.TRUE.equals(portfolioData.get("success"))) return new ArrayList<>();
        
        Object portfolioList = portfolioData.get("portfolio");
        if (!(portfolioList instanceof List)) return new ArrayList<>();
        
        List<PortfolioHolding> items = (List<PortfolioHolding>) portfolioList;
        return items.stream()
                .map(PortfolioHolding::getSymbol)
                .distinct()
                .limit(8)
                .collect(Collectors.toList());
    }

    private List<String> getWatchlistSymbols(Long userId) {
        Map<String, Object> watchlistData = portfolioService.getWatchlist(userId);
        if (!Boolean.TRUE.equals(watchlistData.get("success"))) return new ArrayList<>();
        
        Object watchlistList = watchlistData.get("watchlist");
        if (!(watchlistList instanceof List)) return new ArrayList<>();
        
        List<UserWatchlistItem> items = (List<UserWatchlistItem>) watchlistList;
        return items.stream()
                .map(UserWatchlistItem::getSymbol)
                .distinct()
                .limit(8)
                .collect(Collectors.toList());
    }
}
