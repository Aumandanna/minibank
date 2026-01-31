package com.example.minibank.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "password_reset_requests")
public class PasswordResetRequest {

    @Id
    @Column(length = 64)
    private String id; // resetRequestId (UUID string)

    @Column(nullable=false)
    private String email;

    @Column(nullable=false)
    private String username;

    @Column(nullable=false, length = 255)
    private String newPasswordHash;

    @Column(nullable=false, length = 255)
    private String otpHash;

    @Column(nullable=false)
    private Instant otpExpiresAt;

    @Column(nullable=false)
    private int attempts;

    @Column(nullable=false)
    private int resendCount;

    private Instant windowStartAt;

    private Instant lockedUntil;

    private Instant lastSentAt;
}