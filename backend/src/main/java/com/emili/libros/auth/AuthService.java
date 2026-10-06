package com.emili.libros.auth;

import com.emili.libros.auth.dto.AuthResponse;
import com.emili.libros.auth.dto.LoginRequest;
import com.emili.libros.auth.dto.RegisterRequest;
import com.emili.libros.auth.dto.UserResponse;
import com.emili.libros.common.error.ConflictException;
import com.emili.libros.common.error.NotFoundException;
import com.emili.libros.common.security.JwtService;
import com.emili.libros.users.User;
import com.emili.libros.users.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByUsername(username)) {
            throw new ConflictException("El username ya está registrado");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("El email ya está registrado");
        }

        User user = userRepository.save(new User(username, email, passwordEncoder.encode(request.password())));
        return toAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Credenciales inválidas");
        }
        return toAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse me(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        return UserResponse.from(user);
    }

    private AuthResponse toAuthResponse(User user) {
        return new AuthResponse(
                jwtService.createAccessToken(user),
                "Bearer",
                jwtService.expiresInSeconds(),
                UserResponse.from(user));
    }
}
