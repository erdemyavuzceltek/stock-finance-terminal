package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortfolioTransactionRepository extends JpaRepository<PortfolioTransaction, Long> {
    List<PortfolioTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<PortfolioTransaction> findByUserIdAndSymbolOrderByCreatedAtDesc(Long userId, String symbol);
    void deleteByUserId(Long userId);
}
