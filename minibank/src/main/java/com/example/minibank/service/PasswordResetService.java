package com.example.minibank.service;

import com.example.minibank.dto.AuthResponse;
import com.example.minibank.entity.PasswordResetRequest;
import com.example.minibank.entity.User;
import com.example.minibank.repository.PasswordResetRequestRepository;
import com.example.minibank.repository.UserRepository;
import com.example.minibank.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final int MAX_ATTEMPTS = 5;

    private static final Duration RESEND_WINDOW = Duration.ofMinutes(15);
    private static final int MAX_RESEND = 5;

    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);

    private final UserRepository userRepo;
    private final PasswordResetRequestRepository resetRepo;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final JwtUtil jwtUtil;

    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(
            UserRepository userRepo,
            PasswordResetRequestRepository resetRepo,
            PasswordEncoder passwordEncoder,
            MailService mailService,
            JwtUtil jwtUtil
    ) {
        this.userRepo = userRepo;
        this.resetRepo = resetRepo;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.jwtUtil = jwtUtil;
    }

    public Map<String, Object> lookupByEmail(String emailRaw) {
        String email = safe(emailRaw);
        if (email.isEmpty()) throw new RuntimeException("กรอก email");

        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("ไม่พบอีเมลนี้ในระบบ"));

        return Map.of("ok", true, "email", email, "username", user.getUsername());
    }

    public Map<String, Object> start(String emailRaw, String newPasswordRaw) {
        String email = safe(emailRaw);
        String pw = newPasswordRaw == null ? "" : newPasswordRaw;

        if (email.isEmpty()) throw new RuntimeException("กรอก email");
        if (pw.trim().isEmpty()) throw new RuntimeException("กรอกรหัสผ่านใหม่");

        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("ไม่พบอีเมลนี้ในระบบ"));

        Instant now = Instant.now();

        // ✅ repo ของคุณมี findByEmail เท่านั้น
        PasswordResetRequest rr = resetRepo.findByEmail(email).orElse(null);

        if (rr == null) {
            rr = PasswordResetRequest.builder()
                    .id(UUID.randomUUID().toString().replace("-", ""))
                    .email(email)
                    .username(user.getUsername())
                    .attempts(0)
                    .resendCount(0)
                    .windowStartAt(now)
                    .build();
        }

        if (rr.getLockedUntil() != null && rr.getLockedUntil().isAfter(now)) {
            throw new RuntimeException("ถูกล็อกชั่วคราว กรุณารอแล้วลองใหม่");
        }

        // reset window ถ้าเกิน 15 นาที
        if (rr.getWindowStartAt() == null || rr.getWindowStartAt().plus(RESEND_WINDOW).isBefore(now)) {
            rr.setWindowStartAt(now);
            rr.setResendCount(0);
        }

        if (rr.getResendCount() >= MAX_RESEND) {
            throw new RuntimeException("ส่ง OTP บ่อยเกินไป (เกิน 5 ครั้งใน 15 นาที)");
        }

        // กันกดถี่ (60s)
        if (rr.getLastSentAt() != null && rr.getLastSentAt().plus(RESEND_COOLDOWN).isAfter(now)) {
            long waitSec = Duration.between(now, rr.getLastSentAt().plus(RESEND_COOLDOWN)).getSeconds();
            throw new RuntimeException("กรุณารออีก " + waitSec + " วินาที แล้วค่อยส่ง OTP ใหม่");
        }

        rr.setNewPasswordHash(passwordEncoder.encode(pw));

        String otp = genOtp6();
        rr.setOtpHash(passwordEncoder.encode(otp));
        // ✅ entity ของคุณใช้ otpExpiresAt
        rr.setOtpExpiresAt(now.plus(OTP_TTL));

        rr.setAttempts(0);
        rr.setLockedUntil(null);

        rr.setResendCount(rr.getResendCount() + 1);
        rr.setLastSentAt(now);

        resetRepo.save(rr);

        // ✅ ห้ามมี purposeTh: ในโค้ด ต้องเป็น String ปกติ
        mailService.sendOtp(email, otp, "การเปลี่ยนรหัสผ่าน");

        return Map.of(
                "ok", true,
                "resetRequestId", rr.getId(),
                "username", user.getUsername()
        );
    }

    public Map<String, Object> resend(String resetRequestIdRaw) {
        String id = safe(resetRequestIdRaw);
        if (id.isEmpty()) throw new RuntimeException("resetRequestId หาย");

        PasswordResetRequest rr = resetRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("ไม่พบรายการ reset"));

        Instant now = Instant.now();

        if (rr.getLockedUntil() != null && rr.getLockedUntil().isAfter(now)) {
            throw new RuntimeException("ถูกล็อกชั่วคราว กรุณารอแล้วลองใหม่");
        }

        // cooldown 60s
        if (rr.getLastSentAt() != null && rr.getLastSentAt().plus(RESEND_COOLDOWN).isAfter(now)) {
            long waitSec = Duration.between(now, rr.getLastSentAt().plus(RESEND_COOLDOWN)).getSeconds();
            throw new RuntimeException("กรุณารออีก " + waitSec + " วินาที แล้วค่อยส่ง OTP ใหม่");
        }

        if (rr.getWindowStartAt() == null || rr.getWindowStartAt().plus(RESEND_WINDOW).isBefore(now)) {
            rr.setWindowStartAt(now);
            rr.setResendCount(0);
        }

        if (rr.getResendCount() >= MAX_RESEND) {
            throw new RuntimeException("ส่ง OTP บ่อยเกินไป (เกิน 5 ครั้งใน 15 นาที)");
        }

        String otp = genOtp6();
        rr.setOtpHash(passwordEncoder.encode(otp));
        rr.setOtpExpiresAt(now.plus(OTP_TTL));
        rr.setAttempts(0);
        rr.setLockedUntil(null);

        rr.setResendCount(rr.getResendCount() + 1);
        rr.setLastSentAt(now);

        resetRepo.save(rr);

        mailService.sendOtp(rr.getEmail(), otp, "การเปลี่ยนรหัสผ่าน");
        return Map.of("ok", true, "message", "ส่ง OTP ใหม่แล้ว");
    }

    public AuthResponse confirm(String resetRequestIdRaw, String otpRaw) {
        String id = safe(resetRequestIdRaw);
        String otp = safe(otpRaw);

        if (id.isEmpty()) throw new RuntimeException("resetRequestId หาย");
        if (otp.isEmpty()) throw new RuntimeException("กรอก OTP");

        PasswordResetRequest rr = resetRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("ไม่พบรายการ reset"));

        Instant now = Instant.now();

        if (rr.getLockedUntil() != null && rr.getLockedUntil().isAfter(now)) {
            throw new RuntimeException("ถูกล็อกชั่วคราว กรุณารอแล้วลองใหม่");
        }

        // ✅ ใช้ otpExpiresAt
        if (rr.getOtpExpiresAt() == null || rr.getOtpExpiresAt().isBefore(now)) {
            throw new RuntimeException("OTP หมดอายุ กรุณากดส่งใหม่");
        }

        if (rr.getAttempts() >= MAX_ATTEMPTS) {
            rr.setLockedUntil(rr.getOtpExpiresAt());
            resetRepo.save(rr);
            throw new RuntimeException("กรอก OTP ผิดเกินกำหนด กรุณากดส่งใหม่");
        }

        boolean ok = passwordEncoder.matches(otp, rr.getOtpHash());
        if (!ok) {
            rr.setAttempts(rr.getAttempts() + 1);
            if (rr.getAttempts() >= MAX_ATTEMPTS) rr.setLockedUntil(rr.getOtpExpiresAt());
            resetRepo.save(rr);
            throw new RuntimeException("OTP ไม่ถูกต้อง");
        }

        User user = userRepo.findByUsername(rr.getUsername())
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้"));

        user.setPasswordHash(rr.getNewPasswordHash());
        userRepo.save(user);

        resetRepo.delete(rr);

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());

        // ✅ ต้องมี AuthResponse 5 fields แล้วถึงจะไม่แดง
        return new AuthResponse(
                token,
                user.getUsername(),
                user.getRole(),
                user.getEmail(),
                user.getFullName()
        );
    }

    private String safe(String s) {
        return s == null ? "" : s.trim();
    }

    private String genOtp6() {
        int n = random.nextInt(900000) + 100000;
        return String.valueOf(n);
    }
}