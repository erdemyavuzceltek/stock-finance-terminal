package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserAccountService userService;

    public AuthController(UserAccountService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> payload) {
        return userService.register(
                payload.get("fullName"),
                payload.get("email"),
                payload.get("password")
        );
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> payload) {
        return userService.login(
                payload.get("email"),
                payload.get("password")
        );
    }

    @DeleteMapping("/account/{userId}")
    public Map<String, Object> deleteAccount(@PathVariable Long userId) {
        return userService.deleteAccount(userId);
    }
}
