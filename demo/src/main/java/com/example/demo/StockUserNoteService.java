package com.example.demo;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class StockUserNoteService {

    private final StockUserNoteRepository repository;
    private final UserAccountRepository userRepository;

    public StockUserNoteService(StockUserNoteRepository repository, UserAccountRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    public List<StockUserNote> getUserNotes(Long userId) {
        return repository.findByUser_Id(userId);
    }

    public Optional<StockUserNote> getUserNoteForSymbol(Long userId, String symbol) {
        if (symbol == null || symbol.trim().isEmpty()) return Optional.empty();
        return repository.findByUser_IdAndSymbolIgnoreCase(userId, symbol.trim());
    }

    public Map<String, Object> saveUserNote(Long userId, String symbol, Map<String, Object> payload) {
        if (symbol == null || symbol.trim().isEmpty()) {
            return errorResponse("Hisse sembolü boş olamaz.");
        }

        String note = payload.containsKey("note") && payload.get("note") != null ? payload.get("note").toString() : null;
        if (note != null && note.length() > 1000) {
            return errorResponse("Not 1000 karakterden uzun olamaz.");
        }

        Double targetPrice = parseDoubleSafely(payload.get("targetPrice"));
        if (targetPrice != null && targetPrice < 0) {
            return errorResponse("Hedef fiyat negatif olamaz.");
        }

        Double stopLossPrice = parseDoubleSafely(payload.get("stopLossPrice"));
        if (stopLossPrice != null && stopLossPrice < 0) {
            return errorResponse("Stop-loss fiyatı negatif olamaz.");
        }

        Optional<UserAccount> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return errorResponse("Kullanıcı bulunamadı.");
        }

        StockUserNote userNote = repository.findByUser_IdAndSymbolIgnoreCase(userId, symbol.trim())
                .orElse(new StockUserNote());

        if (userNote.getId() == null) {
            userNote.setUser(userOpt.get());
            userNote.setSymbol(symbol.trim().toUpperCase());
        }

        userNote.setNote(note);
        userNote.setTargetPrice(targetPrice);
        userNote.setStopLossPrice(stopLossPrice);

        repository.save(userNote);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Not başarıyla kaydedildi.");
        
        Map<String, Object> item = new HashMap<>();
        item.put("symbol", userNote.getSymbol());
        item.put("note", userNote.getNote());
        item.put("targetPrice", userNote.getTargetPrice());
        item.put("stopLossPrice", userNote.getStopLossPrice());
        item.put("updatedAt", userNote.getUpdatedAt());
        
        response.put("item", item);
        return response;
    }

    public Map<String, Object> deleteUserNote(Long userId, String symbol) {
        if (symbol == null || symbol.trim().isEmpty()) return errorResponse("Geçersiz sembol.");
        
        Optional<StockUserNote> noteOpt = repository.findByUser_IdAndSymbolIgnoreCase(userId, symbol.trim());
        if (noteOpt.isPresent()) {
            repository.delete(noteOpt.get());
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Not başarıyla silindi.");
            return response;
        } else {
            return errorResponse("Silinecek not bulunamadı.");
        }
    }

    private Double parseDoubleSafely(Object value) {
        if (value == null) return null;
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            String str = value.toString().trim();
            if (str.isEmpty()) return null;
            return Double.parseDouble(str);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
}
