package com.example.minibank.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
public class MailService {

    private static final Duration OTP_TTL = Duration.ofMinutes(5);

    private final HttpClient httpClient;
    private final String resendApiKey;
    private final String resendFrom;

    public MailService(
            @Value("${RESEND_API_KEY:}") String resendApiKey,
            @Value("${RESEND_FROM:}") String resendFrom
    ) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();

        this.resendApiKey = resendApiKey == null ? "" : resendApiKey.trim();
        this.resendFrom = resendFrom == null ? "" : resendFrom.trim();
    }

    // ✅ ส่ง OTP แบบระบุ purpose (สมัครสมาชิก/ลืมรหัสผ่าน)
    public void sendOtp(String toEmail, String otp, String purposeTh) {
        String purpose = (purposeTh == null || purposeTh.trim().isEmpty())
                ? "การยืนยันตัวตน"
                : purposeTh.trim();

        if (toEmail == null || toEmail.trim().isEmpty()) {
            throw new RuntimeException("Email ปลายทางว่าง");
        }
        if (otp == null || otp.trim().isEmpty()) {
            throw new RuntimeException("OTP ว่าง");
        }

        // กันพังถ้ายังไม่ตั้งค่า ENV
        if (resendApiKey.isEmpty()) {
            throw new RuntimeException("ยังไม่ได้ตั้งค่า RESEND_API_KEY ใน Environment ของ Railway");
        }
        if (resendFrom.isEmpty()) {
            throw new RuntimeException("ยังไม่ได้ตั้งค่า RESEND_FROM (เช่น onboarding@resend.dev หรือ yourdomain) ใน Environment ของ Railway");
        }

        String subject = "MiniBank - รหัส OTP สำหรับ" + purpose;
        String text = "รหัส OTP สำหรับ" + purpose + " คือ: " + otp + "\n"
                + "รหัสมีอายุ " + OTP_TTL.toMinutes() + " นาที\n\n"
                + "ห้ามบอกรหัสนี้กับผู้อื่น";

        // Resend API ต้องการ JSON
        String jsonBody = "{"
                + "\"from\":\"" + jsonEscape(resendFrom) + "\","
                + "\"to\":[\"" + jsonEscape(toEmail.trim()) + "\"],"
                + "\"subject\":\"" + jsonEscape(subject) + "\","
                + "\"text\":\"" + jsonEscape(text) + "\""
                + "}";

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(25))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            int code = resp.statusCode();
            String body = resp.body() == null ? "" : resp.body();

            if (code < 200 || code >= 300) {
                // ให้เด้งเป็น 400 ไปที่ frontend (GlobalExceptionHandler จัดการให้แล้ว)
                throw new RuntimeException("Send email failed (Resend). HTTP " + code + " : " + body);
            }

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Send email failed (Resend): " + e.getMessage());
        }
    }

    private static String jsonEscape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }
}
