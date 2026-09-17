package br.com.paulosilveriomartins.iamservice.controller;

import br.com.paulosilveriomartins.iamservice.config.RabbitMQConfig;
import br.com.paulosilveriomartins.iamservice.model.ActiveSession;
import br.com.paulosilveriomartins.iamservice.model.UserDevice;
import br.com.paulosilveriomartins.iamservice.repository.ActiveSessionRepository;
import br.com.paulosilveriomartins.iamservice.repository.UserDeviceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/security")
public class SecurityController {

    private static final Logger logger = LoggerFactory.getLogger(SecurityController.class);

    private final ActiveSessionRepository sessionRepository;
    private final UserDeviceRepository deviceRepository;
    private final RabbitTemplate rabbitTemplate;

    
    public SecurityController(ActiveSessionRepository sessionRepository, UserDeviceRepository deviceRepository,RabbitTemplate rabbitTemplate) {
        this.sessionRepository = sessionRepository;
        this.deviceRepository = deviceRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/devices")
    public ResponseEntity<List<UserDevice>> getUserDevices(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject(); 
        logger.info("Buscando dispositivos para o usuário: {}", userId);
        return ResponseEntity.ok(deviceRepository.findByUserId(userId));
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/sessions")
    public ResponseEntity<List<ActiveSession>> getUserSessions(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        logger.info("Buscando sessões ativas para o usuário: {}", userId);
        return ResponseEntity.ok(sessionRepository.findByUserId(userId));
    }

    @PreAuthorize("hasRole('USER')")
    @DeleteMapping("/devices/{deviceId}")
    public ResponseEntity<Void> forgetDevice(
            @PathVariable String deviceId,
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        logger.warn("Comando para esquecer dispositivo recebido: Dispositivo {} do usuário {}", deviceId, userId);

        UserDevice device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispositivo não encontrado"));

        if (!device.getUserId().equals(userId)) {
            logger.error("Tentativa de fraude! Usuário {} tentou apagar o dispositivo {} de outra pessoa.", userId, deviceId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado");
        }
        deviceRepository.deleteById(deviceId);
        logger.info("Dispositivo {} apagado com sucesso", deviceId);

        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('USER')")
    @DeleteMapping("/sessions/{sessionId}/revoke")
    public ResponseEntity<Void> revokeSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = jwt.getSubject();

        ActiveSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessão não encontrada"));
        if (!session.getUserId().equals(userId)) {
            logger.error("Tentativa de fraude! Usuário {} tentou revogar a sessão {} de outra pessoa.", userId, sessionId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado");
        }

        Map<String, String> payload = new HashMap<>();
        payload.put("sessionId", session.getSessionId());
        payload.put("userId", session.getUserId());
        payload.put("origin", session.getBffOrigin());
        
        String routingKey = "revoke.session." + session.getBffOrigin().toLowerCase();
        
        Map<String, Object> nestJsMessage = new HashMap<>();
        nestJsMessage.put("pattern", routingKey);
        nestJsMessage.put("data", payload);
        
        logger.info("Enviando comando de revogação empacotado para NestJS na routing key: {}", routingKey);
        rabbitTemplate.convertAndSend(RabbitMQConfig.SESSION_COMMANDS_EXCHANGE, routingKey, nestJsMessage);
        
        session.setStatus("REVOKED");
        sessionRepository.save(session);

        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/sessions/all")
    public ResponseEntity<List<ActiveSession>> getAllSessionsAdmin() {
        logger.warn("🚨 Admin solicitou a visualização de TODAS as sessões do sistema");
        return ResponseEntity.ok(sessionRepository.findAll());
    }
}