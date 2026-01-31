package com.example.minibank.service;

import com.example.minibank.dto.AuthResponse;
import com.example.minibank.dto.LoginRequest;
import com.example.minibank.dto.RegisterRequest;
import com.example.minibank.entity.User;
import com.example.minibank.repository.UserRepository;
import com.example.minibank.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(RegisterRequest req) {
        String username = req.getUsername() == null ? "" : req.getUsername().trim();
        String email = req.getEmail() == null ? "" : req.getEmail().trim();
        String fullName = req.getFullName() == null ? "" : req.getFullName().trim();
        String password = req.getPassword() == null ? "" : req.getPassword();

        if (username.isEmpty()) throw new RuntimeException("กรอก username");
        if (fullName.isEmpty()) throw new RuntimeException("กรอก full name");
        if (email.isEmpty()) throw new RuntimeException("กรอก email");
        if (password.trim().isEmpty()) throw new RuntimeException("กรอก password");

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("มีผู้ใช้ username นี้อยู่แล้ว");
        }
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("อีเมลนี้ถูกใช้งานแล้ว");
        }

        User user = User.builder()
                .username(username)
                .fullName(fullName)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role("USER")
                .build();

        User saved = userRepository.save(user);

        String token = jwtUtil.generateToken(saved.getUsername(), saved.getRole());
        return new AuthResponse(token, saved.getUsername(), saved.getRole(), saved.getEmail(), saved.getFullName());
    }

    public AuthResponse login(LoginRequest req) {
        String username = req.getUsername() == null ? "" : req.getUsername().trim();
        String password = req.getPassword() == null ? "" : req.getPassword();

        if (username.isEmpty()) throw new RuntimeException("กรอก username");
        if (password.trim().isEmpty()) throw new RuntimeException("กรอก password");

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("รหัสผ่านไม่ถูกต้อง");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return new AuthResponse(token, user.getUsername(), user.getRole(), user.getEmail(), user.getFullName());
    }
}