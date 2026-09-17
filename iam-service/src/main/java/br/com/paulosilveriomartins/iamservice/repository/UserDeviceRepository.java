package br.com.paulosilveriomartins.iamservice.repository;

import br.com.paulosilveriomartins.iamservice.model.UserDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserDeviceRepository extends JpaRepository<UserDevice, String> {

    Optional<UserDevice> findByUserIdAndBrowserAndOsAndCity(String userId, String browser, String os, String city);

    List<UserDevice> findByUserId(String userId);
}
