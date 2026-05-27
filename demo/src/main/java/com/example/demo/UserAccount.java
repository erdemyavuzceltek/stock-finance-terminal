package com.example.demo;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "user_accounts")
public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "user", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<PortfolioHolding> portfolioHoldings;

    @OneToMany(mappedBy = "user", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<UserWatchlistItem> watchlistItems;

    @OneToMany(mappedBy = "user", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<PortfolioTransaction> portfolioTransactions;

    @OneToMany(mappedBy = "user", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<PriceAlert> priceAlerts;

    // --- Yeni Ayar Alanları ---
    private String profileImageUrl;
    
    private String defaultPage = "dashboard";
    
    private Boolean priceAlertNotifications = true;
    
    private Boolean portfolioNewsNotifications = true;
    
    private Boolean watchlistNewsNotifications = false;
    
    private String themePreference = "dark";

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public String getProfileImageUrl() { return profileImageUrl; }
    public void setProfileImageUrl(String profileImageUrl) { this.profileImageUrl = profileImageUrl; }
    
    public String getDefaultPage() { return defaultPage; }
    public void setDefaultPage(String defaultPage) { this.defaultPage = defaultPage; }
    
    public Boolean getPriceAlertNotifications() { return priceAlertNotifications; }
    public void setPriceAlertNotifications(Boolean priceAlertNotifications) { this.priceAlertNotifications = priceAlertNotifications; }
    
    public Boolean getPortfolioNewsNotifications() { return portfolioNewsNotifications; }
    public void setPortfolioNewsNotifications(Boolean portfolioNewsNotifications) { this.portfolioNewsNotifications = portfolioNewsNotifications; }
    
    public Boolean getWatchlistNewsNotifications() { return watchlistNewsNotifications; }
    public void setWatchlistNewsNotifications(Boolean watchlistNewsNotifications) { this.watchlistNewsNotifications = watchlistNewsNotifications; }
    
    public String getThemePreference() { return themePreference; }
    public void setThemePreference(String themePreference) { this.themePreference = themePreference; }
}
