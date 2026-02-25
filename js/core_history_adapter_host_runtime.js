(function (global) {
  "use strict";

  if (!global) return;

  function isRecord(value) {
    return !!value && typeof value === "object";
  }

  function asFunction(value) {
    return typeof value === "function" ? value : null;
  }

  function toRecord(value) {
    return isRecord(value) ? value : {};
  }

  function toText(value) {
    return typeof value === "string" ? value : "";
  }

  function resolveHistoryAdapterRecordRenderState(input) {
    var source = isRecord(input) ? input : {};
    var runtime = toRecord(source.historyAdapterDiagnosticsRuntime);
    var resolveHistoryAdapterParityStatus = asFunction(runtime.resolveHistoryAdapterParityStatus);
    var resolveHistoryAdapterBadgeState = asFunction(runtime.resolveHistoryAdapterBadgeState);
    var resolveHistoryAdapterDiagnosticsState = asFunction(
      runtime.resolveHistoryAdapterDiagnosticsState
    );
    var resolveHistoryAdapterBadgeHtml = asFunction(runtime.resolveHistoryAdapterBadgeHtml);
    var resolveHistoryAdapterDiagnosticsHtml = asFunction(
      runtime.resolveHistoryAdapterDiagnosticsHtml
    );
    if (
      !resolveHistoryAdapterParityStatus ||
      !resolveHistoryAdapterBadgeState ||
      !resolveHistoryAdapterDiagnosticsState ||
      !resolveHistoryAdapterBadgeHtml ||
      !resolveHistoryAdapterDiagnosticsHtml
    ) {
      return {
        adapterBadgeHtml: "",
        adapterDiagnosticsHtml: ""
      };
    }

    var parityStatus = resolveHistoryAdapterParityStatus(source.localHistoryStore, source.item);
    var badgeState = resolveHistoryAdapterBadgeState(source.item, parityStatus);
    var diagnosticsState = resolveHistoryAdapterDiagnosticsState(source.item);
    return {
      adapterBadgeHtml: toText(resolveHistoryAdapterBadgeHtml(badgeState)),
      adapterDiagnosticsHtml: toText(resolveHistoryAdapterDiagnosticsHtml(diagnosticsState))
    };
  }

  global.CoreHistoryAdapterHostRuntime = global.CoreHistoryAdapterHostRuntime || {};
  global.CoreHistoryAdapterHostRuntime.resolveHistoryAdapterRecordRenderState =
    resolveHistoryAdapterRecordRenderState;
})(typeof window !== "undefined" ? window : undefined);
