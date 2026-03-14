(function (global) {
  "use strict";

  if (!global) return;

  function toNumber(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
  }

  function isPromiseLike(value) {
    return !!value && typeof value.then === "function";
  }

  function RefreshScheduler() {
    this.tasks = {};
    this.visibilityHandler = null;

    if (global.document && typeof global.document.addEventListener === "function") {
      var self = this;
      this.visibilityHandler = function () {
        self.onVisibilityChange();
      };
      global.document.addEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  RefreshScheduler.prototype.getTask = function (name) {
    return this.tasks[name] || null;
  };

  RefreshScheduler.prototype.register = function (config) {
    if (!config || !config.name || typeof config.callback !== "function") return;

    this.unregister(config.name);

    var task = {
      name: String(config.name),
      callback: config.callback,
      intervalMs: toNumber(config.intervalMs, 3000),
      backgroundIntervalMs: toNumber(config.backgroundIntervalMs, toNumber(config.intervalMs, 3000) * 3),
      maxBackoffMs: toNumber(config.maxBackoffMs, 60000),
      consecutiveErrors: 0,
      currentBackoffMs: 0,
      timerId: 0,
      running: false
    };

    this.tasks[task.name] = task;
    this.schedule(task.name, !!config.immediate);
  };

  RefreshScheduler.prototype.unregister = function (name) {
    var task = this.getTask(name);
    if (!task) return;
    if (task.timerId) {
      global.clearTimeout(task.timerId);
      task.timerId = 0;
    }
    delete this.tasks[name];
  };

  RefreshScheduler.prototype.destroy = function () {
    var names = Object.keys(this.tasks);
    for (var i = 0; i < names.length; i += 1) {
      this.unregister(names[i]);
    }
    if (global.document && this.visibilityHandler) {
      global.document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
    this.visibilityHandler = null;
  };

  RefreshScheduler.prototype.computeDelay = function (task, immediate) {
    if (immediate) return 0;
    var isHidden = !!(global.document && global.document.hidden);
    var baseInterval = isHidden ? task.backgroundIntervalMs : task.intervalMs;
    var withBackoff = baseInterval + task.currentBackoffMs;
    return Math.min(withBackoff, task.maxBackoffMs);
  };

  RefreshScheduler.prototype.schedule = function (name, immediate) {
    var self = this;
    var task = this.getTask(name);
    if (!task) return;

    if (task.timerId) {
      global.clearTimeout(task.timerId);
      task.timerId = 0;
    }

    var delay = this.computeDelay(task, !!immediate);
    task.timerId = global.setTimeout(function () {
      self.tick(name);
    }, delay);
  };

  RefreshScheduler.prototype.tick = function (name) {
    var self = this;
    var task = this.getTask(name);
    if (!task) return;
    if (task.running) {
      this.schedule(name, false);
      return;
    }

    task.running = true;
    var nextFromResult = function (ok) {
      task.running = false;
      if (ok) {
        task.consecutiveErrors = 0;
        task.currentBackoffMs = 0;
      } else {
        task.consecutiveErrors += 1;
        var multiplier = Math.pow(2, Math.min(task.consecutiveErrors, 4));
        task.currentBackoffMs = Math.min(task.maxBackoffMs, task.intervalMs * multiplier);
      }
      self.schedule(name, false);
    };

    try {
      var result = task.callback();
      if (isPromiseLike(result)) {
        result.then(
          function () {
            nextFromResult(true);
          },
          function () {
            nextFromResult(false);
          }
        );
      } else {
        nextFromResult(true);
      }
    } catch (_error) {
      nextFromResult(false);
    }
  };

  RefreshScheduler.prototype.wake = function (name) {
    if (name) {
      this.schedule(name, true);
      return;
    }
    var names = Object.keys(this.tasks);
    for (var i = 0; i < names.length; i += 1) {
      this.schedule(names[i], true);
    }
  };

  RefreshScheduler.prototype.onVisibilityChange = function () {
    if (global.document && !global.document.hidden) {
      this.wake();
    }
  };

  var defaultScheduler = null;

  function getDefaultScheduler() {
    if (!defaultScheduler) {
      defaultScheduler = new RefreshScheduler();
    }
    return defaultScheduler;
  }

  global.RefreshSchedulerRuntime = {
    RefreshScheduler: RefreshScheduler,
    getDefaultScheduler: getDefaultScheduler
  };
})(typeof window !== "undefined" ? window : undefined);
