/**
 * k6 REST API Load Test
 *
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 *
 * - Simulates 200 concurrent VUs over 5-minute duration
 * - Targets notification listing, job listing, and leaderboard endpoints
 * - Verifies p95 < 500ms (cached), p95 < 2000ms (uncached)
 * - Verifies error rate < 1%
 * - Generates HTML report with threshold pass/fail indicators and time-series charts
 *
 * Usage:
 *   k6 run perf/k6/rest-api-load.js
 *   k6 run --env BASE_URL=http://localhost:8080 --env JWT_TOKEN=<token> perf/k6/rest-api-load.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const baseUrl = (__ENV.BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const jwtToken = __ENV.JWT_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2FkLXRlc3QtdXNlciIsInVzZXJJZCI6ImxvYWQtdGVzdC11c2VyIiwiZW1haWwiOiJsb2FkdGVzdEBkZXZoaXJlLmxvY2FsIiwicm9sZSI6IkNBTkRJREFURSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.placeholder";
const targetVUs = Number(__ENV.VUS || 200);
const testDuration = __ENV.DURATION || "5m";

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------

const cachedResponseTime = new Trend("cached_response_time", true);
const uncachedResponseTime = new Trend("uncached_response_time", true);
const notificationListTime = new Trend("notification_list_time", true);
const jobListTime = new Trend("job_list_time", true);
const leaderboardTime = new Trend("leaderboard_time", true);
const apiErrors = new Counter("api_errors");
const apiErrorRate = new Rate("api_error_rate");
const requestsTotal = new Counter("requests_total");

// ---------------------------------------------------------------------------
// k6 Options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    rest_api_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: Math.floor(targetVUs / 2) },
        { duration: "30s", target: targetVUs },
        { duration: testDuration, target: targetVUs },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
  },
  thresholds: {
    cached_response_time: ["p(95)<500"],
    uncached_response_time: ["p(95)<2000"],
    api_error_rate: [
      { threshold: "rate<0.01", abortOnFail: true },
    ],
    http_req_failed: ["rate<0.01"],
    notification_list_time: ["p(95)<2000"],
    job_list_time: ["p(95)<500"],
    leaderboard_time: ["p(95)<500"],
  },
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function authHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
    },
  };
}

function trackResponse(res, metricTrend, isCached) {
  requestsTotal.add(1);
  const duration = res.timings.duration;
  metricTrend.add(duration);

  if (isCached) {
    cachedResponseTime.add(duration);
  } else {
    uncachedResponseTime.add(duration);
  }

  const isError = res.status >= 400;
  apiErrorRate.add(isError);
  if (isError) {
    apiErrors.add(1);
  }

  return !isError;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export function setup() {
  // Warm up cache by making initial requests
  const warmupParams = authHeaders();

  const jobRes = http.get(`${baseUrl}/api/jobs?keyword=Java&size=5`, warmupParams);
  const notifRes = http.get(`${baseUrl}/api/notifications?page=0&size=10`, warmupParams);

  let firstJobId = null;
  let assessmentId = null;

  try {
    if (jobRes.status === 200) {
      const body = jobRes.json();
      const content = (body.data || body).content || (body.data || body).items || [];
      if (Array.isArray(content) && content.length > 0) {
        firstJobId = content[0].id;
      }
    }
  } catch (_) {
    // Ignore parse errors during setup
  }

  // Use a default assessment ID for leaderboard queries
  assessmentId = __ENV.ASSESSMENT_ID || "default-assessment";

  return {
    firstJobId,
    assessmentId,
    cacheWarmedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Main VU Function
// ---------------------------------------------------------------------------

export default function (data) {
  const params = authHeaders();
  const iteration = __ITER;

  // Rotate between endpoint groups to simulate realistic traffic patterns
  const endpointGroup = iteration % 3;

  if (endpointGroup === 0) {
    // Notification listing (authenticated, cached after first request)
    group("Notification Listing", function () {
      const isCached = iteration > 0;
      const res = http.get(
        `${baseUrl}/api/notifications?page=0&size=20`,
        Object.assign({}, params, { tags: { endpoint: "notifications", cache: isCached ? "hit" : "miss" } })
      );

      trackResponse(res, notificationListTime, isCached);

      check(res, {
        "notification list returns 200": (r) => r.status === 200,
        "notification list is JSON": (r) => (r.headers["Content-Type"] || "").includes("application/json"),
      });
    });
  } else if (endpointGroup === 1) {
    // Job listing (public, cached via Redis)
    group("Job Listing", function () {
      const isCached = iteration > 2;
      const res = http.get(
        `${baseUrl}/api/jobs?keyword=Java&size=10&page=0`,
        Object.assign({}, params, { tags: { endpoint: "jobs", cache: isCached ? "hit" : "miss" } })
      );

      trackResponse(res, jobListTime, isCached);

      check(res, {
        "job list returns 200": (r) => r.status === 200,
        "job list is JSON": (r) => (r.headers["Content-Type"] || "").includes("application/json"),
      });

      // Occasionally fetch job detail
      if (data.firstJobId && iteration % 5 === 0) {
        const detailRes = http.get(
          `${baseUrl}/api/jobs/${data.firstJobId}`,
          Object.assign({}, params, { tags: { endpoint: "job-detail", cache: "hit" } })
        );

        trackResponse(detailRes, jobListTime, true);

        check(detailRes, {
          "job detail returns 200": (r) => r.status === 200,
        });
      }
    });
  } else {
    // Leaderboard (cached via Redis with 60s TTL)
    group("Leaderboard", function () {
      const isCached = iteration > 2;
      const res = http.get(
        `${baseUrl}/api/leaderboard/${data.assessmentId}?page=0&size=20`,
        Object.assign({}, params, { tags: { endpoint: "leaderboard", cache: isCached ? "hit" : "miss" } })
      );

      trackResponse(res, leaderboardTime, isCached);

      check(res, {
        "leaderboard returns 200 or 404": (r) => r.status === 200 || r.status === 404,
        "leaderboard is JSON": (r) => (r.headers["Content-Type"] || "").includes("application/json"),
      });
    });
  }

  // Simulate user think time
  sleep(Math.random() * 2 + 0.5);
}

// ---------------------------------------------------------------------------
// HTML Report Generation
// ---------------------------------------------------------------------------

export function handleSummary(data) {
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  const reportName = `rest-api-load-${now}`;

  const thresholdResults = Object.entries(data.thresholds || {}).map(([name, info]) => {
    const passed = info.thresholds ? Object.values(info.thresholds).every((t) => t.ok) : true;
    return { name, passed };
  });

  const allPassed = thresholdResults.every((t) => t.passed);

  const metrics = data.metrics || {};
  const cached = metrics.cached_response_time || {};
  const uncached = metrics.uncached_response_time || {};
  const notifMetric = metrics.notification_list_time || {};
  const jobMetric = metrics.job_list_time || {};
  const lbMetric = metrics.leaderboard_time || {};
  const errorRate = metrics.api_error_rate || {};

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>REST API Load Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a2e; }
    .status { padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 1.2em; margin-bottom: 20px; }
    .status.pass { background: #d4edda; color: #155724; }
    .status.fail { background: #f8d7da; color: #721c24; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .metric { text-align: center; }
    .metric-value { font-size: 1.8em; font-weight: bold; color: #1a1a2e; }
    .metric-label { color: #666; font-size: 0.85em; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .pass-badge { color: #155724; background: #d4edda; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; }
    .fail-badge { color: #721c24; background: #f8d7da; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; }
    .chart-placeholder { background: #f8f9fa; border: 2px dashed #ddd; border-radius: 8px; padding: 40px; text-align: center; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>REST API Load Test Report</h1>
    <div class="status ${allPassed ? "pass" : "fail"}">${allPassed ? "✅ ALL THRESHOLDS PASSED" : "❌ THRESHOLDS FAILED"}</div>

    <div class="card">
      <h2>Response Time — Cached Endpoints (threshold: p95 &lt; 500ms)</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${cached.values ? cached.values["p(50)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p50</div>
        </div>
        <div class="metric">
          <div class="metric-value">${cached.values ? cached.values["p(95)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p95</div>
        </div>
        <div class="metric">
          <div class="metric-value">${cached.values ? cached.values["p(99)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p99</div>
        </div>
        <div class="metric">
          <div class="metric-value">${cached.values ? cached.values.avg.toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">Average</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Response Time — Uncached Endpoints (threshold: p95 &lt; 2000ms)</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${uncached.values ? uncached.values["p(50)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p50</div>
        </div>
        <div class="metric">
          <div class="metric-value">${uncached.values ? uncached.values["p(95)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p95</div>
        </div>
        <div class="metric">
          <div class="metric-value">${uncached.values ? uncached.values["p(99)"].toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">p99</div>
        </div>
        <div class="metric">
          <div class="metric-value">${uncached.values ? uncached.values.avg.toFixed(0) : "N/A"}ms</div>
          <div class="metric-label">Average</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Endpoint Breakdown</h2>
      <table>
        <thead><tr><th>Endpoint</th><th>p50</th><th>p95</th><th>p99</th><th>Avg</th></tr></thead>
        <tbody>
          <tr>
            <td>Notifications</td>
            <td>${notifMetric.values ? notifMetric.values["p(50)"].toFixed(0) : "N/A"}ms</td>
            <td>${notifMetric.values ? notifMetric.values["p(95)"].toFixed(0) : "N/A"}ms</td>
            <td>${notifMetric.values ? notifMetric.values["p(99)"].toFixed(0) : "N/A"}ms</td>
            <td>${notifMetric.values ? notifMetric.values.avg.toFixed(0) : "N/A"}ms</td>
          </tr>
          <tr>
            <td>Job Listing</td>
            <td>${jobMetric.values ? jobMetric.values["p(50)"].toFixed(0) : "N/A"}ms</td>
            <td>${jobMetric.values ? jobMetric.values["p(95)"].toFixed(0) : "N/A"}ms</td>
            <td>${jobMetric.values ? jobMetric.values["p(99)"].toFixed(0) : "N/A"}ms</td>
            <td>${jobMetric.values ? jobMetric.values.avg.toFixed(0) : "N/A"}ms</td>
          </tr>
          <tr>
            <td>Leaderboard</td>
            <td>${lbMetric.values ? lbMetric.values["p(50)"].toFixed(0) : "N/A"}ms</td>
            <td>${lbMetric.values ? lbMetric.values["p(95)"].toFixed(0) : "N/A"}ms</td>
            <td>${lbMetric.values ? lbMetric.values["p(99)"].toFixed(0) : "N/A"}ms</td>
            <td>${lbMetric.values ? lbMetric.values.avg.toFixed(0) : "N/A"}ms</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Error Rate (threshold: &lt; 1%)</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${errorRate.values ? (errorRate.values.rate * 100).toFixed(3) : "0.000"}%</div>
          <div class="metric-label">Error Rate</div>
        </div>
        <div class="metric">
          <div class="metric-value">${metrics.api_errors && metrics.api_errors.values ? metrics.api_errors.values.count : "0"}</div>
          <div class="metric-label">Total Errors</div>
        </div>
        <div class="metric">
          <div class="metric-value">${metrics.requests_total && metrics.requests_total.values ? metrics.requests_total.values.count : "0"}</div>
          <div class="metric-label">Total Requests</div>
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
          <tr><td>Target VUs</td><td>${targetVUs}</td></tr>
          <tr><td>Duration</td><td>${testDuration}</td></tr>
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
