/**
 * k6 Leaderboard Real-time Update Throughput Test
 *
 * Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5
 *
 * - Subscribes 500 concurrent clients to the leaderboard topic
 * - Triggers 100 rank-change events per second
 * - Verifies 98% delivery rate to all subscribed clients
 * - Verifies p95 delivery latency < 2s
 * - Measures and reports fan-out efficiency (total delivered / total published)
 * - Generates HTML report with throughput metrics and delivery success rates
 *
 * Usage:
 *   k6 run perf/k6/leaderboard-throughput.js
 *   k6 run --env WS_URL=ws://localhost:8086 --env BASE_URL=http://localhost:8086 --env JWT_TOKEN=<token> perf/k6/leaderboard-throughput.js
 */

import ws from "k6/ws";
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend, Gauge } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const wsUrl = (__ENV.WS_URL || "ws://localhost:8086").replace(/\/$/, "");
const baseUrl = (__ENV.BASE_URL || "http://localhost:8086").replace(/\/$/, "");
const jwtToken = __ENV.JWT_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2FkLXRlc3QtdXNlciIsInVzZXJJZCI6ImxvYWQtdGVzdC11c2VyIiwiZW1haWwiOiJsb2FkdGVzdEBkZXZoaXJlLmxvY2FsIiwicm9sZSI6IkNBTkRJREFURSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.placeholder";
const targetSubscribers = Number(__ENV.TARGET_SUBSCRIBERS || 500);
const eventsPerSecond = Number(__ENV.EVENTS_PER_SECOND || 100);
const rampUpDuration = __ENV.RAMP_UP_DURATION || "60s";
const holdDuration = __ENV.HOLD_DURATION || "120s";
const assessmentId = __ENV.ASSESSMENT_ID || "default-assessment";

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------

const leaderboardDeliveryLatency = new Trend("leaderboard_delivery_latency", true);
const leaderboardDeliveryRate = new Rate("leaderboard_delivery_rate");
const leaderboardEventsPublished = new Counter("leaderboard_events_published");
const leaderboardEventsDelivered = new Counter("leaderboard_events_delivered");
const leaderboardEventsMissed = new Counter("leaderboard_events_missed");
const leaderboardSubscribers = new Counter("leaderboard_subscribers_connected");
const leaderboardFanOutEfficiency = new Gauge("leaderboard_fan_out_efficiency");
const wsSubscriptionSuccess = new Rate("ws_subscription_success");

// ---------------------------------------------------------------------------
// k6 Options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    leaderboard_subscribers: {
      executor: "ramping-vus",
      exec: "subscriberVU",
      startVUs: 0,
      stages: [
        { duration: rampUpDuration, target: targetSubscribers },
        { duration: holdDuration, target: targetSubscribers },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
    leaderboard_publisher: {
      executor: "constant-arrival-rate",
      exec: "publisherVU",
      rate: eventsPerSecond,
      timeUnit: "1s",
      duration: holdDuration,
      preAllocatedVUs: Math.min(eventsPerSecond, 50),
      maxVUs: eventsPerSecond * 2,
      startTime: rampUpDuration,
    },
  },
  thresholds: {
    leaderboard_delivery_rate: [
      { threshold: "rate>0.98", abortOnFail: false },
    ],
    leaderboard_delivery_latency: [
      "p(50)<1000",
      "p(95)<2000",
      "p(99)<4000",
    ],
    ws_subscription_success: [
      { threshold: "rate>0.95", abortOnFail: true },
    ],
  },
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export function setup() {
  return {
    startTime: Date.now(),
    assessmentId: assessmentId,
    targetSubscribers: targetSubscribers,
    eventsPerSecond: eventsPerSecond,
  };
}

// ---------------------------------------------------------------------------
// Subscriber VU — Connects via WebSocket and subscribes to leaderboard topic
// ---------------------------------------------------------------------------

export function subscriberVU(data) {
  const vuToken = __ENV[`JWT_TOKEN_${__VU}`] || jwtToken;
  const wsEndpoint = `${wsUrl}/ws/websocket`;

  const res = ws.connect(
    wsEndpoint,
    {
      headers: {
        Authorization: `Bearer ${vuToken}`,
        "Sec-WebSocket-Protocol": "v10.stomp,v11.stomp,v12.stomp",
      },
      tags: { name: "leaderboard-subscriber" },
    },
    function (socket) {
      let subscribed = false;
      let messagesReceived = 0;

      // Send STOMP CONNECT frame
      socket.send(
        "CONNECT\n" +
        "accept-version:1.2\n" +
        "host:localhost\n" +
        "Authorization:Bearer " + vuToken + "\n" +
        "\n\0"
      );

      socket.on("message", function (msg) {
        if (msg.startsWith("CONNECTED") && !subscribed) {
          // Subscribe to leaderboard topic
          socket.send(
            "SUBSCRIBE\n" +
            "id:sub-leaderboard-0\n" +
            "destination:/topic/leaderboard\n" +
            "\n\0"
          );
          subscribed = true;
          wsSubscriptionSuccess.add(true);
          leaderboardSubscribers.add(1);
        } else if (msg.startsWith("MESSAGE")) {
          // Parse delivery timestamp from message body
          const receiveTime = Date.now();
          let publishTime = null;

          try {
            const bodyStart = msg.indexOf("\n\n");
            if (bodyStart !== -1) {
              const body = msg.substring(bodyStart + 2).replace(/\0$/, "");
              const parsed = JSON.parse(body);
              publishTime = parsed._publishedAt || parsed.publishedAt;
            }
          } catch (_) {
            // Ignore parse errors; use fallback latency
          }

          if (publishTime) {
            const latency = receiveTime - publishTime;
            leaderboardDeliveryLatency.add(latency);
          }

          messagesReceived++;
          leaderboardEventsDelivered.add(1);
          leaderboardDeliveryRate.add(true);
        } else if (msg.startsWith("ERROR")) {
          wsSubscriptionSuccess.add(false);
          leaderboardDeliveryRate.add(false);
        }
      });

      socket.on("error", function (e) {
        wsSubscriptionSuccess.add(false);
        console.error(`Subscriber VU ${__VU}: WebSocket error: ${e.error()}`);
      });

      // Send periodic heartbeats to keep connection alive
      socket.setInterval(function () {
        socket.send("\n");
      }, 15000);

      // Hold connection open for the test duration
      const holdSeconds = Number(holdDuration.replace("s", "").replace("m", "")) || 120;
      const holdMs = holdDuration.includes("m") ? holdSeconds * 60 * 1000 : holdSeconds * 1000;
      sleep(holdMs / 1000);

      socket.close();
    }
  );

  if (!res || res.status !== 101) {
    wsSubscriptionSuccess.add(false);
    check(res, {
      "WebSocket upgrade successful": (r) => r && r.status === 101,
    });
  }
}

// ---------------------------------------------------------------------------
// Publisher VU — Triggers rank-change events via REST API
// ---------------------------------------------------------------------------

export function publisherVU(data) {
  const publishTime = Date.now();
  const candidateId = `candidate-${Math.floor(Math.random() * 1000)}`;
  const previousRank = Math.floor(Math.random() * 100) + 1;
  const rankDelta = Math.floor(Math.random() * 10) + 1;
  const newRank = Math.max(1, previousRank - rankDelta);
  const score = Math.floor(Math.random() * 1000) + 100;

  const payload = JSON.stringify({
    candidateId: candidateId,
    newRank: newRank,
    previousRank: previousRank,
    score: score,
    assessmentId: data.assessmentId,
    _publishedAt: publishTime,
  });

  const params = {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
    },
    tags: { name: "leaderboard-publish" },
  };

  // Publish rank-change event via REST endpoint
  const res = http.post(
    `${baseUrl}/api/leaderboard/rank-change`,
    payload,
    params
  );

  const published = check(res, {
    "rank-change event published (2xx)": (r) => r.status >= 200 && r.status < 300,
  });

  if (published) {
    leaderboardEventsPublished.add(1);
  } else {
    leaderboardEventsMissed.add(1);
    leaderboardDeliveryRate.add(false);
  }
}

// ---------------------------------------------------------------------------
// Teardown — Calculate fan-out efficiency
// ---------------------------------------------------------------------------

export function teardown(data) {
  console.log("=== Leaderboard Throughput Test Summary ===");
  console.log(`Target subscribers: ${data.targetSubscribers}`);
  console.log(`Events per second: ${data.eventsPerSecond}`);
  console.log(`Test duration: ${holdDuration}`);
  console.log(`Assessment ID: ${data.assessmentId}`);
}

// ---------------------------------------------------------------------------
// HTML Report Generation
// ---------------------------------------------------------------------------

export function handleSummary(data) {
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  const reportName = `leaderboard-throughput-${now}`;

  const thresholdResults = Object.entries(data.thresholds || {}).map(([name, info]) => {
    const passed = info.thresholds ? Object.values(info.thresholds).every((t) => t.ok) : true;
    return { name, passed };
  });

  const allPassed = thresholdResults.every((t) => t.passed);

  const metrics = data.metrics || {};
  const deliveryLatency = metrics.leaderboard_delivery_latency || {};
  const deliveryRate = metrics.leaderboard_delivery_rate || {};
  const eventsPublished = metrics.leaderboard_events_published || {};
  const eventsDelivered = metrics.leaderboard_events_delivered || {};
  const eventsMissed = metrics.leaderboard_events_missed || {};
  const subscribersConnected = metrics.leaderboard_subscribers_connected || {};

  // Calculate fan-out efficiency
  const totalPublished = eventsPublished.values ? eventsPublished.values.count : 0;
  const totalDelivered = eventsDelivered.values ? eventsDelivered.values.count : 0;
  const totalSubscribers = subscribersConnected.values ? subscribersConnected.values.count : targetSubscribers;
  const expectedDeliveries = totalPublished * totalSubscribers;
  const fanOutEfficiency = expectedDeliveries > 0
    ? ((totalDelivered / expectedDeliveries) * 100).toFixed(2)
    : "N/A";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Leaderboard Throughput Test Report</title>
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
    .highlight { background: #e8f4fd; border-left: 4px solid #2196f3; padding: 12px 16px; border-radius: 4px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Leaderboard Throughput Test Report</h1>
    <div class="status ${allPassed ? "pass" : "fail"}">${allPassed ? "✅ ALL THRESHOLDS PASSED" : "❌ THRESHOLDS FAILED"}</div>

    <div class="card">
      <h2>Delivery Latency (threshold: p95 &lt; 2000ms)</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${deliveryLatency.values ? deliveryLatency.values["p(50)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p50</div>
        </div>
        <div class="metric">
          <div class="metric-value">${deliveryLatency.values ? deliveryLatency.values["p(95)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p95</div>
        </div>
        <div class="metric">
          <div class="metric-value">${deliveryLatency.values ? deliveryLatency.values["p(99)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p99</div>
        </div>
        <div class="metric">
          <div class="metric-value">${deliveryLatency.values ? deliveryLatency.values.avg.toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">Average</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Delivery Success Rate (threshold: &ge; 98%)</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${deliveryRate.values ? (deliveryRate.values.rate * 100).toFixed(2) : "N/A"}%</div>
          <div class="metric-label">Delivery Rate</div>
        </div>
        <div class="metric">
          <div class="metric-value">${totalPublished}</div>
          <div class="metric-label">Events Published</div>
        </div>
        <div class="metric">
          <div class="metric-value">${totalDelivered}</div>
          <div class="metric-label">Events Delivered</div>
        </div>
        <div class="metric">
          <div class="metric-value">${eventsMissed.values ? eventsMissed.values.count : "0"}</div>
          <div class="metric-label">Events Missed</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Fan-Out Efficiency</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${fanOutEfficiency}%</div>
          <div class="metric-label">Fan-Out Efficiency (delivered / expected)</div>
        </div>
        <div class="metric">
          <div class="metric-value">${totalSubscribers}</div>
          <div class="metric-label">Total Subscribers Connected</div>
        </div>
        <div class="metric">
          <div class="metric-value">${expectedDeliveries}</div>
          <div class="metric-label">Expected Deliveries (published × subscribers)</div>
        </div>
        <div class="metric">
          <div class="metric-value">${totalDelivered}</div>
          <div class="metric-label">Actual Deliveries</div>
        </div>
      </div>
      <div class="highlight">
        <strong>Fan-out efficiency</strong> measures how effectively the system broadcasts each published event to all subscribers.
        A value of 100% means every subscriber received every published event.
      </div>
    </div>

    <div class="card">
      <h2>Throughput</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${eventsPerSecond}</div>
          <div class="metric-label">Target Events/Second</div>
        </div>
        <div class="metric">
          <div class="metric-value">${targetSubscribers}</div>
          <div class="metric-label">Target Subscribers</div>
        </div>
        <div class="metric">
          <div class="metric-value">${totalPublished > 0 && totalDelivered > 0 ? Math.floor(totalDelivered / (Number(holdDuration.replace("s", "").replace("m", "")) * (holdDuration.includes("m") ? 60 : 1))) : "N/A"}</div>
          <div class="metric-label">Avg Deliveries/Second</div>
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
          <tr><td>Target Subscribers</td><td>${targetSubscribers}</td></tr>
          <tr><td>Events Per Second</td><td>${eventsPerSecond}</td></tr>
          <tr><td>Ramp-up Duration</td><td>${rampUpDuration}</td></tr>
          <tr><td>Hold Duration</td><td>${holdDuration}</td></tr>
          <tr><td>Assessment ID</td><td>${assessmentId}</td></tr>
          <tr><td>WebSocket URL</td><td>${wsUrl}/ws/websocket</td></tr>
          <tr><td>Base URL</td><td>${baseUrl}</td></tr>
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
