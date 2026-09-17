package br.com.paulosilveriomartins.iamservice.repository;

import br.com.paulosilveriomartins.iamservice.model.ActiveSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ActiveSessionRepository extends JpaRepository<ActiveSession, String> {

    List<ActiveSession> findByUserId(String userId);

    List<ActiveSession> findByUserIdOrderByCreatedAtDesc(String userId);

    List<ActiveSession> findByBffOrigin(String bffOrigin);

    List<ActiveSession> findByUserIdAndBffOrigin(String userId, String bffOrigin);

    List<ActiveSession> findByExpiresAtBefore(LocalDateTime dateTime);

    boolean existsByUserIdAndExpiresAtAfter(String userId, LocalDateTime dateTime);

    void deleteByExpiresAtBefore(LocalDateTime dateTime);

}
