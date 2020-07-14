(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
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
