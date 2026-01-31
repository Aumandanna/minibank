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
@Table(name = "pending_registrations")
public class PendingRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false, unique=true)
    private String username;

    @Column(nullable=false)
    private String fullName;

    @Column(nullable=false, unique=true)
    private String email;

    @Column(nullable=false, length = 255)
    private String passwordHash;

    @Column(nullable=false, length = 255)
    private String otpHash;

    @Column(nullable=false)
    private Instant expiresAt;

    @Column(nullable=false)
    private int attempts;

    @Column(nullable=false)
    private int resendCount;

    private Instant windowStartAt;

    private Instant lockedUntil;
}
