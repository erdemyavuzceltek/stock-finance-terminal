package com.example.demo;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class UserAccountService {

    private final UserAccountRepository repository;
    private final PasswordEncoder passwordEncoder;

    public UserAccountService(UserAccountRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> register(String fullName, String email, String password) {
        Map<String, Object> response = new HashMap<>();

        if (email == null || email.trim().isEmpty()) {
            return errorResponse("Email boş olamaz.");
        }
        if (password == null || password.length() < 6) {
            return errorResponse("Şifre en az 6 karakter olmalıdır.");
        }
        if (fullName == null || fullName.trim().isEmpty()) {
            return errorResponse("Ad Soyad boş olamaz.");
        }
        if (repository.existsByEmail(email)) {
            return errorResponse("Bu email zaten kayıtlı.");
        }

        UserAccount user = new UserAccount();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));

        repository.save(user);

        response.put("success", true);
        response.put("message", "Kayıt başarılı.");
        response.put("user", Map.of(
                "id", user.getId(),
                "fullName", user.getFullName(),
                "email", user.getEmail(),
                "profileImageUrl", user.getProfileImageUrl() != null ? user.getProfileImageUrl() : "",
                "defaultPage", user.getDefaultPage()
        ));

        return response;
    }

    public Map<String, Object> login(String email, String password) {
        if (email == null || password == null) {
            return errorResponse("Email ve şifre gereklidir.");
        }

        Optional<UserAccount> userOpt = repository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return errorResponse("Giriş başarısız. Email bulunamadı.");
        }

        UserAccount user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            return errorResponse("Giriş başarısız. Şifre hatalı.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Giriş başarılı.");
        response.put("user", Map.of(
                "id", user.getId(),
                "fullName", user.getFullName(),
                "email", user.getEmail(),
                "profileImageUrl", user.getProfileImageUrl() != null ? user.getProfileImageUrl() : "",
                "defaultPage", user.getDefaultPage()
        ));

        return response;
    }

    public Map<String, Object> deleteAccount(Long userId) {
        if (!repository.existsById(userId)) {
            return errorResponse("Kullanıcı bulunamadı.");
        }
        repository.deleteById(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Hesap silindi.");
        return response;
    }

    private Map<String, Object> errorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
}
