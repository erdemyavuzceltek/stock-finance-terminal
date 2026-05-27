package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PortfolioHoldingRepository extends JpaRepository<PortfolioHolding, Long> {
    List<PortfolioHolding> findByUserId(Long userId);
    Optional<PortfolioHolding> findByUserIdAndSymbol(Long userId, String symbol);
}
