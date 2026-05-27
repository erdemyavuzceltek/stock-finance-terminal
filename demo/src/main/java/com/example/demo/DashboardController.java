package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/public")
    public ResponseEntity<?> getPublicDashboard() {
        return ResponseEntity.ok(Map.of("success", true, "data", dashboardService.getPublicDashboard()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserDashboard(@PathVariable Long userId) {
        return ResponseEntity.ok(Map.of("success", true, "data", dashboardService.getUserDashboard(userId)));
    }
}
