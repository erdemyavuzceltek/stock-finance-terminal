package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user-notes")
public class StockUserNoteController {

    private final StockUserNoteService noteService;

    public StockUserNoteController(StockUserNoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping("/{userId}")
    public Map<String, Object> getUserNotes(@PathVariable Long userId) {
        List<StockUserNote> notes = noteService.getUserNotes(userId);
        List<Map<String, Object>> items = notes.stream().map(note -> Map.<String, Object>of(
                "symbol", note.getSymbol(),
                "note", note.getNote() != null ? note.getNote() : "",
                "targetPrice", note.getTargetPrice() != null ? note.getTargetPrice() : -1, // Use -1 or null based on frontend expectation, but we'll return null safely below
                "stopLossPrice", note.getStopLossPrice() != null ? note.getStopLossPrice() : -1
        )).map(map -> {
            // Need to allow null values so create mutable map
            Map<String, Object> mutableMap = new java.util.HashMap<>(map);
            StockUserNote source = notes.stream().filter(n -> n.getSymbol().equals(map.get("symbol"))).findFirst().get();
            mutableMap.put("targetPrice", source.getTargetPrice());
            mutableMap.put("stopLossPrice", source.getStopLossPrice());
            mutableMap.put("updatedAt", source.getUpdatedAt());
            return mutableMap;
        }).collect(Collectors.toList());

        return Map.of("success", true, "items", items);
    }

    @GetMapping("/{userId}/{symbol}")
    public Map<String, Object> getUserNoteForSymbol(@PathVariable Long userId, @PathVariable String symbol) {
        Optional<StockUserNote> noteOpt = noteService.getUserNoteForSymbol(userId, symbol);
        if (noteOpt.isPresent()) {
            StockUserNote note = noteOpt.get();
            Map<String, Object> item = new java.util.HashMap<>();
            item.put("symbol", note.getSymbol());
            item.put("note", note.getNote());
            item.put("targetPrice", note.getTargetPrice());
            item.put("stopLossPrice", note.getStopLossPrice());
            item.put("updatedAt", note.getUpdatedAt());
            return Map.of("success", true, "item", item);
        } else {
            return Map.of("success", false, "message", "Not bulunamadı.");
        }
    }

    @PostMapping("/{userId}/{symbol}")
    public Map<String, Object> saveUserNote(@PathVariable Long userId, @PathVariable String symbol, @RequestBody Map<String, Object> payload) {
        return noteService.saveUserNote(userId, symbol, payload);
    }

    @DeleteMapping("/{userId}/{symbol}")
    public Map<String, Object> deleteUserNote(@PathVariable Long userId, @PathVariable String symbol) {
        return noteService.deleteUserNote(userId, symbol);
    }
}
