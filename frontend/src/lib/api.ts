const API_BASE_URL = "http://localhost:8000";

export async function fetchGeoDistribution() {
  const resp = await fetch(`${API_BASE_URL}/api/v1/analytics/geo-distribution`);
  const data = await resp.json();
  return data.distribution;
}

export async function fetchWeeklyTrends() {
  const resp = await fetch(`${API_BASE_URL}/api/v1/analytics/weekly-trends`);
  const data = await resp.json();
  return data.trends;
}

export async function fetchIncidents(limit = 50) {
  const resp = await fetch(`${API_BASE_URL}/api/v1/incidents?limit=${limit}`);
  const data = await resp.json();
  return data.incidents;
}

export async function fetchComprehensiveAnalytics() {
  const resp = await fetch(`${API_BASE_URL}/api/v1/analytics/comprehensive`);
  return await resp.json();
}

export async function fetchQualityMetrics() {
  const resp = await fetch(`${API_BASE_URL}/api/v1/analytics/quality-metrics`);
  return await resp.json();
}

export async function fetchCustomerMetrics() {
  const resp = await fetch(`${API_BASE_URL}/api/v1/analytics/customer-metrics`);
  return await resp.json();
}

export async function fetchOperationalTrends() {
  const resp = await fetch(`${API_BASE_URL}/api/v1/analytics/operational-trends`);
  const data = await resp.json();
  return data.trends;
}
