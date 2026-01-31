package com.example.minibank.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ForgotResendRequest {
    private String resetRequestId;
}