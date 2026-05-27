package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StockUserNoteRepository extends JpaRepository<StockUserNote, Long> {
    Optional<StockUserNote> findByUser_IdAndSymbolIgnoreCase(Long userId, String symbol);
    List<StockUserNote> findByUser_Id(Long userId);
    List<StockUserNote> findByUser_IdAndSymbolIn(Long userId, List<String> symbols);
}
