package com.example.minibank.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangePasswordRequest {

    @NotBlank(message = "กรอกรหัสเดิม")
    private String oldPassword;

    @NotBlank(message = "กรอกรหัสใหม่")
    private String newPassword;
}
