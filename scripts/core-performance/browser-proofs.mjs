function exactJson(value) {
  return JSON.stringify(value);
}

function validateRestoreProof(expected, actual) {
  if (exactJson(actual?.board) !== exactJson(expected?.board)) {
    throw new Error("restored board does not exactly match the saved board");
  }
  if (Number(actual?.score) !== Number(expected?.score)) {
    throw new Error("restored score does not exactly match the saved score");
  }
  if (exactJson(actual?.moveHistory) !== exactJson(expected?.moveHistory)) {
    throw new Error(
      "restored move history does not exactly match saved move history",
    );
  }
  return true;
}

function validateReplayStepProof(result) {
  if (
    !result?.imported ||
    !Number.isInteger(result.total) ||
    result.total <= 0
  ) {
    throw new Error("replay import did not produce replay actions");
  }
  if (result.beforeIndex !== 0 || result.afterIndex !== 1) {
    throw new Error("replay first step must advance exactly from 0 to 1");
  }
  if (
    exactJson(result.firstAction) !== exactJson(result.executedAction) ||
    result.firstAction == null
  ) {
    throw new Error("replay step did not execute the imported first action");
  }
  if (exactJson(result.beforeBoard) === exactJson(result.afterBoard)) {
    throw new Error("replay first step did not change the board");
  }
  return true;
}

function sameSessionIdentity(actual, expected) {
  return Boolean(
    actual &&
    actual.challenge_id === expected.challenge_id &&
    Number(actual.seed) === Number(expected.seed) &&
    actual.ranked_session_token === expected.ranked_session_token &&
    Number(actual.spawn_sequence_version) === 2,
  );
}

function validateRankedFixtureProof({
  manager,
  active,
  prefetched,
  prefetchFailureReason,
  activeFixture,
  prefetchFixture,
} = {}) {
  const expectedActive = activeFixture || active;
  const expectedPrefetch = prefetchFixture || prefetched;
  const managerIdentity = manager
    ? {
        challenge_id: manager.challengeId,
        seed: manager.initialSeed,
        ranked_session_token: manager.rankedSessionToken,
        spawn_sequence_version: manager.spawnSequenceVersion,
      }
    : null;
  if (
    !expectedActive ||
    !expectedPrefetch ||
    !sameSessionIdentity(active, expectedActive) ||
    !sameSessionIdentity(managerIdentity, expectedActive) ||
    !sameSessionIdentity(prefetched, expectedPrefetch) ||
    String(prefetchFailureReason || "") !== ""
  ) {
    throw new Error("ranked fixture manager/session/prefetch proof failed");
  }
  return true;
}

export {
  validateRankedFixtureProof,
  validateReplayStepProof,
  validateRestoreProof,
};
