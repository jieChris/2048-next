function GameManager(size, InputManager, Actuator, ScoreManager) {
  initializeGameManagerCoreFields(this, size, InputManager, Actuator, ScoreManager);
  initializeGameManagerRuntimeState(this);
  bindGameManagerInputEvents(this);
  initializeGameManagerUi(this);
  bindGameManagerSavedStatePersistence(this);
  this.setup();
}

applyGameManagerStaticConfiguration();

bindGameManagerPrototypeRuntime();
