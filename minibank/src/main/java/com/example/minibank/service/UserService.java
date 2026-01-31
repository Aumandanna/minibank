package com.example.minibank.service;

import com.example.minibank.dto.CreateUserRequest;
import com.example.minibank.dto.UserResponse;
import com.example.minibank.entity.User;
import com.example.minibank.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserResponse create(CreateUserRequest req) {
        User user = User.builder()
                .username(req.getUsername())
                .fullName(req.getFullName())
                .build();

        try {
            User saved = userRepository.save(user);
            return new UserResponse(saved.getId(), saved.getUsername(), saved.getFullName());
        } catch (DataIntegrityViolationException e) {
            // ส่วนใหญ่จะเกิดจาก username ซ้ำ (เพราะ unique)
            throw e;
        }
    }

    public List<UserResponse> list() {
        return userRepository.findAll()
                .stream()
                .map(u -> new UserResponse(u.getId(), u.getUsername(), u.getFullName()))
                .toList();
    }
}
