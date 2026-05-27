package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserWatchlistItemRepository extends JpaRepository<UserWatchlistItem, Long> {
    List<UserWatchlistItem> findByUserId(Long userId);
    Optional<UserWatchlistItem> findByUserIdAndSymbol(Long userId, String symbol);
}
