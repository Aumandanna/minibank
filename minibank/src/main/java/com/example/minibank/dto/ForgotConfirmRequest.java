package com.example.minibank.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ForgotConfirmRequest {
    private String resetRequestId;
    private String otp;
}