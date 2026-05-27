package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PriceAlertService {

    private final PriceAlertRepository alertRepository;
    private final UserAccountRepository userRepository;

    public PriceAlertService(PriceAlertRepository alertRepository, UserAccountRepository userRepository) {
        this.alertRepository = alertRepository;
        this.userRepository = userRepository;
    }

    public List<PriceAlert> getUserAlerts(Long userId) {
        return alertRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public PriceAlert createAlert(Long userId, String symbol, Double targetPrice, String conditionType) {
        UserAccount user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PriceAlert alert = new PriceAlert();
        alert.setUser(user);
        alert.setSymbol(symbol.toUpperCase());
        alert.setTargetPrice(targetPrice);
        alert.setConditionType(conditionType); // "ABOVE" or "BELOW"
        return alertRepository.save(alert);
    }

    public void deleteAlert(Long alertId, Long userId) {
        PriceAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        
        if (!alert.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to delete this alert");
        }
        alertRepository.delete(alert);
    }

    public PriceAlert toggleAlert(Long alertId, Long userId) {
        PriceAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        
        if (!alert.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to toggle this alert");
        }
        
        alert.setActive(!alert.getActive());
        if(alert.getActive()) {
            alert.setTriggered(false);
            alert.setTriggeredAt(null);
        }
        return alertRepository.save(alert);
    }

    public void checkAndTriggerAlerts(String symbol, Double currentPrice) {
        List<PriceAlert> activeAlerts = alertRepository.findByActiveTrueAndTriggeredFalse();
        for (PriceAlert alert : activeAlerts) {
            if (alert.getSymbol().equalsIgnoreCase(symbol)) {
                boolean trigger = false;
                if ("ABOVE".equalsIgnoreCase(alert.getConditionType()) && currentPrice >= alert.getTargetPrice()) {
                    trigger = true;
                } else if ("BELOW".equalsIgnoreCase(alert.getConditionType()) && currentPrice <= alert.getTargetPrice()) {
                    trigger = true;
                }
                
                if (trigger) {
                    alert.setTriggered(true);
                    alert.setTriggeredAt(LocalDateTime.now());
                    alert.setActive(false);
                    alertRepository.save(alert);
                }
            }
        }
    }
}
