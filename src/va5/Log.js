(function(exports) {
  "use strict";
  var va5 = (function (k) {
    va5 = exports[k] || {}; exports[k] = va5; return va5;
  })(("[object Object]" !== exports.toString()) ? "va5" : "exports");
  var Log = va5.Log || {}; va5.Log = Log;

  Log.error = function (logObj) {
    if (!va5.getConfig("is-output-error-log")) { return; }
    var c = window.console;
    if (c) { c.error("va5:", logObj); }
  };

  Log.debug = function (logObj) {
    if (!va5.getConfig("is-output-debug-log")) { return; }
    var c = window.console;
    if (c) { c.info("va5:", logObj); }
  };

})(this);
