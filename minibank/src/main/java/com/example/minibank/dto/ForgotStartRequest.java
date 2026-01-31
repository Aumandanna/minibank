package com.example.minibank.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ForgotStartRequest {
    private String email;
    private String newPassword;
}