"use client";

import { useCallback, useRef, useState } from "react";
import { HikariPoolPanel } from "@/components/ops/HikariPoolPanel";
import { KafkaConsumerLagPanel } from "@/components/ops/KafkaConsumerLagPanel";
import { OpsWidget } from "@/components/ops/OpsWidget";
import { ServiceDetailDrawer } from "@/components/ops/ServiceDetailDrawer";
import { ServiceHealthMatrix } from "@/components/ops/ServiceHealthMatrix";
import { StalenessBadge } from "@/components/ops/StalenessBadge";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { api } from "@/lib/api";
import { detectTransitions, isStale } from "@/lib/ops/classifiers";
import { buildOpsHealthSummary, unknownOpsHealthSummary, type OpsHealthSummary } from "@/lib/ops";
import type { HikariPool } from "@/components/ops/HikariPoolPanel";
import type { KafkaConsumerGroup } from "@/components/ops/KafkaConsumerLagPanel";
import type { ServiceDetailMetrics } from "@/components/ops/ServiceDetailDrawer";
import type { ServiceHealth, ServiceTransition } from "@/lib/ops/types";
import "@/styles/components/ops-monitoring-page.css";

const HEALTH_POLL_INTERVAL = 30_000;
const STALENESS_THRESHOLD_MS = 60_000;

export default function AdminMonitoringPage() {
  const [fetchedAt, setFetchedAt] = useState<number>(Date.now());
  const previousServicesRef = useRef<ServiceHealth[]>([]);
  const [transitions, setTransitions] = useState<ServiceTransition[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceHealth | null>(null);
  const [serviceDetails] = useState<ServiceDetailMetrics | null>(null);

  const fetchHealthSummary = useCallback(async (): Promise<OpsHealthSummary> => {
    try {
      const [operations, codeAssessments] = await Promise.all([
        api.operationsSummary(),
        api.codeAssessmentSummary(),
      ]);
      const summary = buildOpsHealthSummary(operations, codeAssessments);
      setFetchedAt(Date.now());

      if (previousServicesRef.current.length > 0) {
        const newTransitions = detectTransitions(previousServicesRef.current, summary.services);
        if (newTransitions.length > 0) {
          setTransitions((prev) => [...newTransitions, ...prev].slice(0, 20));
        }
      }
      previousServicesRef.current = summary.services;
      return summary;
    } catch (error) {
      const summary = unknownOpsHealthSummary(error instanceof Error ? error.message : "Admin health APIs unavailable");
      setFetchedAt(Date.now());
      previousServicesRef.current = summary.services;
      return summary;
    }
  }, []);

  const { data: healthSummary, error: healthError, isValidating: healthPending } = useDataFetcher<OpsHealthSummary>(
    "ops:monitoring-health",
    fetchHealthSummary,
    { refreshInterval: HEALTH_POLL_INTERVAL, pauseWhenHidden: true }
  );

  const fetchKafkaLag = useCallback(async (): Promise<KafkaConsumerGroup[]> => {
    return [];
  }, []);

  const { data: kafkaGroups, error: kafkaError, isValidating: kafkaPending } = useDataFetcher<KafkaConsumerGroup[]>(
    "ops:kafka-lag",
    fetchKafkaLag,
    { refreshInterval: HEALTH_POLL_INTERVAL, pauseWhenHidden: true }
  );

  const fetchPools = useCallback(async (): Promise<HikariPool[]> => {
    return [];
  }, []);

  const { data: pools, error: poolError, isValidating: poolPending } = useDataFetcher<HikariPool[]>(
    "ops:hikari-pools",
    fetchPools,
    { refreshInterval: HEALTH_POLL_INTERVAL, pauseWhenHidden: true }
  );

  const dataIsStale = isStale(fetchedAt, Date.now(), STALENESS_THRESHOLD_MS);
  const services = healthSummary?.services ?? unknownOpsHealthSummary("Waiting for the first admin health poll.").services;

  const handleServiceClick = useCallback((service: ServiceHealth) => {
    setSelectedService(service);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedService(null);
  }, []);

  return (
    <section className="ops-monitoring-page" data-testid="admin-monitoring-page">
      <div className="ops-monitoring-page__header">
        <div className="ops-monitoring-page__header-content">
          <h1 className="ops-monitoring-page__title">Service Health Monitoring</h1>
          <p className="ops-monitoring-page__subtitle">
            Live admin API health signals with uninstrumented infrastructure panels called out explicitly.
          </p>
        </div>
        <StalenessBadge isStale={dataIsStale} fetchedAt={fetchedAt} />
      </div>

      <OpsWidget
        title="Service Health Matrix"
        span={2}
        isLoading={!healthSummary && healthPending}
        error={healthError}
        data-testid="ops-widget-health-matrix"
      >
        <ServiceHealthMatrix
          services={services}
          transitions={transitions}
          onServiceClick={handleServiceClick}
        />
      </OpsWidget>

      <div className="ops-monitoring-page__infra-panels">
        <OpsWidget
          title="Kafka Consumer Lag"
          isLoading={!kafkaGroups && kafkaPending}
          error={kafkaError}
          empty={(kafkaGroups ?? []).length === 0}
          emptyMessage="Kafka lag metrics are not exposed through the admin API yet."
          data-testid="ops-widget-kafka-lag"
        >
          <KafkaConsumerLagPanel groups={kafkaGroups ?? []} />
        </OpsWidget>

        <OpsWidget
          title="HikariCP Pool Utilization"
          isLoading={!pools && poolPending}
          error={poolError}
          empty={(pools ?? []).length === 0}
          emptyMessage="Connection-pool metrics are not exposed through the admin API yet."
          data-testid="ops-widget-hikari-pool"
        >
          <HikariPoolPanel pools={pools ?? []} />
        </OpsWidget>
      </div>

      <ServiceDetailDrawer
        service={selectedService}
        details={serviceDetails}
        isLoading={false}
        onClose={handleDrawerClose}
      />
    </section>
  );
}
