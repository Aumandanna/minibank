package com.example.minibank.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RegisterOtpRequest {
    private String username;
    private String fullName;
    private String email;
    private String password;
}
