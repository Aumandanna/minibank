package com.example.minibank.service;

import com.example.minibank.dto.AuthResponse;
import com.example.minibank.dto.RegisterOtpRequest;
import com.example.minibank.dto.VerifyOtpRequest;
import com.example.minibank.entity.PendingRegistration;
import com.example.minibank.entity.User;
import com.example.minibank.repository.PendingRegistrationRepository;
import com.example.minibank.repository.UserRepository;
import com.example.minibank.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

@Service
public class OtpRegistrationService {

    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final int MAX_ATTEMPTS = 5;

    private static final Duration RESEND_WINDOW = Duration.ofMinutes(15);
    private static final int MAX_RESEND = 5;

    private final PendingRegistrationRepository pendingRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final MailService mailService;

    private final SecureRandom random = new SecureRandom();

    public OtpRegistrationService(
            PendingRegistrationRepository pendingRepo,
            UserRepository userRepo,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            MailService mailService
    ) {
        this.pendingRepo = pendingRepo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.mailService = mailService;
    }

    public void requestOtp(RegisterOtpRequest req) {
        String username = safe(req.getUsername());
        String fullName = safe(req.getFullName());
        String email = safe(req.getEmail());
        String password = req.getPassword() == null ? "" : req.getPassword();

        if (username.isEmpty()) throw new RuntimeException("กรอก username");
        if (fullName.isEmpty()) throw new RuntimeException("กรอก full name");
        if (email.isEmpty()) throw new RuntimeException("กรอก email");
        if (password.trim().isEmpty()) throw new RuntimeException("กรอก password");

        if (userRepo.existsByUsername(username)) throw new RuntimeException("username ซ้ำ");
        if (userRepo.existsByEmail(email)) throw new RuntimeException("email ถูกใช้งานแล้ว");

        Instant now = Instant.now();

        PendingRegistration pending = pendingRepo.findByUsername(username).orElse(null);

        if (pending != null) {
            if (pending.getLockedUntil() != null && pending.getLockedUntil().isAfter(now)) {
                throw new RuntimeException("ถูกล็อกชั่วคราว กรุณารอแล้วลองใหม่");
            }

            if (pending.getWindowStartAt() == null
                    || pending.getWindowStartAt().plus(RESEND_WINDOW).isBefore(now)) {
                pending.setWindowStartAt(now);
                pending.setResendCount(0);
            }

            if (pending.getResendCount() >= MAX_RESEND) {
                throw new RuntimeException("ส่ง OTP บ่อยเกินไป (เกิน 5 ครั้งใน 15 นาที)");
            }

            pending.setFullName(fullName);
            pending.setEmail(email);
            pending.setPasswordHash(passwordEncoder.encode(password));

            String otp = genOtp6();
            pending.setOtpHash(passwordEncoder.encode(otp));
            pending.setExpiresAt(now.plus(OTP_TTL));
            pending.setAttempts(0);
            pending.setLockedUntil(null);
            pending.setResendCount(pending.getResendCount() + 1);

            pendingRepo.save(pending);
            mailService.sendOtp(email, otp, "การสมัครสมาชิก");
            return;
        }

        String otp = genOtp6();
        PendingRegistration created = PendingRegistration.builder()
                .username(username)
                .fullName(fullName)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .otpHash(passwordEncoder.encode(otp))
                .expiresAt(now.plus(OTP_TTL))
                .attempts(0)
                .resendCount(1)
                .windowStartAt(now)
                .build();

        pendingRepo.save(created);
        mailService.sendOtp(email, otp, "การสมัครสมาชิก");
    }

    public AuthResponse verifyOtp(VerifyOtpRequest req) {
        String username = safe(req.getUsername());
        String email = safe(req.getEmail());
        String otp = req.getOtp() == null ? "" : req.getOtp().trim();

        if (username.isEmpty()) throw new RuntimeException("กรอก username");
        if (email.isEmpty()) throw new RuntimeException("กรอก email");
        if (otp.isEmpty()) throw new RuntimeException("กรอก OTP");

        PendingRegistration pending = pendingRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบรายการสมัครที่รอ OTP"));

        if (!pending.getEmail().equals(email)) throw new RuntimeException("email ไม่ตรงกับที่สมัครไว้");

        Instant now = Instant.now();

        if (pending.getLockedUntil() != null && pending.getLockedUntil().isAfter(now)) {
            throw new RuntimeException("ถูกล็อกชั่วคราว กรุณารอแล้วลองใหม่");
        }

        if (pending.getExpiresAt().isBefore(now)) {
            throw new RuntimeException("OTP หมดอายุ กรุณากดส่งใหม่");
        }

        if (pending.getAttempts() >= MAX_ATTEMPTS) {
            pending.setLockedUntil(pending.getExpiresAt());
            pendingRepo.save(pending);
            throw new RuntimeException("กรอก OTP ผิดเกินกำหนด กรุณากดส่งใหม่");
        }

        boolean ok = passwordEncoder.matches(otp, pending.getOtpHash());
        if (!ok) {
            pending.setAttempts(pending.getAttempts() + 1);
            if (pending.getAttempts() >= MAX_ATTEMPTS) pending.setLockedUntil(pending.getExpiresAt());
            pendingRepo.save(pending);
            throw new RuntimeException("OTP ไม่ถูกต้อง");
        }

        if (userRepo.existsByUsername(pending.getUsername())) throw new RuntimeException("username ซ้ำ");
        if (userRepo.existsByEmail(pending.getEmail())) throw new RuntimeException("email ถูกใช้งานแล้ว");

        User user = User.builder()
                .username(pending.getUsername())
                .fullName(pending.getFullName())
                .email(pending.getEmail())
                .passwordHash(pending.getPasswordHash())
                .role("USER")
                .build();

        User saved = userRepo.save(user);
        pendingRepo.delete(pending);

        String token = jwtUtil.generateToken(saved.getUsername(), saved.getRole());
        return new AuthResponse(token, saved.getUsername(), saved.getRole(), saved.getEmail(), saved.getFullName());
    }

    private String safe(String s) {
        return s == null ? "" : s.trim();
    }

    private String genOtp6() {
        int n = random.nextInt(900000) + 100000;
        return String.valueOf(n);
    }
}