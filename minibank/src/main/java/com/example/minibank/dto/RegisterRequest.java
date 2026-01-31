package com.example.minibank.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class RegisterRequest {

    @NotBlank(message = "กรอก username")
    private String username;

    @NotBlank(message = "กรอก full name")
    private String fullName;

    @NotBlank(message = "กรอก email")
    @Email(message = "รูปแบบ email ไม่ถูกต้อง")
    private String email;

    @NotBlank(message = "กรอก password")
    private String password;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
