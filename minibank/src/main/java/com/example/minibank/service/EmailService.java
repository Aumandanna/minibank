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

    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final String RESEND_URL = "https://api.resend.com/emails";

    @Value("${resend.api.key:${RESEND_API_KEY:}}")
    private String apiKey;

    @Value("${resend.from:${RESEND_FROM:onboarding@resend.dev}}")
    private String from;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendOtp(String toEmailRaw, String otp, String purposeTh) {
        String toEmail = (toEmailRaw == null) ? "" : toEmailRaw.trim();
        if (toEmail.isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }

        String purpose = (purposeTh == null || purposeTh.trim().isEmpty())
                ? "การยืนยันตัวตน"
                : purposeTh.trim();

        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("RESEND_API_KEY is not set");
        }

        String subject = "MiniBank - รหัส OTP สำหรับ" + purpose;

        String html = ""
                + "<div style='font-family:Arial,sans-serif'>"
                + "<h2>MiniBank</h2>"
                + "<p>รหัส OTP สำหรับ <b>" + escapeHtml(purpose) + "</b> คือ</p>"
                + "<h1 style='letter-spacing:2px'>" + escapeHtml(otp) + "</h1>"
                + "<p>รหัสมีอายุ " + OTP_TTL.toMinutes() + " นาที</p>"
                + "<p><b>ห้ามบอกรหัสนี้กับผู้อื่น</b></p>"
                + "</div>";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey.trim());

        // Resend ต้องการ "to" เป็น array ของ email
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
            // ใช้ getRawStatusCode() ได้ทุกเวอร์ชัน (กันแดงของคุณ)
            throw new RuntimeException(
                    "Send email failed (Resend). HTTP " + e.getStatusCode().value()
 + ": " + e.getResponseBodyAsString(),
                    e
            );
        }
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
