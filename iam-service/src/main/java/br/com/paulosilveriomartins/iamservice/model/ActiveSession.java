package br.com.paulosilveriomartins.iamservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "active_sessions")
public class ActiveSession {

    @Id
    @Column(name = "session_id", length = 255)
    private String sessionId;

    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    @Column(name = "bff_origin", nullable = false, length = 100)
    private String bffOrigin;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "status")
    private String status;

    @Column(length = 100)
    private String browser;

    @Column(length = 100)
    private String os;

    @Column(length = 100)
    private String city;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    public ActiveSession() {
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getBffOrigin() {
        return bffOrigin;
    }

    public void setBffOrigin(String bffOrigin) {
        this.bffOrigin = bffOrigin;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getBrowser() {
        return browser;
    }

    public void setBrowser(String browser) {
        this.browser = browser;
    }

    public String getOs() {
        return os;
    }

    public void setOs(String os) {
        this.os = os;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
