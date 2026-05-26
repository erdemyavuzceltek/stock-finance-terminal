package com.example.demo;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Uygulama genelinde kullanılan sabit veri listeleri:
 * - BIST 100 yedek hisse kodu listesi
 * - Şirket adları haritası
 */
public class StockConstants {

    private StockConstants() {
        // Util sınıfı - instance oluşturulamaz
    }

    /** Cache süresi: 30 dakika */
    public static final long CACHE_MS = 1000L * 60 * 30;

    /** BIST 100 için yedek hisse kodu listesi (API erişilemez olduğunda kullanılır) */
    public static final List<String> YEDEK_BIST100 = Arrays.asList(
            "AEFES", "AGHOL", "AKBNK", "AKSA", "AKSEN", "ALARK", "ANSGR", "ARCLK", "ASELS", "ASTOR",
            "BIMAS", "BRSAN", "BRYAT", "CCOLA", "CIMSA", "CWENE", "DOAS", "DOHOL", "ECILC", "EGEEN",
            "EKGYO", "ENJSA", "ENKAI", "EREGL", "EUPWR", "FROTO", "GARAN", "GENIL", "GESAN", "GUBRF",
            "HALKB", "HEKTS", "ISCTR", "ISMEN", "KARSN", "KCAER", "KCHOL", "KLSER", "KONTR", "KOZAA",
            "KOZAL", "KRDMD", "MAVI", "MGROS", "MIATK", "MPARK", "ODAS", "OTKAR", "OYAKC", "PETKM",
            "PGSUS", "REEDR", "SAHOL", "SASA", "SISE", "SOKM", "TAVHL", "TCELL", "THYAO", "TKFEN",
            "TOASO", "TSKB", "TTKOM", "TTRAK", "TUPRS", "ULKER", "VAKBN", "VESTL", "YKBNK", "ZOREN",
            "ARDYZ", "AKCNS", "AYGAZ"
    );

    /** Hisse kodu → Şirket tam adı eşleştirme tablosu */
    public static final Map<String, String> SIRKET_ADLARI = new HashMap<>();

    static {
        SIRKET_ADLARI.put("ACSEL", "Acıselsan Acıpayam Selüloz Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("ADEL", "Adel Kalemcilik Ticaret ve Sanayi A.Ş.");
        SIRKET_ADLARI.put("ADESE", "Adese Gayrimenkul Yatırım A.Ş.");
        SIRKET_ADLARI.put("AEFES", "Anadolu Efes Biracılık ve Malt Sanayii A.Ş.");
        SIRKET_ADLARI.put("AFYON", "Afyon Çimento Sanayi T.A.Ş.");
        SIRKET_ADLARI.put("AGHOL", "AG Anadolu Grubu Holding A.Ş.");
        SIRKET_ADLARI.put("AGROT", "Agrotech Yüksek Teknoloji ve Yatırım A.Ş.");
        SIRKET_ADLARI.put("AHGAZ", "Ahlatcı Doğal Gaz Dağıtım Enerji ve Yatırım A.Ş.");
        SIRKET_ADLARI.put("AKBNK", "Akbank T.A.Ş.");
        SIRKET_ADLARI.put("AKCNS", "Akçansa Çimento Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("AKENR", "Akenerji Elektrik Üretim A.Ş.");
        SIRKET_ADLARI.put("AKFGY", "Akfen Gayrimenkul Yatırım Ortaklığı A.Ş.");
        SIRKET_ADLARI.put("AKFYE", "Akfen Yenilenebilir Enerji A.Ş.");
        SIRKET_ADLARI.put("AKGRT", "Aksigorta A.Ş.");
        SIRKET_ADLARI.put("AKSA", "Aksa Akrilik Kimya Sanayii A.Ş.");
        SIRKET_ADLARI.put("AKSEN", "Aksa Enerji Üretim A.Ş.");
        SIRKET_ADLARI.put("AKSGY", "Akfen Gayrimenkul Yatırım Ortaklığı A.Ş.");
        SIRKET_ADLARI.put("AKSUE", "Aksu Enerji ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("ALARK", "Alarko Holding A.Ş.");
        SIRKET_ADLARI.put("ALBRK", "Albaraka Türk Katılım Bankası A.Ş.");
        SIRKET_ADLARI.put("ALCAR", "Alarko Carrier Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("ALCTL", "Alcatel Lucent Teletaş Telekomünikasyon A.Ş.");
        SIRKET_ADLARI.put("ALFAS", "Alfa Solar Enerji Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("ALGYO", "Alarko Gayrimenkul Yatırım Ortaklığı A.Ş.");
        SIRKET_ADLARI.put("ALKIM", "Alkim Alkali Kimya A.Ş.");
        SIRKET_ADLARI.put("ALTNY", "Altınay Savunma Teknolojileri A.Ş.");
        SIRKET_ADLARI.put("ANSGR", "Anadolu Anonim Türk Sigorta Şirketi");
        SIRKET_ADLARI.put("ARCLK", "Arçelik A.Ş.");
        SIRKET_ADLARI.put("ARDYZ", "ARD Grup Bilişim Teknolojileri A.Ş.");
        SIRKET_ADLARI.put("ASELS", "Aselsan Elektronik Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("ASTOR", "Astor Enerji A.Ş.");
        SIRKET_ADLARI.put("ASUZU", "Anadolu Isuzu Otomotiv Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("AYGAZ", "Aygaz A.Ş.");
        SIRKET_ADLARI.put("BAGFS", "Bagfaş Bandırma Gübre Fabrikaları A.Ş.");
        SIRKET_ADLARI.put("BERA", "Bera Holding A.Ş.");
        SIRKET_ADLARI.put("BIMAS", "BİM Birleşik Mağazalar A.Ş.");
        SIRKET_ADLARI.put("BIOEN", "Biotrend Çevre ve Enerji Yatırımları A.Ş.");
        SIRKET_ADLARI.put("BIZIM", "Bizim Toptan Satış Mağazaları A.Ş.");
        SIRKET_ADLARI.put("BJKAS", "Beşiktaş Futbol Yatırımları Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("BRSAN", "Borusan Birleşik Boru Fabrikaları Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("BRYAT", "Borusan Yatırım ve Pazarlama A.Ş.");
        SIRKET_ADLARI.put("BSOKE", "Batısöke Söke Çimento Sanayii T.A.Ş.");
        SIRKET_ADLARI.put("BTCIM", "Batıçim Batı Anadolu Çimento Sanayii A.Ş.");
        SIRKET_ADLARI.put("CANTE", "Çan2 Termik A.Ş.");
        SIRKET_ADLARI.put("CCOLA", "Coca-Cola İçecek A.Ş.");
        SIRKET_ADLARI.put("CIMSA", "Çimsa Çimento Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("CLEBI", "Çelebi Hava Servisi A.Ş.");
        SIRKET_ADLARI.put("CWENE", "CW Enerji Mühendislik Ticaret ve Sanayi A.Ş.");
        SIRKET_ADLARI.put("DOAS", "Doğuş Otomotiv Servis ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("DOHOL", "Doğan Şirketler Grubu Holding A.Ş.");
        SIRKET_ADLARI.put("ECILC", "Eczacıbaşı İlaç Sınai ve Finansal Yatırımlar Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("EGEEN", "Ege Endüstri ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("EKGYO", "Emlak Konut Gayrimenkul Yatırım Ortaklığı A.Ş.");
        SIRKET_ADLARI.put("ENJSA", "Enerjisa Enerji A.Ş.");
        SIRKET_ADLARI.put("ENKAI", "Enka İnşaat ve Sanayi A.Ş.");
        SIRKET_ADLARI.put("EREGL", "Ereğli Demir ve Çelik Fabrikaları T.A.Ş.");
        SIRKET_ADLARI.put("EUPWR", "Europower Enerji ve Otomasyon Teknolojileri Sanayi Ticaret A.Ş.");
        SIRKET_ADLARI.put("FENER", "Fenerbahçe Futbol A.Ş.");
        SIRKET_ADLARI.put("FROTO", "Ford Otomotiv Sanayi A.Ş.");
        SIRKET_ADLARI.put("GARAN", "Türkiye Garanti Bankası A.Ş.");
        SIRKET_ADLARI.put("GENIL", "Gen İlaç ve Sağlık Ürünleri Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("GESAN", "Girişim Elektrik Sanayi Taahhüt ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("GSRAY", "Galatasaray Sportif Sınai ve Ticari Yatırımlar A.Ş.");
        SIRKET_ADLARI.put("GUBRF", "Gübre Fabrikaları T.A.Ş.");
        SIRKET_ADLARI.put("HALKB", "Türkiye Halk Bankası A.Ş.");
        SIRKET_ADLARI.put("HEKTS", "Hektaş Ticaret T.A.Ş.");
        SIRKET_ADLARI.put("ISCTR", "Türkiye İş Bankası A.Ş.");
        SIRKET_ADLARI.put("ISMEN", "İş Yatırım Menkul Değerler A.Ş.");
        SIRKET_ADLARI.put("KARSN", "Karsan Otomotiv Sanayii ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("KCAER", "Kocaer Çelik Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("KCHOL", "Koç Holding A.Ş.");
        SIRKET_ADLARI.put("KLSER", "Kaleseramik Çanakkale Kalebodur Seramik Sanayi A.Ş.");
        SIRKET_ADLARI.put("KONTR", "Kontrolmatik Teknoloji Enerji ve Mühendislik A.Ş.");
        SIRKET_ADLARI.put("KOZAA", "Koza Anadolu Metal Madencilik İşletmeleri A.Ş.");
        SIRKET_ADLARI.put("KOZAL", "Koza Altın İşletmeleri A.Ş.");
        SIRKET_ADLARI.put("KRDMD", "Kardemir Karabük Demir Çelik Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("MAVI", "Mavi Giyim Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("MGROS", "Migros Ticaret A.Ş.");
        SIRKET_ADLARI.put("MIATK", "Mia Teknoloji A.Ş.");
        SIRKET_ADLARI.put("MPARK", "MLP Sağlık Hizmetleri A.Ş.");
        SIRKET_ADLARI.put("ODAS", "Odaş Elektrik Üretim Sanayi Ticaret A.Ş.");
        SIRKET_ADLARI.put("OTKAR", "Otokar Otomotiv ve Savunma Sanayi A.Ş.");
        SIRKET_ADLARI.put("OYAKC", "Oyak Çimento Fabrikaları A.Ş.");
        SIRKET_ADLARI.put("PETKM", "Petkim Petrokimya Holding A.Ş.");
        SIRKET_ADLARI.put("PGSUS", "Pegasus Hava Taşımacılığı A.Ş.");
        SIRKET_ADLARI.put("REEDR", "Reeder Teknoloji Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("SAHOL", "Hacı Ömer Sabancı Holding A.Ş.");
        SIRKET_ADLARI.put("SASA", "Sasa Polyester Sanayi A.Ş.");
        SIRKET_ADLARI.put("SISE", "Türkiye Şişe ve Cam Fabrikaları A.Ş.");
        SIRKET_ADLARI.put("SOKM", "Şok Marketler Ticaret A.Ş.");
        SIRKET_ADLARI.put("TAVHL", "TAV Havalimanları Holding A.Ş.");
        SIRKET_ADLARI.put("TCELL", "Turkcell İletişim Hizmetleri A.Ş.");
        SIRKET_ADLARI.put("THYAO", "Türk Hava Yolları A.O.");
        SIRKET_ADLARI.put("TKFEN", "Tekfen Holding A.Ş.");
        SIRKET_ADLARI.put("TOASO", "Tofaş Türk Otomobil Fabrikası A.Ş.");
        SIRKET_ADLARI.put("TSKB", "Türkiye Sınai Kalkınma Bankası A.Ş.");
        SIRKET_ADLARI.put("TTKOM", "Türk Telekomünikasyon A.Ş.");
        SIRKET_ADLARI.put("TTRAK", "Türk Traktör ve Ziraat Makineleri A.Ş.");
        SIRKET_ADLARI.put("TUPRS", "Tüpraş Türkiye Petrol Rafinerileri A.Ş.");
        SIRKET_ADLARI.put("ULKER", "Ülker Bisküvi Sanayi A.Ş.");
        SIRKET_ADLARI.put("VAKBN", "Türkiye Vakıflar Bankası T.A.O.");
        SIRKET_ADLARI.put("VESTL", "Vestel Elektronik Sanayi ve Ticaret A.Ş.");
        SIRKET_ADLARI.put("YKBNK", "Yapı ve Kredi Bankası A.Ş.");
        SIRKET_ADLARI.put("ZOREN", "Zorlu Enerji Elektrik Üretim A.Ş.");
    }
}
