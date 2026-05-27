package com.example.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserAccountRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // erdem@example.com kullanıcısını uygulama başlangıcında oluştur (eğer yoksa)
        if (!userRepository.existsByEmail("erdem@example.com")) {
            UserAccount demoUser = new UserAccount();
            demoUser.setFullName("Erdem");
            demoUser.setEmail("erdem@example.com");
            // Demo amaçlıdır.
            demoUser.setPasswordHash(passwordEncoder.encode("123456"));
            userRepository.save(demoUser);
            System.out.println("Demo User 'erdem@example.com' oluşturuldu.");
        }
    }
}
