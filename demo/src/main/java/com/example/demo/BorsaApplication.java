package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Stockxer uygulamasının giriş noktası.
 *
 * Uygulama mimarisi:
 *   - {@link MarketController}  – REST API endpoint'leri
 *   - {@link StockService}      – Hisse fiyatı ve liste verileri (Yahoo Finance)
 *   - {@link NewsService}       – Haber verileri (Google News RSS)
 *   - {@link DiscoverService}   – Keşfet kategorileri ve teknik analiz yardımcıları
 *   - {@link StockConstants}    – Sabit listeler ve şirket adları haritası
 */
@SpringBootApplication
public class BorsaApplication {

    public static void main(String[] args) {
        SpringApplication.run(BorsaApplication.class, args);
    }
}