package br.com.paulosilveriomartins.iamservice.config;

import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String IAM_EVENTS_EXCHANGE = "iam.events";
    public static final String SESSION_COMMANDS_EXCHANGE = "session.commands.exchange";

    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";

    @Bean
    public DirectExchange sessionCommandsExchange() {
        return new DirectExchange(SESSION_COMMANDS_EXCHANGE);
    }

    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(NOTIFICATION_EXCHANGE);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
