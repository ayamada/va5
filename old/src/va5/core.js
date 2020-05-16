(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;

  va5._outputErrorLog = function (logObj) {
    if (!va5.config["is-output-error-log"]) { return; }
    var c = window.console;
    if (c) { c.error("va5:", logObj); }
  };
  va5._outputDebugLog = function (logObj) {
    if (!va5.config["is-output-debug-log"]) { return; }
    var c = window.console;
    if (c) { c.info("va5:", logObj); }
  };
})(this);
