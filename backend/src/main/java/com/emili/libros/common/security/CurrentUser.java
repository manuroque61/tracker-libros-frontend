package com.emili.libros.common.security;

import com.emili.libros.common.error.UnauthorizedException;
import com.emili.libros.users.User;
import com.emili.libros.users.UserRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class CurrentUser {

    private final UserRepository userRepository;

    public CurrentUser(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User require(Jwt jwt) {
        String uid = jwt == null ? null : jwt.getClaimAsString("uid");
        if (uid == null || uid.isBlank()) {
            throw new UnauthorizedException("Token sin usuario");
        }
        UUID id;
        try {
            id = UUID.fromString(uid);
        } catch (IllegalArgumentException ex) {
            throw new UnauthorizedException("Token inválido");
        }
        return userRepository.findById(id)
                .orElseThrow(() -> new UnauthorizedException("Usuario no encontrado"));
    }
}
