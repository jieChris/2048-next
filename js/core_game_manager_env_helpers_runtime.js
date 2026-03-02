function getWebStorageByName(name) {
  try {
    return (typeof window !== "undefined" && window[name]) ? window[name] : null;
  } catch (_err) {
    return null;
  }
}

function getWindowLike() {
  return typeof window !== "undefined" ? window : null;
}

function resolveManagerDocumentLike(manager) {
  var windowLike = manager && typeof manager.getWindowLike === "function"
    ? manager.getWindowLike()
    : getWindowLike();
  return windowLike && windowLike.document
    ? windowLike.document
    : (typeof document !== "undefined" ? document : null);
}

function resolveManagerElementById(manager, elementId) {
  if (typeof elementId !== "string" || !elementId) return null;
  var documentLike = resolveManagerDocumentLike(manager);
  if (!documentLike || typeof documentLike.getElementById !== "function") return null;
  return documentLike.getElementById(elementId);
}

function canReadFromStorage(storage) {
  return !!(storage && typeof storage.getItem === "function");
}

function canWriteToStorage(storage) {
  return !!(storage && typeof storage.setItem === "function");
}

function resolveWindowMethod(manager, methodName) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  if (!windowLike || typeof methodName !== "string" || !methodName) return null;
  var method = windowLike[methodName];
  if (typeof method !== "function") return null;
  return {
    windowLike: windowLike,
    method: method
  };
}

function callWindowMethod(manager, methodName, args) {
  if (!manager) return false;
  var resolved = resolveWindowMethod(manager, methodName);
  if (!resolved) return false;
  resolved.method.apply(resolved.windowLike, Array.isArray(args) ? args : []);
  return true;
}

function resolveWindowNamespaceMethod(manager, namespaceName, methodName) {
  if (!manager) return null;
  var windowLike = manager.getWindowLike();
  if (!windowLike) return null;
  if (typeof namespaceName !== "string" || !namespaceName) return null;
  if (typeof methodName !== "string" || !methodName) return null;
  var scope = windowLike[namespaceName];
  if (!scope || (typeof scope !== "object" && typeof scope !== "function")) return null;
  var method = scope[methodName];
  if (typeof method !== "function") return null;
  return {
    windowLike: windowLike,
    scope: scope,
    method: method
  };
}

function callWindowNamespaceMethod(manager, namespaceName, methodName, args) {
  if (!manager) return false;
  var resolved = resolveWindowNamespaceMethod(manager, namespaceName, methodName);
  if (!resolved) return false;
  resolved.method.apply(resolved.scope, Array.isArray(args) ? args : []);
  return true;
}

function requestAnimationFrameByManager(manager, callback) {
  if (!manager) return false;
  if (typeof callback !== "function") return false;
  var raf = resolveWindowMethod(manager, "requestAnimationFrame");
  if (raf) {
    raf.method.call(raf.windowLike, callback);
    return true;
  }
  callback();
  return false;
}
