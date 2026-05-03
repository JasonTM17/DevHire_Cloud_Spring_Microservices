import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const keyword = encodeURIComponent(__ENV.SEARCH_KEYWORD || "Java");

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    checks: ["rate>0.95"],
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<2000"],
  },
};

function unwrapData(response) {
  const body = response.json();
  return body && body.data ? body.data : body;
}

function extractFirstJobId(payload) {
  if (!payload) {
    return null;
  }
  const content = payload.content || payload.items || payload.results || [];
  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }
  return content[0].id || null;
}

export function setup() {
  const response = http.get(`${baseUrl}/api/jobs?keyword=${keyword}&size=5`, {
    tags: { endpoint: "job-search-setup" },
  });
  check(response, {
    "setup search returns 200": (res) => res.status === 200,
  });

  let jobId = null;
  try {
    jobId = extractFirstJobId(unwrapData(response));
  } catch (error) {
    jobId = null;
  }

  return { jobId };
}

export default function (data) {
  const search = http.get(`${baseUrl}/api/jobs?keyword=${keyword}&size=10`, {
    tags: { endpoint: "job-search" },
  });

  check(search, {
    "job search returns 200": (res) => res.status === 200,
    "job search response is json": (res) =>
      (res.headers["Content-Type"] || "").includes("application/json"),
  });

  if (data.jobId) {
    const detail = http.get(`${baseUrl}/api/jobs/${data.jobId}`, {
      tags: { endpoint: "job-detail" },
    });
    check(detail, {
      "job detail returns 200": (res) => res.status === 200,
    });
  }

  sleep(1);
}
