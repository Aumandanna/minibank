package com.example.minibank.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final String RESEND_URL = "https://api.resend.com/emails";
    private static final Duration OTP_TTL = Duration.ofMinutes(5);

    @Value("${RESEND_API_KEY}")
    private String apiKey;

    // ใช้ domain default ของ Resend (ไม่ต้อง verify)
    @Value("${RESEND_FROM:onboarding@resend.dev}")
    private String from;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendOtp(String toEmailRaw, String otp, String purposeTh) {

        String toEmail = toEmailRaw == null ? "" : toEmailRaw.trim();
        if (toEmail.isEmpty()) {
            throw new RuntimeException("Email is empty");
        }

        String purpose = (purposeTh == null || purposeTh.trim().isEmpty())
                ? "การยืนยันตัวตน"
                : purposeTh.trim();

        String subject = "MiniBank - รหัส OTP สำหรับ" + purpose;

        String html =
                "<h2>MiniBank</h2>" +
                "<p>รหัส OTP สำหรับ <b>" + purpose + "</b></p>" +
                "<h1>" + otp + "</h1>" +
                "<p>รหัสมีอายุ " + OTP_TTL.toMinutes() + " นาที</p>" +
                "<p><b>ห้ามบอกรหัสนี้กับผู้อื่น</b></p>";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "from", from,
                "to", List.of(toEmail),
                "subject", subject,
                "html", html
        );

        try {
            restTemplate.postForEntity(
                    RESEND_URL,
                    new HttpEntity<>(body, headers),
                    String.class
            );
        } catch (RestClientResponseException e) {
            throw new RuntimeException(
                    "Send email failed (Resend): " + e.getResponseBodyAsString(),
                    e
            );
        }
    }
}
