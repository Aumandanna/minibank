package com.example.minibank.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateUserRequest {

    @NotBlank(message = "username ห้ามว่าง")
    @Size(min = 3, max = 30, message = "username ต้องยาว 3-30 ตัว")
    private String username;

    @NotBlank(message = "fullName ห้ามว่าง")
    @Size(min = 2, max = 100, message = "fullName ต้องยาว 2-100 ตัว")
    private String fullName;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
}

