package com.example.minibank.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class MailService {

    @Value("${RESEND_API_KEY}")
    private String resendApiKey;

    private static final Duration OTP_TTL = Duration.ofMinutes(5);

    // ✅ ส่ง OTP ผ่าน Resend API
    public void sendOtp(String toEmail, String otp, String purposeTh) {
        String purpose = (purposeTh == null || purposeTh.isBlank())
                ? "การยืนยันตัวตน"
                : purposeTh.trim();

        String subject = "MiniBank - รหัส OTP สำหรับ" + purpose;

        String htmlBody = """
                <div style="font-family: Arial, sans-serif">
                  <h2>MiniBank</h2>
                  <p>รหัส OTP สำหรับ <b>%s</b> คือ</p>
                  <h1 style="letter-spacing: 4px">%s</h1>
                  <p>รหัสมีอายุ %d นาที</p>
                  <hr/>
                  <small>ห้ามบอกรหัสนี้กับผู้อื่น</small>
                </div>
                """.formatted(purpose, otp, OTP_TTL.toMinutes());

        try {
            String json = """
                {
                  "from": "MiniBank <onboarding@resend.dev>",
                  "to": ["%s"],
                  "subject": "%s",
                  "html": "%s"
                }
                """.formatted(
                    toEmail,
                    subject,
                    htmlBody.replace("\"", "\\\"").replace("\n", "")
                );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpClient client = HttpClient.newHttpClient();
            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 300) {
                throw new RuntimeException("Resend error: " + response.body());
            }

        } catch (Exception e) {
            throw new RuntimeException("Send email failed", e);
        }
    }
}
