package br.com.paulosilveriomartins.notification.listener;

import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import br.com.paulosilveriomartins.notification.dto.EmailCommand;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationListener {

    private static final Logger logger = LoggerFactory.getLogger(EmailNotificationListener.class);
    private final JavaMailSender mailSender;

    public EmailNotificationListener(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @RabbitListener(queues = "queue.email.alerts")
    public void processarEnvioDeEmail(EmailCommand comando) {
        logger.info("📩 Recebido comando para enviar e-mail para: {}", comando.getTo());

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("testesefa34@gmail.com");
            helper.setTo(comando.getTo());

            if ("NEW_DEVICE_ALERT".equals(comando.getTemplate())) {
                helper.setSubject("🚨 Alerta de Segurança: Novo Acesso Detectado");

                String ip = "N/A";
                String browser = "N/A";
                String os = "N/A";
                String city = "N/A";

                if (comando.getVariables() != null) {
                    ip = (String) comando.getVariables().getOrDefault("ip", ip);
                    browser = (String) comando.getVariables().getOrDefault("browser", browser);
                    os = (String) comando.getVariables().getOrDefault("os", os);
                    city = (String) comando.getVariables().getOrDefault("city", city);
                }

                String htmlMsg = "<div style='font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;'>"
                        + "<div style='background-color: #f8d7da; color: #721c24; padding: 15px; text-align: center; font-size: 18px; font-weight: bold;'>Novo Acesso Detectado</div>"
                        + "<div style='padding: 20px;'>"
                        + "<p>Olá,</p>"
                        + "<p>Detectamos um novo acesso à sua conta a partir de um dispositivo não reconhecido.</p>"
                        + "<ul style='list-style-type: none; padding: 0;'>"
                        + "<li style='margin-bottom: 5px;'>🌐 <b>Navegador:</b> " + browser + "</li>"
                        + "<li style='margin-bottom: 5px;'>💻 <b>Sistema:</b> " + os + "</li>"
                        + "<li style='margin-bottom: 5px;'>📍 <b>Localização:</b> " + city + "</li>"
                        + "<li style='margin-bottom: 5px;'>📡 <b>IP:</b> " + ip.replace("::ffff:", "") + "</li>"
                        + "</ul>"
                        + "<p style='margin-top: 20px;'>Se não foi você, clique no botão abaixo para ir ao painel e revogar este acesso imediatamente:</p>"
                        + "<a href='" + comando.getActionUrl() + "' style='display: block; width: 200px; text-align: center; background-color: #dc3545; color: #fff; padding: 12px 15px; text-decoration: none; border-radius: 5px; margin: 20px auto; font-weight: bold;'>Revisar Segurança</a>"
                        + "</div></div>";
                helper.setText(htmlMsg, true);
            } else {
                helper.setSubject("Notificação do Sistema");
                helper.setText("Você tem uma nova notificação: " + comando.getActionUrl(), false);
            }

            mailSender.send(message);
            logger.info("✅ E-mail HTML enviado com sucesso para: {}", comando.getTo());

        } catch (Exception e) {
            logger.error("❌ Falha ao enviar e-mail para {}: {}", comando.getTo(), e.getMessage());
            throw new RuntimeException("Erro no envio do e-mail", e);
        }
    }
}
