const criticalDiagnosticPattern =
  /fatal|panic|unhandled|rejection|migration failed|connection refused|permission denied|module_not_found|enoent|segmentation fault/i;

const expectedShutdownDiagnostic =
  /FATAL:\s+the database system is shutting down\s*$/;
const expectedAdministratorDisconnect =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? UTC \[\d+\] FATAL:\s+terminating connection due to administrator command$/;

export function assertIsolatedProjectName(project) {
  if (!/^uberfoods_prod_sim_[a-f0-9]+$/.test(project)) {
    throw new Error("untrusted production simulation project name");
  }
  return project;
}

export function parseComposeLogLine(line) {
  const match = String(line).match(
    /^(\S+)\s+\|\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+(.*)$/,
  );
  if (!match) {
    const dockerMatch = String(line).match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+(.*)$/,
    );
    if (dockerMatch) {
      const timestamp = new Date(dockerMatch[1]);
      return {
        raw: String(line),
        timestamp: Number.isNaN(timestamp.getTime()) ? undefined : timestamp,
        message: dockerMatch[2],
      };
    }
    return {
      raw: String(line),
      service: undefined,
      timestamp: undefined,
      message: String(line),
    };
  }
  const timestamp = new Date(match[2]);
  return {
    raw: String(line),
    service: match[1],
    timestamp: Number.isNaN(timestamp.getTime()) ? undefined : timestamp,
    message: match[3],
  };
}

export function auditRuntimeLogs(
  logs,
  {
    phase,
    postgresService = "postgres-1",
    recreateStartedAt,
    recoveredAt,
    containerRecreated = false,
    postgresHealthy = false,
    persistenceVerified = false,
    oldContainerId,
    newContainerId,
    oldContainerStopStartedAt,
    oldContainerStoppedAt,
    backendRecoveryAt,
    sourceContainerId,
    maxExpectedShutdownDiagnostics = 1,
  } = {},
) {
  const unexpected = [];
  let expectedShutdowns = 0;

  for (const line of String(logs).split(/\r?\n/)) {
    if (
      !criticalDiagnosticPattern.test(line) ||
      /not allowed by cors/i.test(line)
    ) {
      continue;
    }

    const parsed = parseComposeLogLine(line);
    const isExpectedShutdown =
      phase === "postgres-recreate" &&
      parsed.service === postgresService &&
      parsed.timestamp instanceof Date &&
      recreateStartedAt instanceof Date &&
      recoveredAt instanceof Date &&
      parsed.timestamp >= recreateStartedAt &&
      parsed.timestamp <= recoveredAt &&
      expectedShutdownDiagnostic.test(parsed.message) &&
      containerRecreated &&
      postgresHealthy &&
      persistenceVerified;

    const isExpectedAdministratorDisconnect =
      phase === "postgres-recreate" &&
      parsed.timestamp instanceof Date &&
      oldContainerStopStartedAt instanceof Date &&
      oldContainerStoppedAt instanceof Date &&
      parsed.timestamp >= oldContainerStopStartedAt &&
      parsed.timestamp <= oldContainerStoppedAt &&
      sourceContainerId === oldContainerId &&
      sourceContainerId !== newContainerId &&
      expectedAdministratorDisconnect.test(parsed.message) &&
      containerRecreated &&
      postgresHealthy &&
      persistenceVerified &&
      backendRecoveryAt instanceof Date;

    if (isExpectedShutdown || isExpectedAdministratorDisconnect) {
      expectedShutdowns += 1;
      continue;
    }
    unexpected.push(line);
  }

  if (expectedShutdowns > maxExpectedShutdownDiagnostics) {
    unexpected.push(
      `postgres lifecycle emitted ${expectedShutdowns} expected shutdown diagnostics; maximum is ${maxExpectedShutdownDiagnostics}`,
    );
  }

  return { unexpected, expectedShutdowns };
}

export function assertPostgresRecreateEvidence({
  oldContainerId,
  newContainerId,
  oldVolumeName,
  newVolumeName,
  oldVolumeCreatedAt,
  newVolumeCreatedAt,
  postgresHealthy,
  persistenceVerified,
  seedRanAfterRecreate = false,
}) {
  if (!oldContainerId || !newContainerId || oldContainerId === newContainerId)
    throw new Error("PostgreSQL container was not recreated");
  if (!oldVolumeName || oldVolumeName !== newVolumeName)
    throw new Error("PostgreSQL volume identity changed during recreate");
  if (!oldVolumeCreatedAt || oldVolumeCreatedAt !== newVolumeCreatedAt)
    throw new Error("PostgreSQL volume was replaced during recreate");
  if (!postgresHealthy)
    throw new Error("PostgreSQL did not recover healthy after recreate");
  if (!persistenceVerified)
    throw new Error("PostgreSQL persistence comparison did not pass");
  if (seedRanAfterRecreate)
    throw new Error("seed execution after PostgreSQL recreate is forbidden");
}

export function assertCleanupVolumeOwnership({
  project,
  volumeName,
  expectedVolumeName,
  projectLabel,
  volumeLabel,
  attachedContainerProjects = [],
}) {
  assertIsolatedProjectName(project);
  if (!volumeName || volumeName !== expectedVolumeName)
    throw new Error("cleanup volume does not match captured PostgreSQL volume");
  if (projectLabel !== project)
    throw new Error("cleanup volume project label is not isolated");
  if (volumeLabel !== "postgres-data")
    throw new Error("cleanup volume key is not postgres-data");
  if (attachedContainerProjects.some((label) => label !== project))
    throw new Error("cleanup volume is attached to a foreign container");
}
