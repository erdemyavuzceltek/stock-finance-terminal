package com.example.demo;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AiController {

    private final GeminiService geminiService;

    public AiController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/api/ai/chat")
    public Map<String, Object> chat(@RequestBody Map<String, String> payload) {
        String message = payload.get("message");
        return geminiService.chat(message);
    }
}
