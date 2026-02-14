package com.example.minibank.controller;

import com.example.minibank.entity.User;
import com.example.minibank.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    //  ดึง user ทั้งหมด
    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    //  เพิ่ม user ใหม่ (ใช้ทดสอบ backend ก่อน)
    @PostMapping
    public User createUser(@RequestBody User user) {
        return userRepository.save(user);
    }
}
