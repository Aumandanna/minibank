package com.example.minibank.repository;

import com.example.minibank.entity.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, String> {
    Optional<PasswordResetRequest> findByEmail(String email);
}