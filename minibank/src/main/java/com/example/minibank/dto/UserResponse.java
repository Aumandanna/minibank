package com.example.minibank.dto;

public class UserResponse {
    private Long id;
    private String username;
    private String fullName;

    public UserResponse(Long id, String username, String fullName) {
        this.id = id;
        this.username = username;
        this.fullName = fullName;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getFullName() { return fullName; }
}
