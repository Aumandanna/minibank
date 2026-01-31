package com.example.minibank.service;

import com.example.minibank.entity.User;
import com.example.minibank.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AccountService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void changePassword(String username, String oldPassword, String newPassword) {
        if (username == null || username.trim().isEmpty()) {
            throw new RuntimeException("กรุณาเข้าสู่ระบบ");
        }
        String oldPass = oldPassword == null ? "" : oldPassword;
        String newPass = newPassword == null ? "" : newPassword;

        if (oldPass.trim().isEmpty()) throw new RuntimeException("กรอกรหัสเดิม");
        if (newPass.trim().isEmpty()) throw new RuntimeException("กรอกรหัสใหม่");
        if (newPass.trim().length() < 6) throw new RuntimeException("รหัสใหม่ต้องอย่างน้อย 6 ตัวอักษร");

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้"));

        if (!passwordEncoder.matches(oldPass, user.getPasswordHash())) {
            throw new RuntimeException("รหัสเดิมไม่ถูกต้อง");
        }

        // ไม่จำเป็น แต่กันคนเผลอเปลี่ยนเป็นรหัสเดิม
        if (passwordEncoder.matches(newPass, user.getPasswordHash())) {
            throw new RuntimeException("รหัสใหม่ต้องไม่ซ้ำรหัสเดิม");
        }

        user.setPasswordHash(passwordEncoder.encode(newPass));
        userRepository.save(user);
    }
}
