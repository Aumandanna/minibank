package com.example.minibank.controller;

import com.example.minibank.dto.ChangePasswordRequest;
import com.example.minibank.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    /**
     * ✅ Change password (no OTP)
     * ต้องแนบ Authorization: Bearer <token>
     * Body: { oldPassword, newPassword }
     */
    @PostMapping("/change-password")
    public Map<String, Object> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest req
    ) {
        String username = authentication == null ? null : authentication.getName();
        accountService.changePassword(username, req.getOldPassword(), req.getNewPassword());
        return Map.of("ok", true, "message", "อัปเดตรหัสผ่านสำเร็จ");
    }
}
