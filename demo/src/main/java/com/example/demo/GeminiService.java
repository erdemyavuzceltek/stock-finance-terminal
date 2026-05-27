package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

@Service
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String model;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    private static final String SYSTEM_PROMPT = 
            "Sen STOCKER AI adlı Türkçe konuşan bir finans ve borsa analiz asistanısın. " +
            "Kullanıcıya Türkçe cevap ver. " +
            "Teknik analiz, genel piyasa yorumu, haber etkisi ve hisse kavramları hakkında yardımcı ol. " +
            "Kesin al/sat/tut tavsiyesi verme. " +
            "Canlı veri elinde yoksa bunu açıkça söyle. " +
            "RSI, MACD, hareketli ortalama, hacim, destek/direnç gibi kavramları sade anlat. " +
            "Kullanıcı spesifik hisse sorarsa, elindeki veri yoksa varsayım yapma. " +
            "Her cevabın sonunda 'Yatırım tavsiyesi değildir.' uyarısını ekle.";

    public Map<String, Object> chat(String message) {
        Map<String, Object> sonuc = new HashMap<>();

        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("${GEMINI_API_KEY}")) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", "Gemini API anahtarı sunucuda yapılandırılmamış. Lütfen yöneticiyle iletişime geçin.");
            return sonuc;
        }

        if (message == null || message.trim().isEmpty()) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", "Lütfen analiz etmem için bir mesaj yaz.");
            return sonuc;
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

            // Request body oluşturma
            ObjectNode requestBody = mapper.createObjectNode();
            
            // System instruction
            ObjectNode systemInstruction = mapper.createObjectNode();
            ObjectNode sysParts = mapper.createObjectNode();
            sysParts.put("text", SYSTEM_PROMPT);
            systemInstruction.set("parts", sysParts);
            requestBody.set("system_instruction", systemInstruction);

            // Contents
            ArrayNode contentsArray = mapper.createArrayNode();
            ObjectNode contentObj = mapper.createObjectNode();
            contentObj.put("role", "user");
            
            ArrayNode partsArray = mapper.createArrayNode();
            ObjectNode partObj = mapper.createObjectNode();
            partObj.put("text", message.trim());
            partsArray.add(partObj);
            
            contentObj.set("parts", partsArray);
            contentsArray.add(contentObj);
            
            requestBody.set("contents", contentsArray);

            String requestJson = mapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode responseNode = mapper.readTree(response.body());
                JsonNode candidates = responseNode.path("candidates");
                
                if (candidates.isArray() && candidates.size() > 0) {
                    JsonNode parts = candidates.get(0).path("content").path("parts");
                    if (parts.isArray() && parts.size() > 0) {
                        String answer = parts.get(0).path("text").asText();
                        sonuc.put("durum", "basarili");
                        sonuc.put("answer", answer);
                        return sonuc;
                    }
                }
                
                sonuc.put("durum", "hata");
                sonuc.put("mesaj", "Gemini API'den geçerli bir yanıt okunamadı.");
            } else {
                sonuc.put("durum", "hata");
                sonuc.put("mesaj", "Gemini API Hatası. HTTP Kodu: " + response.statusCode());
            }

        } catch (Exception e) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", "API İletişim Hatası: " + e.getMessage());
        }

        return sonuc;
    }

    public Map<String, Object> generatePortfolioReview(String prompt) {
        Map<String, Object> sonuc = new HashMap<>();

        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("${GEMINI_API_KEY}")) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", "Gemini API anahtarı sunucuda yapılandırılmamış.");
            return sonuc;
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

            ObjectNode requestBody = mapper.createObjectNode();
            
            ObjectNode systemInstruction = mapper.createObjectNode();
            ObjectNode sysParts = mapper.createObjectNode();
            sysParts.put("text", "Sen STOCKER AI adında profesyonel bir portföy analistisin. Kullanıcının portföy verilerini analiz et. Kesin al/sat tavsiyesi verme. Kısa paragraflar halinde, madde madde Türkçe yaz. Sonuna mutlaka 'Bu yorum yatırım tavsiyesi değildir. Karar vermeden önce kendi araştırmanı yapmalısın.' uyarısı ekle.");
            systemInstruction.set("parts", sysParts);
            requestBody.set("system_instruction", systemInstruction);

            ArrayNode contentsArray = mapper.createArrayNode();
            ObjectNode contentObj = mapper.createObjectNode();
            contentObj.put("role", "user");
            
            ArrayNode partsArray = mapper.createArrayNode();
            ObjectNode partObj = mapper.createObjectNode();
            partObj.put("text", prompt);
            partsArray.add(partObj);
            
            contentObj.set("parts", partsArray);
            contentsArray.add(contentObj);
            
            requestBody.set("contents", contentsArray);

            String requestJson = mapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode responseNode = mapper.readTree(response.body());
                JsonNode candidates = responseNode.path("candidates");
                
                if (candidates.isArray() && candidates.size() > 0) {
                    JsonNode parts = candidates.get(0).path("content").path("parts");
                    if (parts.isArray() && parts.size() > 0) {
                        String answer = parts.get(0).path("text").asText();
                        sonuc.put("durum", "basarili");
                        sonuc.put("cevap", answer);
                    }
                }
            } else {
                sonuc.put("durum", "hata");
                sonuc.put("mesaj", "Gemini API Hatası. HTTP Kodu: " + response.statusCode());
            }

        } catch (Exception e) {
            sonuc.put("durum", "hata");
            sonuc.put("mesaj", "API İletişim Hatası: " + e.getMessage());
        }

        return sonuc;
    }
}
