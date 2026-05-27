package com.example.demo;

import java.util.HashMap;
import java.util.Map;

public class StockSectorMapper {

    private static final Map<String, String> SECTOR_MAP = new HashMap<>();

    static {
        // Savunma / Teknoloji
        SECTOR_MAP.put("ASELS", "Savunma / Teknoloji");
        SECTOR_MAP.put("MIATK", "Savunma / Teknoloji");
        SECTOR_MAP.put("KONTR", "Savunma / Teknoloji");
        
        // Havacılık
        SECTOR_MAP.put("THYAO", "Havacılık");
        SECTOR_MAP.put("PGSUS", "Havacılık");
        SECTOR_MAP.put("TAVHL", "Havacılık");
        SECTOR_MAP.put("DOAS", "Havacılık"); // DOAS otomotiv aslında, düzeltelim
        
        // Otomotiv
        SECTOR_MAP.put("DOAS", "Otomotiv");
        SECTOR_MAP.put("FROTO", "Otomotiv");
        SECTOR_MAP.put("TOASO", "Otomotiv");
        SECTOR_MAP.put("KARSN", "Otomotiv");
        SECTOR_MAP.put("TTRAK", "Otomotiv");
        SECTOR_MAP.put("OTKAR", "Otomotiv");

        // Demir-Çelik / Metal
        SECTOR_MAP.put("EREGL", "Demir-Çelik");
        SECTOR_MAP.put("KRDMD", "Demir-Çelik");
        SECTOR_MAP.put("KCAER", "Demir-Çelik");
        SECTOR_MAP.put("ISMEN", "Demir-Çelik"); // ISMEN finans aslında
        
        // Finans / Bankacılık
        SECTOR_MAP.put("GARAN", "Bankacılık");
        SECTOR_MAP.put("AKBNK", "Bankacılık");
        SECTOR_MAP.put("ISCTR", "Bankacılık");
        SECTOR_MAP.put("YKBNK", "Bankacılık");
        SECTOR_MAP.put("HALKB", "Bankacılık");
        SECTOR_MAP.put("VAKBN", "Bankacılık");
        SECTOR_MAP.put("TSKB", "Bankacılık");
        SECTOR_MAP.put("ISMEN", "Finans / Aracı Kurum");
        
        // Enerji
        SECTOR_MAP.put("TUPRS", "Enerji");
        SECTOR_MAP.put("ASTOR", "Enerji");
        SECTOR_MAP.put("AKSEN", "Enerji");
        SECTOR_MAP.put("ALARK", "Enerji");
        SECTOR_MAP.put("CWENE", "Enerji");
        SECTOR_MAP.put("ENJSA", "Enerji");
        SECTOR_MAP.put("EUPWR", "Enerji");
        SECTOR_MAP.put("GESAN", "Enerji");
        SECTOR_MAP.put("ODAS", "Enerji");
        SECTOR_MAP.put("PETKM", "Enerji");
        SECTOR_MAP.put("ZOREN", "Enerji");

        // Holding
        SECTOR_MAP.put("KCHOL", "Holding");
        SECTOR_MAP.put("SAHOL", "Holding");
        SECTOR_MAP.put("DOHOL", "Holding");
        SECTOR_MAP.put("AGHOL", "Holding");

        // Perakende
        SECTOR_MAP.put("BIMAS", "Perakende");
        SECTOR_MAP.put("MGROS", "Perakende");
        SECTOR_MAP.put("SOKM", "Perakende");
        SECTOR_MAP.put("MAVI", "Perakende");

        // Sanayi / Cam / Çimento
        SECTOR_MAP.put("SISE", "Sanayi / Cam");
        SECTOR_MAP.put("CIMSA", "Çimento");
        SECTOR_MAP.put("OYAKC", "Çimento");
        SECTOR_MAP.put("EGEEN", "Sanayi");
        SECTOR_MAP.put("BRYAT", "Sanayi");

        // Telekomünikasyon
        SECTOR_MAP.put("TCELL", "Telekomünikasyon");
        SECTOR_MAP.put("TTKOM", "Telekomünikasyon");
        
        // Diğer (örnek)
        SECTOR_MAP.put("GUBRF", "Tarım / Kimya");
        SECTOR_MAP.put("HEKTS", "Tarım / Kimya");
        SECTOR_MAP.put("SASA", "Kimya");
        SECTOR_MAP.put("EKGYO", "Gayrimenkul");
        SECTOR_MAP.put("ENKAI", "İnşaat / Enerji");
    }

    public static String getSector(String symbol) {
        if (symbol == null || symbol.trim().isEmpty()) return "Diğer";
        String sector = SECTOR_MAP.get(symbol.trim().toUpperCase());
        return sector != null ? sector : "Diğer";
    }
}
