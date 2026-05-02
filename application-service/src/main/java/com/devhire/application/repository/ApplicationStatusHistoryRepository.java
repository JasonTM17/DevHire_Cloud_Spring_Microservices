package com.devhire.application.repository;

import com.devhire.application.entity.ApplicationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ApplicationStatusHistoryRepository extends JpaRepository<ApplicationStatusHistory, UUID> {
}

