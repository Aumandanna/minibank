package com.example.minibank.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class VerifyOtpRequest {
    private String username;
    private String email;
    private String otp;
}
