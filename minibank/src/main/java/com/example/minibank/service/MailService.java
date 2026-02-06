package com.example.minibank.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
public class MailService {

    private static final Duration OTP_TTL = Duration.ofMinutes(5);

    @Value("${resend.api.key}")
    private String resendApiKey;

    // ✅ ต้องเป็น email ที่ Resend อนุญาต
    // ถ้ายังไม่ได้ verify domain → ใช้ onboarding@resend.dev เท่านั้น
    private static final String FROM_EMAIL = "MiniBank <onboarding@resend.dev>";

    public void sendOtp(String toEmail, String otp, String purposeTh) {
        String purpose = (purposeTh == null || purposeTh.isBlank())
                ? "การยืนยันตัวตน"
                : purposeTh;

        String text =
                "รหัส OTP สำหรับ " + purpose + " คือ: " + otp + "\n" +
                "รหัสมีอายุ " + OTP_TTL.toMinutes() + " นาที\n\n" +
                "ห้ามบอกรหัสนี้กับผู้อื่น";

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(resendApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("from", FROM_EMAIL);     // 🔥 จุดสำคัญ
        body.put("to", toEmail);          // email ผู้ใช้
        body.put("subject", "MiniBank - รหัส OTP");
        body.put("text", text);

        HttpEntity<Map<String, Object>> request =
                new HttpEntity<>(body, headers);

        restTemplate.postForEntity(
                "https://api.resend.com/emails",
                request,
                String.class
        );
    }
}
