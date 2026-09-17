package br.com.paulosilveriomartins.iamservice.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import br.com.paulosilveriomartins.iamservice.dto.SecurityEventDto;
import br.com.paulosilveriomartins.iamservice.model.ActiveSession;
import br.com.paulosilveriomartins.iamservice.model.UserDevice;
import br.com.paulosilveriomartins.iamservice.repository.ActiveSessionRepository;
import br.com.paulosilveriomartins.iamservice.repository.UserDeviceRepository;
import br.com.paulosilveriomartins.iamservice.config.RabbitMQConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap;

@Component
public class SecurityEventListener {

    private static final Logger logger = LoggerFactory.getLogger(SecurityEventListener.class);

    private final ActiveSessionRepository sessionRepository;
    private final UserDeviceRepository deviceRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.frontend-url:http://localhost:5174}")
    private String frontendUrl;

    public SecurityEventListener(ActiveSessionRepository sessionRepository,UserDeviceRepository deviceRepository, RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        this.sessionRepository = sessionRepository;
        this.deviceRepository = deviceRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        logger.info("[KAFKA] Bean do SecurityEventListener foi instanciado pelo Spring!");
    }

    @KafkaListener(topics = "security.events", groupId = "${spring.kafka.consumer.group-id:iam-service-group}")
    public void handleSecurityEvent(String payload) {
        try {
            logger.info("Evento bruto recebido do Kafka: {}", payload);
            SecurityEventDto event = objectMapper.readValue(payload, SecurityEventDto.class);
            String eventType = event.getEventType();
            String sessionId = event.getSessionId();
            String userId = event.getUserId();

            if ("LOGOUT".equals(eventType) || "REVOKE_SESSION".equals(eventType)) {
                if (sessionId != null) {
                    sessionRepository.findById(sessionId).ifPresent(session -> {
                        session.setStatus(eventType);
                        sessionRepository.save(session);
                        logger.info("Sessão {} inativada! Status alterado para: {}", sessionId, eventType);
                    });
                }
                return;
            }

            if ("TOKEN_REFRESH".equals(eventType)) {
                logger.info("Token renovado no BFF para a sessão: {}", sessionId);
                return;
            }

            if ("SESSION_EXPIRED".equals(eventType)) {
                if (sessionId != null) {
                    sessionRepository.findById(sessionId).ifPresent(session -> {
                        session.setStatus("EXPIRED");
                        sessionRepository.save(session);
                        logger.info("Sessão {} marcou seu tempo de vida como EXPIRED no banco", sessionId);
                    });
                }
                return;
            }

            if ("LOGIN_SUCCESS".equals(eventType)) {
                Map<String, Object> details = event.getDetails();
                String userEmail = details != null ? (String) details.get("email") : "desconhecido";
                @SuppressWarnings("unchecked")
                Map<String, String> fingerprint = details != null ? (Map<String, String>) details.get("fingerprint") : null;

                if (fingerprint == null) {
                    logger.warn("Evento de login recebido sem fingerprint para o usuário {}", userId);
                    return;
                }

                String browser = fingerprint.get("browser");
                String os = fingerprint.get("os");
                String city = fingerprint.get("city");
                String ip = fingerprint.get("ip");

                LocalDateTime dataOcorrencia = LocalDateTime.now();
                if (event.getOccurredAt() != null) {
                    try {
                        dataOcorrencia = ZonedDateTime.parse(event.getOccurredAt()).toLocalDateTime();
                    } catch (Exception e) {
                        logger.warn("Erro ao fazer parse da data do evento '{}'.", event.getOccurredAt());
                    }
                }

                LocalDateTime dataExpiracao = LocalDateTime.now().plusHours(4); // Fallback
                if (event.getExpiresAt() != null) {
                    try {
                        dataExpiracao = ZonedDateTime.parse(event.getExpiresAt()).toLocalDateTime();
                    } catch (Exception e) {
                        logger.warn("Erro ao fazer parse de expiresAt. Usando fallback de 4 horas.");
                    }
                }

                try {
                    ActiveSession activeSession = new ActiveSession();
                    activeSession.setSessionId(sessionId);
                    activeSession.setUserId(userId);
                    activeSession.setBffOrigin(event.getOrigin());
                    activeSession.setBrowser(browser);
                    activeSession.setOs(os);
                    activeSession.setCity(city);
                    activeSession.setIpAddress(ip);
                    activeSession.setCreatedAt(dataOcorrencia);
                    activeSession.setStatus("ACTIVE");
                    activeSession.setExpiresAt(dataExpiracao);

                    sessionRepository.save(activeSession);
                    logger.info("Sessão ativa '{}' gravada no banco para o usuário: {}", sessionId, userId);
                } catch (Exception e) {
                    logger.error("❌ Erro ao salvar sessão ativa: ", e);
                }

                Optional<UserDevice> knownDevice = deviceRepository.findByUserIdAndBrowserAndOsAndCity(
                        userId, browser, os, city);

                if (knownDevice.isPresent()) {
                    UserDevice device = knownDevice.get();
                    device.setIpAddress(ip);
                    device.setLastLoginAt(dataOcorrencia);
                    deviceRepository.save(device);
                    logger.info("Login seguro: Dispositivo de {} ({} em {}) já era conhecido.", userEmail, browser, city);
                } else {
                    logger.warn("Dispositivo não reconhecido para o usuário {}. Salvando e alertando!", userEmail);

                    UserDevice newDevice = new UserDevice();
                    newDevice.setUserId(userId);
                    newDevice.setBrowser(browser);
                    newDevice.setOs(os);
                    newDevice.setCity(city);
                    newDevice.setIpAddress(ip);
                    newDevice.setLastLoginAt(dataOcorrencia);
                    newDevice.setIsTrusted(true);
                    deviceRepository.save(newDevice);

                    String painelUrl = frontendUrl + "/configuracoes/seguranca";
                    Map<String, Object> notificationCommand = new HashMap<>();
                    notificationCommand.put("to", userEmail);
                    notificationCommand.put("template", "NEW_DEVICE_ALERT");
                    notificationCommand.put("variables", fingerprint);
                    notificationCommand.put("actionUrl", painelUrl);

                    rabbitTemplate.convertAndSend(
                            RabbitMQConfig.NOTIFICATION_EXCHANGE,
                            "send.email",
                            notificationCommand
                    );
                    logger.info("Comando de e-mail enviado para o RabbitMQ (Destino: {})", userEmail);
                }
            }
        } catch (Exception e) {
            logger.error("Erro grave ao processar mensagem do Kafka: {}", e.getMessage(), e);
        }
    }
}