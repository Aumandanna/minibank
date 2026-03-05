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
    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api.key:${BREVO_API_KEY:}}")
    private String apiKey;

    @Value("${brevo.from:${BREVO_FROM:}}")
    private String from;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendOtp(String toEmailRaw, String otp, String purposeTh) {

        String toEmail = (toEmailRaw == null) ? "" : toEmailRaw.trim();
        if (toEmail.isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("BREVO_API_KEY is not set");
        }

        if (from == null || from.isBlank()) {
            throw new IllegalStateException("BREVO_FROM is not set");
        }

        String purpose = (purposeTh == null || purposeTh.trim().isEmpty())
                ? "การยืนยันตัวตน"
                : purposeTh.trim();

        String subject = "MiniBank - รหัส OTP สำหรับ " + purpose;

        String html =
                "<div style='font-family:Arial,sans-serif'>" +
                        "<h2>MiniBank</h2>" +
                        "<p>รหัส OTP สำหรับ <b>" + escapeHtml(purpose) + "</b> คือ</p>" +
                        "<h1 style='letter-spacing:2px'>" + escapeHtml(otp) + "</h1>" +
                        "<p>รหัสมีอายุ " + OTP_TTL.toMinutes() + " นาที</p>" +
                        "<p><b>ห้ามบอกรหัสนี้กับผู้อื่น</b></p>" +
                        "</div>";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey);

        Map<String, Object> sender = Map.of("email", from);
        Map<String, Object> to = Map.of("email", toEmail);

        Map<String, Object> body = Map.of(
                "sender", sender,
                "to", List.of(to),
                "subject", subject,
                "htmlContent", html
        );

        try {
            restTemplate.postForEntity(
                    BREVO_URL,
                    new HttpEntity<>(body, headers),
                    String.class
            );
        } catch (RestClientResponseException e) {
            throw new RuntimeException(
                    "Send email failed (Brevo). HTTP "
                            + e.getStatusCode().value()
                            + ": "
                            + e.getResponseBodyAsString(),
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