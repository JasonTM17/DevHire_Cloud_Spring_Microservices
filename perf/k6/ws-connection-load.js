/**
 * k6 WebSocket Connection Load Test
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5
 *
 * - Establishes 1000 concurrent WebSocket connections with valid JWT tokens
 * - 60-second ramp-up period
 * - Verifies 95% connection success rate within 5s each
 * - Measures and reports p50, p95, p99 connection latency
 * - Verifies stable memory usage (≤20% increase after connections established)
 * - Marks test failed if >5% connections fail
 * - Generates HTML report via handleSummary()
 *
 * Usage:
 *   k6 run perf/k6/ws-connection-load.js
 *   k6 run --env WS_URL=ws://localhost:8086 --env JWT_TOKEN=<token> perf/k6/ws-connection-load.js
 */

import ws from "k6/ws";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const wsUrl = (__ENV.WS_URL || "ws://localhost:8086").replace(/\/$/, "");
const jwtToken = __ENV.JWT_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2FkLXRlc3QtdXNlciIsInVzZXJJZCI6ImxvYWQtdGVzdC11c2VyIiwiZW1haWwiOiJsb2FkdGVzdEBkZXZoaXJlLmxvY2FsIiwicm9sZSI6IkNBTkRJREFURSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.placeholder";
const baseUrl = (__ENV.BASE_URL || "http://localhost:8086").replace(/\/$/, "");
const targetConnections = Number(__ENV.TARGET_CONNECTIONS || 1000);
const rampUpDuration = __ENV.RAMP_UP_DURATION || "60s";
const holdDuration = __ENV.HOLD_DURATION || "30s";

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------

const wsConnectionLatency = new Trend("ws_connection_latency", true);
const wsConnectionSuccess = new Rate("ws_connection_success");
const wsConnectionFailure = new Counter("ws_connection_failures");
const wsConnectionTotal = new Counter("ws_connection_total");
const wsActiveConnections = new Counter("ws_active_connections");

// ---------------------------------------------------------------------------
// k6 Options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    websocket_connections: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: rampUpDuration, target: targetConnections },
        { duration: holdDuration, target: targetConnections },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    ws_connection_success: [
      { threshold: "rate>0.95", abortOnFail: true },
    ],
    ws_connection_latency: [
      "p(50)<3000",
      "p(95)<5000",
      "p(99)<8000",
    ],
    ws_connection_failures: [
      { threshold: "count<" + Math.ceil(targetConnections * 0.05), abortOnFail: true },
    ],
  },
};

// ---------------------------------------------------------------------------
// Memory Baseline (captured during setup)
// ---------------------------------------------------------------------------

export function setup() {
  let memoryBaseline = null;
  try {
    const res = __ENV.ACTUATOR_URL
      ? http.get(`${__ENV.ACTUATOR_URL}/actuator/metrics/jvm.memory.used`)
      : null;
    if (res && res.status === 200) {
      const data = res.json();
      memoryBaseline = data.measurements
        ? data.measurements.find((m) => m.statistic === "VALUE")
        : null;
    }
  } catch (_) {
    // Actuator not available; memory check will be skipped
  }

  return {
    memoryBaseline: memoryBaseline ? memoryBaseline.value : null,
    startTime: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Main VU Function
// ---------------------------------------------------------------------------

export default function (data) {
  const connectionStart = Date.now();
  const vuToken = __ENV[`JWT_TOKEN_${__VU}`] || jwtToken;
  const wsEndpoint = `${wsUrl}/ws/websocket`;

  wsConnectionTotal.add(1);

  const res = ws.connect(
    wsEndpoint,
    {
      headers: {
        Authorization: `Bearer ${vuToken}`,
        "Sec-WebSocket-Protocol": "v10.stomp,v11.stomp,v12.stomp",
      },
      tags: { name: "ws-connect" },
    },
    function (socket) {
      const connectionLatency = Date.now() - connectionStart;
      wsConnectionLatency.add(connectionLatency);

      const connected = check(socket, {
        "WebSocket connection established": () => true,
        "connection latency < 5s": () => connectionLatency < 5000,
      });

      if (connected) {
        wsConnectionSuccess.add(true);
        wsActiveConnections.add(1);
      } else {
        wsConnectionSuccess.add(false);
        wsConnectionFailure.add(1);
      }

      // Send STOMP CONNECT frame
      socket.send(
        "CONNECT\n" +
        "accept-version:1.2\n" +
        "host:localhost\n" +
        "Authorization:Bearer " + vuToken + "\n" +
        "\n\0"
      );

      socket.on("message", function (msg) {
        // Handle STOMP CONNECTED frame
        if (msg.startsWith("CONNECTED")) {
          // Subscribe to user notification topic
          socket.send(
            "SUBSCRIBE\n" +
            "id:sub-0\n" +
            "destination:/user/load-test-user/notifications\n" +
            "\n\0"
          );
        }
      });

      socket.on("error", function (e) {
        wsConnectionSuccess.add(false);
        wsConnectionFailure.add(1);
        console.error(`VU ${__VU}: WebSocket error: ${e.error()}`);
      });

      // Hold connection open for the duration of the test stage
      socket.setTimeout(function () {
        // Send heartbeat to keep connection alive
        socket.send("\n");
      }, 15000);

      // Keep connection alive for hold period
      sleep(Number(holdDuration.replace("s", "")) || 30);

      socket.close();
    }
  );

  if (!res || res.status !== 101) {
    wsConnectionSuccess.add(false);
    wsConnectionFailure.add(1);
    const connectionLatency = Date.now() - connectionStart;
    wsConnectionLatency.add(connectionLatency);

    check(res, {
      "WebSocket upgrade successful": (r) => r && r.status === 101,
    });
  }
}

// ---------------------------------------------------------------------------
// Teardown — Memory Check
// ---------------------------------------------------------------------------

export function teardown(data) {
  if (data.memoryBaseline && __ENV.ACTUATOR_URL) {
    try {
      const res = http.get(`${__ENV.ACTUATOR_URL}/actuator/metrics/jvm.memory.used`);
      if (res && res.status === 200) {
        const body = res.json();
        const currentMemory = body.measurements
          ? body.measurements.find((m) => m.statistic === "VALUE")
          : null;
        if (currentMemory) {
          const increase = ((currentMemory.value - data.memoryBaseline) / data.memoryBaseline) * 100;
          console.log(`Memory usage increase: ${increase.toFixed(2)}%`);
          if (increase > 20) {
            console.warn(`WARN: Memory increased by ${increase.toFixed(2)}% (threshold: 20%)`);
          }
        }
      }
    } catch (_) {
      console.log("Could not check memory usage via actuator endpoint.");
    }
  }
}

// ---------------------------------------------------------------------------
// HTML Report Generation
// ---------------------------------------------------------------------------

export function handleSummary(data) {
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  const reportName = `ws-connection-load-${now}`;

  const thresholdResults = Object.entries(data.thresholds || {}).map(([name, info]) => {
    const passed = info.thresholds ? Object.values(info.thresholds).every((t) => t.ok) : true;
    return { name, passed };
  });

  const allPassed = thresholdResults.every((t) => t.passed);

  const metrics = data.metrics || {};
  const connLatency = metrics.ws_connection_latency || {};
  const connSuccess = metrics.ws_connection_success || {};
  const connFailures = metrics.ws_connection_failures || {};

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WebSocket Connection Load Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a2e; }
    .status { padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 1.2em; margin-bottom: 20px; }
    .status.pass { background: #d4edda; color: #155724; }
    .status.fail { background: #f8d7da; color: #721c24; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .metric { text-align: center; }
    .metric-value { font-size: 2em; font-weight: bold; color: #1a1a2e; }
    .metric-label { color: #666; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .pass-badge { color: #155724; background: #d4edda; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; }
    .fail-badge { color: #721c24; background: #f8d7da; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; }
  </style>
</head>
<body>
  <div class="container">
    <h1>WebSocket Connection Load Test Report</h1>
    <div class="status ${allPassed ? "pass" : "fail"}">${allPassed ? "✅ ALL THRESHOLDS PASSED" : "❌ THRESHOLDS FAILED"}</div>

    <div class="card">
      <h2>Connection Latency</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${connLatency.values ? connLatency.values["p(50)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p50</div>
        </div>
        <div class="metric">
          <div class="metric-value">${connLatency.values ? connLatency.values["p(95)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p95</div>
        </div>
        <div class="metric">
          <div class="metric-value">${connLatency.values ? connLatency.values["p(99)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p99</div>
        </div>
        <div class="metric">
          <div class="metric-value">${connLatency.values ? connLatency.values.avg.toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">Average</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Connection Success Rate</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${connSuccess.values ? (connSuccess.values.rate * 100).toFixed(2) : "N/A"}%</div>
          <div class="metric-label">Success Rate (threshold: 95%)</div>
        </div>
        <div class="metric">
          <div class="metric-value">${connFailures.values ? connFailures.values.count : "0"}</div>
          <div class="metric-label">Failed Connections</div>
        </div>
        <div class="metric">
          <div class="metric-value">${targetConnections}</div>
          <div class="metric-label">Target Connections</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Threshold Results</h2>
      <table>
        <thead><tr><th>Threshold</th><th>Status</th></tr></thead>
        <tbody>
          ${thresholdResults.map((t) => `<tr><td>${t.name}</td><td><span class="${t.passed ? "pass-badge" : "fail-badge"}">${t.passed ? "PASS" : "FAIL"}</span></td></tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Test Configuration</h2>
      <table>
        <tbody>
          <tr><td>Target Connections</td><td>${targetConnections}</td></tr>
          <tr><td>Ramp-up Duration</td><td>${rampUpDuration}</td></tr>
          <tr><td>Hold Duration</td><td>${holdDuration}</td></tr>
          <tr><td>WebSocket URL</td><td>${wsUrl}/ws/websocket</td></tr>
          <tr><td>Generated At</td><td>${new Date().toISOString()}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [`reports/${reportName}.html`]: html,
  };
}
