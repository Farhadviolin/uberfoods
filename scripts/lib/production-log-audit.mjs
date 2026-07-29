const criticalDiagnosticPattern =
  /fatal|panic|\berror:\s|unhandled|rejection|migration failed|connection refused|permission denied|module_not_found|enoent|segmentation fault|assertion failed|corrupt(?:ion|ed)|data loss|crash(?:ed)?/i;

const expectedShutdownDiagnostic =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? UTC \[\d+\] FATAL:\s+the database system is shutting down$/;
const expectedAdministratorDisconnect =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? UTC \[\d+\] FATAL:\s+terminating connection due to administrator command$/;
const bootstrapFastShutdown =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? UTC \[\d+\] LOG:\s+received fast shutdown request$/;
const bootstrapInitComplete =
  /^PostgreSQL init process complete; ready for start up\.$/;
const postgresReady =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? UTC \[\d+\] LOG:\s+database system is ready to accept connections$/;
const postgresShutdownComplete =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? UTC \[\d+\] LOG:\s+database system is shut down$/;
const postgresMessageSuffix =
  /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? UTC \[\d+\] (?:LOG|FATAL|PANIC):\s+.*)$/;

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

function normalizePostgresMessage(message) {
  const value = String(message).trim();
  return value.match(postgresMessageSuffix)?.[1] ?? value;
}

export function auditRuntimeLogs(
  logs,
  {
    phase,
    bootstrapWindowStart,
    bootstrapWindowEnd,
    initialContainerId,
    isolatedNamespace,
    freshNamespaceVerified = false,
    initialVolumeName,
    expectedInitialVolumeName,
    initialVolumeIdentity,
    initialVolumeCreatedAt,
    applicationDatabaseReachable = false,
    migrationsApplied = false,
    schemaReachable = false,
    databaseOperationVerified = false,
    seedSucceeded = false,
    seedIdempotent = false,
    postgresHealthy = false,
    backendReady = false,
    recreateRequestedAt,
    shutdownWindowStart,
    shutdownWindowEnd,
    oldPostgresContainerEndedAt,
    newPostgresContainerStartedAt,
    postgresVolumeIdentityBefore,
    postgresVolumeIdentityAfter,
    postgresRecovered = false,
    backendRecovered = false,
    persistenceVerified = false,
    ownershipVerified = false,
    oldContainerId,
    newContainerId,
    sourceContainerId,
    controlledStop,
  } = {},
) {
  const unexpected = [];
  const classifiedBootstrapShutdownDiagnostics = [];
  const classifiedRecreateShutdownDiagnostics = [];
  const classifiedExpectedShutdownDiagnostics = [];

  const isFullContainerId = (value) => /^[a-f0-9]{64}$/.test(value ?? "");
  const isIsolatedNamespace = (value) =>
    /^uberfoods_prod_sim_[a-f0-9]+$/.test(value ?? "");
  const isValidDate = (value) =>
    value instanceof Date && !Number.isNaN(value.getTime());
  const parsedLines = String(logs)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      const parsed = parseComposeLogLine(line);
      return {
        ...parsed,
        index,
        normalizedMessage: normalizePostgresMessage(parsed.message),
      };
    });
  const seenLogRecords = new Set();
  const distinctParsedLines = parsedLines.filter((parsed) => {
    const recordIdentity = parsed.raw;
    if (seenLogRecords.has(recordIdentity)) return false;
    seenLogRecords.add(recordIdentity);
    return true;
  });
  const volumeCreatedAt = new Date(initialVolumeCreatedAt);
  const bootstrapWindowStartSecond = isValidDate(bootstrapWindowStart)
    ? new Date(Math.floor(bootstrapWindowStart.getTime() / 1000) * 1000)
    : undefined;
  const bootstrapLifecycleEvidenceIsComplete =
    phase === "fresh-database-initdb" &&
    isFullContainerId(initialContainerId) &&
    isFullContainerId(sourceContainerId) &&
    sourceContainerId === initialContainerId &&
    isIsolatedNamespace(isolatedNamespace) &&
    freshNamespaceVerified &&
    typeof initialVolumeName === "string" &&
    initialVolumeName === expectedInitialVolumeName &&
    typeof initialVolumeIdentity === "string" &&
    initialVolumeIdentity.length > 0 &&
    isValidDate(volumeCreatedAt) &&
    isValidDate(bootstrapWindowStart) &&
    isValidDate(bootstrapWindowEnd) &&
    bootstrapWindowStart <= bootstrapWindowEnd &&
    volumeCreatedAt >= bootstrapWindowStartSecond &&
    volumeCreatedAt <= bootstrapWindowEnd &&
    !isValidDate(recreateRequestedAt) &&
    postgresHealthy &&
    applicationDatabaseReachable &&
    migrationsApplied &&
    schemaReachable &&
    databaseOperationVerified &&
    seedSucceeded &&
    seedIdempotent &&
    backendReady;
  const bootstrapLines = distinctParsedLines.filter(
    (line) =>
      isValidDate(line.timestamp) &&
      isValidDate(bootstrapWindowStart) &&
      isValidDate(bootstrapWindowEnd) &&
      line.timestamp >= bootstrapWindowStart &&
      line.timestamp <= bootstrapWindowEnd,
  );
  const bootstrapFatalCandidates = bootstrapLines.filter((line) =>
    expectedShutdownDiagnostic.test(line.normalizedMessage),
  );
  const bootstrapFatal = bootstrapFatalCandidates[0];
  const fastShutdown = bootstrapFatal
    ? bootstrapLines.find(
        (line) =>
          line.index < bootstrapFatal.index &&
          line.timestamp <= bootstrapFatal.timestamp &&
          bootstrapFastShutdown.test(line.normalizedMessage),
      )
    : undefined;
  const initComplete = bootstrapFatal
    ? bootstrapLines.find(
        (line) =>
          line.index > bootstrapFatal.index &&
          line.timestamp >= bootstrapFatal.timestamp &&
          bootstrapInitComplete.test(line.normalizedMessage),
      )
    : undefined;
  const finalReady = initComplete
    ? bootstrapLines.find(
        (line) =>
          line.index > initComplete.index &&
          line.timestamp >= initComplete.timestamp &&
          postgresReady.test(line.normalizedMessage),
      )
    : undefined;
  const additionalBootstrapSevereDiagnostics = bootstrapLines.filter(
    (line) =>
      criticalDiagnosticPattern.test(line.normalizedMessage) &&
      line !== bootstrapFatal,
  );
  const bootstrapSequenceIsComplete =
    bootstrapLifecycleEvidenceIsComplete &&
    bootstrapFatalCandidates.length === 1 &&
    Boolean(fastShutdown) &&
    Boolean(initComplete) &&
    Boolean(finalReady) &&
    additionalBootstrapSevereDiagnostics.length === 0;
  const controlledStopStartedAt = new Date(controlledStop?.startedAt);
  const controlledStopEndedAt = new Date(controlledStop?.endedAt);
  const controlledStopRequested =
    phase === "postgres-recreate" &&
    isIsolatedNamespace(isolatedNamespace) &&
    isFullContainerId(oldContainerId) &&
    isFullContainerId(sourceContainerId) &&
    sourceContainerId === oldContainerId &&
    controlledStop?.eventType === "controlled-postgres-stop" &&
    controlledStop?.namespace === isolatedNamespace &&
    controlledStop?.targetContainerId === oldContainerId &&
    controlledStop?.exitCode === 0 &&
    controlledStop?.operation === "docker compose stop postgres" &&
    isValidDate(controlledStopStartedAt) &&
    isValidDate(controlledStopEndedAt) &&
    isValidDate(recreateRequestedAt) &&
    isValidDate(shutdownWindowStart) &&
    isValidDate(shutdownWindowEnd) &&
    isValidDate(oldPostgresContainerEndedAt) &&
    shutdownWindowStart.getTime() === recreateRequestedAt.getTime() &&
    controlledStopStartedAt.getTime() === recreateRequestedAt.getTime() &&
    shutdownWindowStart <= shutdownWindowEnd &&
    controlledStopEndedAt.getTime() === oldPostgresContainerEndedAt.getTime() &&
    shutdownWindowEnd.getTime() === oldPostgresContainerEndedAt.getTime();
  const lifecycleMarkerLines = distinctParsedLines.filter(
    (line) =>
      bootstrapFastShutdown.test(line.normalizedMessage) ||
      postgresShutdownComplete.test(line.normalizedMessage),
  );
  const shutdownStartCandidates = lifecycleMarkerLines.filter((line) =>
    bootstrapFastShutdown.test(line.normalizedMessage),
  );
  const shutdownCompletedCandidates = lifecycleMarkerLines.filter((line) =>
    postgresShutdownComplete.test(line.normalizedMessage),
  );
  const shutdownStartedAt = shutdownStartCandidates[0];
  const shutdownCompletedAt = shutdownCompletedCandidates[0];
  const markerSourceIsConsistent = lifecycleMarkerLines.every(
    ({ service }) =>
      !isFullContainerId(service) || service === sourceContainerId,
  );
  const markerIsWithinShutdownWindow = (line) =>
    isValidDate(line?.timestamp) &&
    line.timestamp >= shutdownWindowStart &&
    line.timestamp <= shutdownWindowEnd;
  const shutdownStarted =
    controlledStopRequested &&
    markerSourceIsConsistent &&
    shutdownStartCandidates.length === 1 &&
    markerIsWithinShutdownWindow(shutdownStartedAt);
  const shutdownCompleted =
    shutdownStarted &&
    shutdownCompletedCandidates.length === 1 &&
    markerIsWithinShutdownWindow(shutdownCompletedAt) &&
    shutdownStartedAt.index < shutdownCompletedAt.index &&
    shutdownStartedAt.timestamp < shutdownCompletedAt.timestamp &&
    shutdownCompletedAt.timestamp <= oldPostgresContainerEndedAt;
  const containerRecreated =
    shutdownCompleted &&
    isFullContainerId(newContainerId) &&
    oldContainerId !== newContainerId &&
    isValidDate(newPostgresContainerStartedAt) &&
    oldPostgresContainerEndedAt < newPostgresContainerStartedAt &&
    typeof postgresVolumeIdentityBefore === "string" &&
    postgresVolumeIdentityBefore.length > 0 &&
    postgresVolumeIdentityBefore === postgresVolumeIdentityAfter;
  const databaseRecovered = containerRecreated && postgresRecovered;
  const backendRecoveryCompleted = databaseRecovered && backendRecovered;
  const persistenceIsVerified = backendRecoveryCompleted && persistenceVerified;
  const ownershipIsVerified = persistenceIsVerified && ownershipVerified;
  const lifecycleState = {
    controlledStopRequested,
    shutdownStarted,
    shutdownCompleted,
    containerRecreated,
    databaseRecovered,
    backendRecovered: backendRecoveryCompleted,
    persistenceVerified: persistenceIsVerified,
    ownershipVerified: ownershipIsVerified,
  };
  const lifecycleStateIsComplete = Object.values(lifecycleState).every(Boolean);

  for (const parsed of distinctParsedLines) {
    const line = parsed.raw;
    if (
      !criticalDiagnosticPattern.test(line) ||
      /not allowed by cors/i.test(line)
    ) {
      continue;
    }

    if (
      parsed === bootstrapFatal &&
      bootstrapSequenceIsComplete &&
      expectedShutdownDiagnostic.test(parsed.normalizedMessage)
    ) {
      const diagnostic = {
        sourceContainerId,
        timestamp: parsed.timestamp.toISOString(),
        normalizedMessage: parsed.normalizedMessage,
        classification: "EXPECTED_POSTGRES_INITDB_BOOTSTRAP_SHUTDOWN",
        matchedRule: "postgres-initdb-bootstrap-shutdown",
        bootstrapSequence: {
          fastShutdownAt: fastShutdown.timestamp.toISOString(),
          fatalAt: parsed.timestamp.toISOString(),
          initCompleteAt: initComplete.timestamp.toISOString(),
          finalReadyAt: finalReady.timestamp.toISOString(),
        },
        evidenceReferences: [
          "postgres-bootstrap.json",
          "runtime-log-audit.json",
        ],
      };
      classifiedBootstrapShutdownDiagnostics.push(diagnostic);
      classifiedExpectedShutdownDiagnostics.push(diagnostic);
      continue;
    }

    if (phase !== "postgres-recreate") unexpected.push(line);
  }

  if (phase === "postgres-recreate") {
    const lifecycleSevereDiagnostics = distinctParsedLines.filter(
      (parsed) =>
        criticalDiagnosticPattern.test(parsed.normalizedMessage) &&
        !/not allowed by cors/i.test(parsed.normalizedMessage),
    );
    const sourceIdentityIsConsistent = lifecycleSevereDiagnostics.every(
      ({ service }) =>
        !isFullContainerId(service) || service === sourceContainerId,
    );
    const isKnownShutdownDiagnostic = (line) =>
      expectedAdministratorDisconnect.test(line.normalizedMessage) ||
      expectedShutdownDiagnostic.test(line.normalizedMessage);
    const isBoundToProvenShutdown = (line) =>
      lifecycleStateIsComplete &&
      sourceIdentityIsConsistent &&
      isKnownShutdownDiagnostic(line) &&
      isValidDate(line.timestamp) &&
      line.timestamp >= shutdownWindowStart &&
      line.timestamp <= shutdownWindowEnd &&
      line.timestamp < shutdownCompletedAt.timestamp;

    for (const diagnosticLine of lifecycleSevereDiagnostics) {
      if (isBoundToProvenShutdown(diagnosticLine)) {
        const matchedRule = expectedAdministratorDisconnect.test(
          diagnosticLine.normalizedMessage,
        )
          ? "postgres-administrator-disconnect-during-proven-container-recreate"
          : "postgres-database-shutdown-during-proven-container-recreate";
        const diagnostic = {
          sourceContainerId,
          timestamp: diagnosticLine.timestamp.toISOString(),
          normalizedMessage: diagnosticLine.normalizedMessage,
          classification: "EXPECTED_CONTROLLED_POSTGRES_SHUTDOWN",
          matchedRule,
          lifecyclePosition:
            "after-control-plane-stop-start-before-postgres-shutdown-complete",
          controlPlaneWindow: {
            startedAt: shutdownWindowStart.toISOString(),
            endedAt: shutdownWindowEnd.toISOString(),
          },
          postgresShutdownMarkers: {
            startedAt: shutdownStartedAt.timestamp.toISOString(),
            completedAt: shutdownCompletedAt.timestamp.toISOString(),
          },
          evidenceReferences: [
            "postgres-recreate.json",
            "persistence-before.json",
            "persistence-after.json",
            "runtime-log-audit.json",
          ],
        };
        classifiedRecreateShutdownDiagnostics.push(diagnostic);
        classifiedExpectedShutdownDiagnostics.push(diagnostic);
      } else {
        unexpected.push(diagnosticLine.raw);
      }
    }
    if (!lifecycleStateIsComplete) {
      unexpected.push(
        "controlled PostgreSQL shutdown lifecycle state is incomplete or invalid",
      );
    }
  }

  return {
    unexpected,
    expectedShutdowns: classifiedExpectedShutdownDiagnostics.length,
    classifiedExpectedShutdownDiagnostics,
    classifiedBootstrapShutdownDiagnostics,
    classifiedRecreateShutdownDiagnostics,
    expectedControlledShutdownDiagnostics:
      classifiedRecreateShutdownDiagnostics,
    unexpectedFatalDiagnostics: unexpected,
    unexplainedFatalDiagnostics: unexpected,
    lifecycleState,
  };
}

export function assertPostgresRecreateEvidence({
  oldContainerId,
  newContainerId,
  oldVolumeName,
  newVolumeName,
  oldVolumeCreatedAt,
  newVolumeCreatedAt,
  postgresVolumeIdentityBefore,
  postgresVolumeIdentityAfter,
  recreateRequestedAt,
  oldPostgresContainerEndedAt,
  newPostgresContainerStartedAt,
  postgresRecovered,
  backendRecovered,
  persistenceVerified,
  ownershipVerified,
  seedRanAfterRecreate = false,
}) {
  if (!oldContainerId || !newContainerId || oldContainerId === newContainerId)
    throw new Error("PostgreSQL container was not recreated");
  if (!oldVolumeName || oldVolumeName !== newVolumeName)
    throw new Error("PostgreSQL volume identity changed during recreate");
  if (!oldVolumeCreatedAt || oldVolumeCreatedAt !== newVolumeCreatedAt)
    throw new Error("PostgreSQL volume was replaced during recreate");
  if (
    !postgresVolumeIdentityBefore ||
    postgresVolumeIdentityBefore !== postgresVolumeIdentityAfter
  )
    throw new Error("PostgreSQL inspected volume identity changed");
  for (const [name, value] of [
    ["recreate request", recreateRequestedAt],
    ["old PostgreSQL container end", oldPostgresContainerEndedAt],
    ["new PostgreSQL container start", newPostgresContainerStartedAt],
  ]) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime()))
      throw new Error(`${name} timestamp is missing or invalid`);
  }
  if (
    recreateRequestedAt > oldPostgresContainerEndedAt ||
    oldPostgresContainerEndedAt >= newPostgresContainerStartedAt
  )
    throw new Error("PostgreSQL recreate event order is contradictory");
  if (!postgresRecovered)
    throw new Error("PostgreSQL did not recover healthy after recreate");
  if (!backendRecovered)
    throw new Error("backend did not recover after PostgreSQL recreate");
  if (!persistenceVerified)
    throw new Error("PostgreSQL persistence comparison did not pass");
  if (!ownershipVerified)
    throw new Error("PostgreSQL ownership comparison did not pass");
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
