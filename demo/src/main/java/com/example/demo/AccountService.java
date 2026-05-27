package com.example.demo;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AccountService {

    private final UserAccountRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final String uploadDir = "uploads/profile-images/";

    public AccountService(UserAccountRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> uploadProfileImage(Long userId, MultipartFile file) {
        if (file.isEmpty()) return errorResponse("Dosya boş.");
        if (file.getSize() > 2 * 1024 * 1024) return errorResponse("Dosya boyutu 2 MB'ı aşamaz.");
        
        String contentType = file.getContentType();
        if (contentType == null || !(contentType.equals("image/jpeg") || contentType.equals("image/png") || contentType.equals("image/webp"))) {
            return errorResponse("Sadece JPG, PNG veya WEBP yükleyebilirsiniz.");
        }

        Optional<UserAccount> userOpt = repository.findById(userId);
        if (userOpt.isEmpty()) return errorResponse("Kullanıcı bulunamadı.");

        try {
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();

            String ext = contentType.substring(contentType.indexOf("/") + 1);
            String fileName = "user-" + userId + "." + ext;
            Path path = Paths.get(uploadDir + fileName);
            Files.write(path, file.getBytes());

            UserAccount user = userOpt.get();
            String imageUrl = "/" + uploadDir + fileName;
            user.setProfileImageUrl(imageUrl);
            repository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Profil fotoğrafı güncellendi.");
            response.put("profileImageUrl", imageUrl);
            return response;

        } catch (IOException e) {
            return errorResponse("Dosya yüklenirken hata oluştu.");
        }
    }

    public Map<String, Object> removeProfileImage(Long userId) {
        Optional<UserAccount> userOpt = repository.findById(userId);
        if (userOpt.isEmpty()) return errorResponse("Kullanıcı bulunamadı.");

        UserAccount user = userOpt.get();
        if (user.getProfileImageUrl() != null) {
            try {
                Path path = Paths.get(user.getProfileImageUrl().substring(1)); // Remove leading slash
                Files.deleteIfExists(path);
            } catch (IOException e) {
                // Silinemediyse bile devam et
            }
            user.setProfileImageUrl(null);
            repository.save(user);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Profil fotoğrafı kaldırıldı.");
        return response;
    }

    public Map<String, Object> updateProfile(Long userId, String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) return errorResponse("Ad Soyad boş olamaz.");

        Optional<UserAccount> userOpt = repository.findById(userId);
        if (userOpt.isEmpty()) return errorResponse("Kullanıcı bulunamadı.");

        UserAccount user = userOpt.get();
        user.setFullName(fullName);
        repository.save(user);

        return successResponseWithUser("Profil güncellendi.", user);
    }

    public Map<String, Object> updatePassword(Long userId, String currentPassword, String newPassword, String newPasswordConfirm) {
        Optional<UserAccount> userOpt = repository.findById(userId);
        if (userOpt.isEmpty()) return errorResponse("Kullanıcı bulunamadı.");

        UserAccount user = userOpt.get();
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return errorResponse("Mevcut şifre yanlış.");
        }
        if (newPassword == null || newPassword.length() < 6) {
            return errorResponse("Yeni şifre en az 6 karakter olmalı.");
        }
        if (!newPassword.equals(newPasswordConfirm)) {
            return errorResponse("Yeni şifreler eşleşmiyor.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        repository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Şifre güncellendi.");
        return response;
    }

    public Map<String, Object> updatePreferences(Long userId, Map<String, Object> prefs) {
        Optional<UserAccount> userOpt = repository.findById(userId);
        if (userOpt.isEmpty()) return errorResponse("Kullanıcı bulunamadı.");

        UserAccount user = userOpt.get();
        if (prefs.containsKey("defaultPage")) user.setDefaultPage((String) prefs.get("defaultPage"));
        if (prefs.containsKey("priceAlertNotifications")) user.setPriceAlertNotifications((Boolean) prefs.get("priceAlertNotifications"));
        if (prefs.containsKey("portfolioNewsNotifications")) user.setPortfolioNewsNotifications((Boolean) prefs.get("portfolioNewsNotifications"));
        if (prefs.containsKey("watchlistNewsNotifications")) user.setWatchlistNewsNotifications((Boolean) prefs.get("watchlistNewsNotifications"));
        if (prefs.containsKey("themePreference")) user.setThemePreference((String) prefs.get("themePreference"));

        repository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Tercihler güncellendi.");
        response.put("preferences", Map.of(
                "defaultPage", user.getDefaultPage(),
                "priceAlertNotifications", user.getPriceAlertNotifications(),
                "portfolioNewsNotifications", user.getPortfolioNewsNotifications(),
                "watchlistNewsNotifications", user.getWatchlistNewsNotifications(),
                "themePreference", user.getThemePreference()
        ));
        return response;
    }

    private Map<String, Object> successResponseWithUser(String message, UserAccount user) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("user", Map.of(
                "id", user.getId(),
                "fullName", user.getFullName(),
                "email", user.getEmail(),
                "profileImageUrl", user.getProfileImageUrl() != null ? user.getProfileImageUrl() : "",
                "defaultPage", user.getDefaultPage()
        ));
        return response;
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
}
