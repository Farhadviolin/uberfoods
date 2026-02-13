# 📊 UberFoods - Monitoring Setup

**Prometheus + Grafana Monitoring Stack für Production**

## 🚀 Quick Start

### Monitoring Stack starten
```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### Zugriff
- **Grafana Dashboard**: http://localhost:3001
  - Username: `admin`
  - Password: `admin` (bitte in Production ändern!)
- **Prometheus**: http://localhost:9090

## 📊 Verfügbare Metriken

### Backend API Metrics
- HTTP Request Rate
- Response Times
- Error Rates
- Active Connections
- Memory Usage
- CPU Usage

### System Metrics (Node Exporter)
- CPU Usage
- Memory Usage
- Disk I/O
- Network Traffic
- File System Usage

### Database Metrics (optional)
- Connection Pool Status
- Query Performance
- Transaction Rates
- Database Size

## 🔧 Konfiguration

### Prometheus Targets
Die Prometheus-Konfiguration befindet sich in `prometheus.yml`:
- Backend API: `host.docker.internal:3000`
- Node Exporter: `node-exporter:9100`
- PostgreSQL Exporter: `postgres-exporter:9187` (optional)

### Grafana Dashboards
- Pre-configured Dashboards in `grafana/dashboards/`
- Custom Dashboards können in Grafana erstellt werden

## 📈 Beispiel-Queries

### API Request Rate
```promql
rate(http_requests_total[5m])
```

### Error Rate
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

### Response Time (P95)
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Memory Usage
```promql
node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes
```

## 🚨 Alerting (Optional)

### Alert Rules erstellen
Erstelle `alerts.yml` in `monitoring/`:

```yaml
groups:
  - name: uberfoods_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/second"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"
```

## 🔍 Troubleshooting

### Prometheus kann Backend nicht erreichen
```bash
# Prüfe ob Backend läuft
curl http://localhost:3000/api/health

# Prüfe Prometheus Targets
curl http://localhost:9090/api/v1/targets
```

### Grafana zeigt keine Daten
1. Prüfe Prometheus Data Source in Grafana
2. Prüfe ob Prometheus Metriken sammelt
3. Prüfe Network Connectivity zwischen Services

## 📚 Weitere Ressourcen

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node Exporter](https://github.com/prometheus/node_exporter)

---

**🎯 Monitoring Stack ist bereit für Production!**
