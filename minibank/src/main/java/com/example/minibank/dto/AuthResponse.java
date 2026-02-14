package com.example.minibank.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String username;
    private String role;

    //  เพิ่ม 2 ฟิลด์นี้ให้หน้าโปรไฟล์เอาไปแสดง
    private String email;
    private String fullName;
}