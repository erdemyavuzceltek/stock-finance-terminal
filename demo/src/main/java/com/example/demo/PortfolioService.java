package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;

@Service
public class PortfolioService {

    private final PortfolioHoldingRepository holdingRepository;
    private final UserWatchlistItemRepository watchlistRepository;
    private final UserAccountRepository userRepository;
    private final PortfolioTransactionRepository transactionRepository;

    // Fiyat çekmek için kendi HTTP client'ı — Spring Bean olmayan StockService'e bağımlı olmadan
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PortfolioService(PortfolioHoldingRepository holdingRepository,
                            UserWatchlistItemRepository watchlistRepository,
                            UserAccountRepository userRepository,
                            PortfolioTransactionRepository transactionRepository) {
        this.holdingRepository = holdingRepository;
        this.watchlistRepository = watchlistRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    // ── PORTFOLIO ---

    public Map<String, Object> getPortfolio(Long userId) {
        if (!userRepository.existsById(userId)) return errorResponse("Kullanıcı bulunamadı.");
        List<PortfolioHolding> holdings = holdingRepository.findByUserId(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("portfolio", holdings);
        return response;
    }

    public Map<String, Object> getPortfolioSummary(Long userId) {
        if (!userRepository.existsById(userId)) return errorResponse("Kullanıcı bulunamadı.");
        List<PortfolioHolding> holdings = holdingRepository.findByUserId(userId);

        double totalCost = 0.0;
        double currentValue = 0.0;
        double dailyProfitLoss = 0.0;

        List<Map<String, Object>> enrichedHoldings = new ArrayList<>();

        for (PortfolioHolding h : holdings) {
            Map<String, Object> map = new HashMap<>();
            map.put("symbol", h.getSymbol());
            map.put("quantity", h.getQuantity());
            map.put("averagePrice", h.getAveragePrice());

            double cost = h.getQuantity() * h.getAveragePrice();
            map.put("cost", cost);
            totalCost += cost;

            Double currentPrice = null;
            Double previousClose = null;
            try {
                Map<String, Object> priceData = fetchStockPrice(h.getSymbol());
                if (priceData != null) {
                    Object sp = priceData.get("guncelFiyat");
                    if (sp != null) currentPrice = Double.valueOf(sp.toString());
                    Object pc = priceData.get("previousClose");
                    if (pc != null) previousClose = Double.valueOf(pc.toString());
                }
            } catch (Exception ignored) {}

            if (currentPrice != null && currentPrice > 0) {
                map.put("currentPrice", currentPrice);
                double currentVal = h.getQuantity() * currentPrice;
                map.put("currentValue", currentVal);
                currentValue += currentVal;

                double profitLoss = currentVal - cost;
                map.put("profitLoss", profitLoss);
                map.put("profitLossPercent", cost > 0 ? (profitLoss / cost) * 100 : 0);

                if (previousClose != null && previousClose > 0) {
                    double dailyDiff = (currentPrice - previousClose) * h.getQuantity();
                    dailyProfitLoss += dailyDiff;
                }
            } else {
                map.put("currentPrice", "-");
                map.put("currentValue", cost);
                currentValue += cost;
                map.put("profitLoss", 0.0);
                map.put("profitLossPercent", 0.0);
            }
            enrichedHoldings.add(map);
        }

        double totalProfitLoss = currentValue - totalCost;
        double totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0.0;
        double base = currentValue - dailyProfitLoss;
        double dailyProfitLossPercent = base > 0 ? (dailyProfitLoss / base) * 100 : 0.0;

        for (Map<String, Object> map : enrichedHoldings) {
            Object cv = map.get("currentValue");
            double cVal = cv instanceof Number ? ((Number) cv).doubleValue() : 0.0;
            map.put("weightPercent", currentValue > 0 ? (cVal / currentValue) * 100 : 0.0);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("totalCost", totalCost);
        response.put("currentValue", currentValue);
        response.put("totalProfitLoss", totalProfitLoss);
        response.put("totalProfitLossPercent", totalProfitLossPercent);
        response.put("dailyProfitLoss", dailyProfitLoss);
        response.put("dailyProfitLossPercent", dailyProfitLossPercent);
        response.put("holdings", enrichedHoldings);

        return response;
    }

    public Map<String, Object> buyHolding(Long userId, String symbol, Integer quantity, Double price) {
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return errorResponse("Kullanıcı bulunamadı.");
        if (quantity <= 0) return errorResponse("Geçersiz adet.");

        UserAccount user = userOpt.get();
        Optional<PortfolioHolding> holdingOpt = holdingRepository.findByUserIdAndSymbol(userId, symbol);

        if (holdingOpt.isPresent()) {
            PortfolioHolding holding = holdingOpt.get();
            int newQuantity = holding.getQuantity() + quantity;
            double totalValue = (holding.getQuantity() * holding.getAveragePrice()) + (quantity * price);
            holding.setQuantity(newQuantity);
            holding.setAveragePrice(totalValue / newQuantity);
            holdingRepository.save(holding);
        } else {
            PortfolioHolding holding = new PortfolioHolding();
            holding.setUser(user);
            holding.setSymbol(symbol);
            holding.setQuantity(quantity);
            holding.setAveragePrice(price);
            holdingRepository.save(holding);
        }

        transactionRepository.save(new PortfolioTransaction(user, symbol, "BUY", quantity, price, quantity * price));

        return getPortfolio(userId);
    }

    public Map<String, Object> sellHolding(Long userId, String symbol, Integer quantity) {
        Optional<PortfolioHolding> holdingOpt = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        if (holdingOpt.isEmpty()) return errorResponse("Portföyde bu hisse bulunmuyor.");

        PortfolioHolding holding = holdingOpt.get();
        if (quantity > holding.getQuantity()) return errorResponse("Satılmak istenen adet eldeki adetten büyük.");

        // Anlık fiyatı çekmeyi dene; alınamazsa ortalama maliyeti kullan
        double sellPrice = holding.getAveragePrice();
        try {
            Map<String, Object> priceData = fetchStockPrice(symbol);
            if (priceData != null) {
                Object sp = priceData.get("guncelFiyat");
                if (sp != null) sellPrice = Double.parseDouble(sp.toString());
            }
        } catch (Exception ignored) {}

        transactionRepository.save(new PortfolioTransaction(holding.getUser(), symbol, "SELL", quantity, sellPrice, quantity * sellPrice));

        if (quantity.equals(holding.getQuantity())) {
            holdingRepository.delete(holding);
        } else {
            holding.setQuantity(holding.getQuantity() - quantity);
            holdingRepository.save(holding);
        }

        return getPortfolio(userId);
    }

    public Map<String, Object> removeHolding(Long userId, String symbol) {
        Optional<PortfolioHolding> holdingOpt = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        holdingOpt.ifPresent(holdingRepository::delete);
        return getPortfolio(userId);
    }

    public Map<String, Object> migratePortfolio(Long userId, List<Map<String, Object>> portfolioData) {
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return errorResponse("Kullanıcı bulunamadı.");
        UserAccount user = userOpt.get();

        for (Map<String, Object> item : portfolioData) {
            String symbol = (String) item.get("symbol");
            Integer quantity = item.get("adet") != null ? Integer.valueOf(item.get("adet").toString()) : 0;
            Double price = item.get("maliyet") != null ? Double.valueOf(item.get("maliyet").toString()) : 0.0;

            if (symbol != null && quantity > 0) {
                Optional<PortfolioHolding> holdingOpt = holdingRepository.findByUserIdAndSymbol(userId, symbol);
                if (holdingOpt.isEmpty()) {
                    PortfolioHolding holding = new PortfolioHolding();
                    holding.setUser(user);
                    holding.setSymbol(symbol);
                    holding.setQuantity(quantity);
                    holding.setAveragePrice(price);
                    holdingRepository.save(holding);

                    transactionRepository.save(new PortfolioTransaction(user, symbol, "BUY", quantity, price, quantity * price));
                }
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Portföy başarıyla taşındı.");
        return response;
    }

    // ── TRANSACTIONS ---

    public List<PortfolioTransaction> getTransactions(Long userId) {
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<PortfolioTransaction> getTransactionsBySymbol(Long userId, String symbol) {
        return transactionRepository.findByUserIdAndSymbolOrderByCreatedAtDesc(userId, symbol);
    }

    // ── WATCHLIST ---

    public List<UserWatchlistItem> getUserWatchlist(Long userId) {
        return watchlistRepository.findByUserId(userId);
    }

    public Map<String, Object> getWatchlist(Long userId) {
        if (!userRepository.existsById(userId)) return errorResponse("Kullanıcı bulunamadı.");
        List<UserWatchlistItem> items = watchlistRepository.findByUserId(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("watchlist", items);
        return response;
    }

    public Map<String, Object> addToWatchlist(Long userId, String symbol) {
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return errorResponse("Kullanıcı bulunamadı.");

        Optional<UserWatchlistItem> itemOpt = watchlistRepository.findByUserIdAndSymbol(userId, symbol);
        if (itemOpt.isEmpty()) {
            UserWatchlistItem item = new UserWatchlistItem();
            item.setUser(userOpt.get());
            item.setSymbol(symbol);
            watchlistRepository.save(item);
        }

        return getWatchlist(userId);
    }

    public Map<String, Object> removeFromWatchlist(Long userId, String symbol) {
        Optional<UserWatchlistItem> itemOpt = watchlistRepository.findByUserIdAndSymbol(userId, symbol);
        itemOpt.ifPresent(watchlistRepository::delete);
        return getWatchlist(userId);
    }

    public Map<String, Object> migrateWatchlist(Long userId, List<String> symbols) {
        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return errorResponse("Kullanıcı bulunamadı.");
        UserAccount user = userOpt.get();

        for (String symbol : symbols) {
            Optional<UserWatchlistItem> itemOpt = watchlistRepository.findByUserIdAndSymbol(userId, symbol);
            if (itemOpt.isEmpty()) {
                UserWatchlistItem item = new UserWatchlistItem();
                item.setUser(user);
                item.setSymbol(symbol);
                watchlistRepository.save(item);
            }
        }
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Watchlist başarıyla taşındı.");
        return response;
    }

    // ── Fiyat çekme yardımcısı (kendi HTTP isteği; Spring Bean bağımlılığı yok) ---

    /**
     * Kendi /api/fiyat endpoint'ini çağırarak hisse fiyatını alır.
     * Fiyat alınamazsa null döner; asla exception fırlatmaz.
     */
    private Map<String, Object> fetchStockPrice(String symbol) {
        try {
            if (symbol == null || symbol.isBlank()) return null;
            String url = "http://localhost:8080/api/fiyat?hisse="
                    + URLEncoder.encode(symbol, StandardCharsets.UTF_8) + "&adet=1";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                @SuppressWarnings("unchecked")
                Map<String, Object> body = objectMapper.readValue(response.body(), Map.class);
                return body;
            }
        } catch (Exception ignored) {}
        return null;
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
}
