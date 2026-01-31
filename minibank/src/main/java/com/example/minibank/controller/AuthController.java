package com.example.minibank.controller;

import com.example.minibank.dto.*;
import com.example.minibank.service.AuthService;
import com.example.minibank.service.OtpRegistrationService;
import com.example.minibank.service.PasswordResetService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final AuthService authService;
    private final OtpRegistrationService otpRegistrationService;
    private final PasswordResetService passwordResetService;

    public AuthController(
            AuthService authService,
            OtpRegistrationService otpRegistrationService,
            PasswordResetService passwordResetService
    ) {
        this.authService = authService;
        this.otpRegistrationService = otpRegistrationService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/register/request-otp")
    public Map<String, Object> requestRegisterOtp(@RequestBody RegisterOtpRequest req) {
        otpRegistrationService.requestOtp(req);
        return Map.of("ok", true, "message", "ส่ง OTP แล้ว");
    }

    @PostMapping("/register/verify-otp")
    public AuthResponse verifyRegisterOtp(@RequestBody VerifyOtpRequest req) {
        return otpRegistrationService.verifyOtp(req);
    }

    // =========================
    // ✅ Forgot Password Flow
    // =========================

    // 1) กรอก email แล้วให้แสดง username (ถ้าไม่เจอ -> แจ้งว่าไม่ผูก)
    @PostMapping("/forgot/lookup")
    public Map<String, Object> forgotLookup(@RequestBody ForgotEmailRequest req) {
        return passwordResetService.lookupByEmail(req.getEmail());
    }

    // 2) กดยืนยันหลังใส่รหัสใหม่ 2 ช่อง -> ส่ง OTP ทันที + ได้ resetRequestId
    @PostMapping("/forgot/start")
    public Map<String, Object> forgotStart(@RequestBody ForgotStartRequest req) {
        return passwordResetService.start(req.getEmail(), req.getNewPassword());
    }

    // 3) ส่ง OTP ใหม่
    @PostMapping("/forgot/resend-otp")
    public Map<String, Object> forgotResend(@RequestBody ForgotResendRequest req) {
        return passwordResetService.resend(req.getResetRequestId());
    }

    // 4) ยืนยัน OTP -> เปลี่ยนรหัส + login -> เข้า dashboard
    @PostMapping("/forgot/confirm")
    public AuthResponse forgotConfirm(@RequestBody ForgotConfirmRequest req) {
        return passwordResetService.confirm(req.getResetRequestId(), req.getOtp());
    }
}