$ErrorActionPreference = "Stop"
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

Write-Host "=== docker-reset (UberFoods) ==="
Write-Host "Stops containers and prunes Docker build cache. Does NOT remove DB volumes. Does NOT run wsl --shutdown."

Write-Host "`n[1] docker compose down --remove-orphans"
docker compose down --remove-orphans

Write-Host "`n[2] docker builder prune -af"
docker builder prune -af

Write-Host "`n[3] docker buildx prune -af (errors ignored)"
try {
  docker buildx prune -af 2>$null
} catch {}

# Optional aggressive prune (commented out; run manually if needed):
# docker system prune -af   # removes unused images/containers; add --volumes to remove volumes (e.g. postgres_data)

Write-Host "`n[4] NEXT STEPS"
Write-Host "  Rebuild and start (e.g. smoke compose, no host mounts):"
Write-Host "    docker compose -f docker-compose.yml -f docker-compose.smoke.yml build --no-cache backend"
Write-Host "    docker compose -f docker-compose.yml -f docker-compose.smoke.yml up -d"
Write-Host "  Optional: if Docker Desktop misbehaves, run manually: wsl --shutdown"
