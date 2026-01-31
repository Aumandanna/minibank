package com.example.minibank.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class MailService {

    private final JavaMailSender mailSender;
    private static final Duration OTP_TTL = Duration.ofMinutes(5);

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ✅ ส่ง OTP แบบระบุ purpose (สมัครสมาชิก/ลืมรหัสผ่าน)
    public void sendOtp(String toEmail, String otp, String purposeTh) {
        String purpose = (purposeTh == null || purposeTh.trim().isEmpty()) ? "การยืนยันตัวตน" : purposeTh.trim();

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(toEmail);
        msg.setSubject("MiniBank - รหัส OTP สำหรับ" + purpose);

        msg.setText(
                "รหัส OTP สำหรับ" + purpose + " คือ: " + otp + "\n" +
                "รหัสมีอายุ " + OTP_TTL.toMinutes() + " นาที\n\n" +
                "ห้ามบอกรหัสนี้กับผู้อื่น"
        );

        mailSender.send(msg);
    }
}