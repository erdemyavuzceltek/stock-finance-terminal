package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping("/{userId}/profile-image")
    public Map<String, Object> uploadProfileImage(@PathVariable Long userId, @RequestParam("file") MultipartFile file) {
        return accountService.uploadProfileImage(userId, file);
    }

    @DeleteMapping("/{userId}/profile-image")
    public Map<String, Object> removeProfileImage(@PathVariable Long userId) {
        return accountService.removeProfileImage(userId);
    }

    @PatchMapping("/{userId}/profile")
    public Map<String, Object> updateProfile(@PathVariable Long userId, @RequestBody Map<String, String> payload) {
        return accountService.updateProfile(userId, payload.get("fullName"));
    }

    @PatchMapping("/{userId}/password")
    public Map<String, Object> updatePassword(@PathVariable Long userId, @RequestBody Map<String, String> payload) {
        return accountService.updatePassword(
                userId,
                payload.get("currentPassword"),
                payload.get("newPassword"),
                payload.get("newPasswordConfirm")
        );
    }

    @PatchMapping("/{userId}/preferences")
    public Map<String, Object> updatePreferences(@PathVariable Long userId, @RequestBody Map<String, Object> payload) {
        return accountService.updatePreferences(userId, payload);
    }
}
