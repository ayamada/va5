(function(exports) {
  "use strict";
  var va5 = (function (k) {
    va5 = exports[k] || {}; exports[k] = va5; return va5;
  })(("[object Object]" !== exports.toString()) ? "va5" : "exports");
  var Background = va5.Background || {}; va5.Background = Background;


  var isInstalled = false;
  var isInactiveNow = false;

  Background.startSupervise = function (h) {
    if (isInstalled) { return; }
    isInstalled = true;
    function changedVisibility (e) {
      isInactiveNow = (document.visibilityState === "hidden");
      if (h) { h(isInactiveNow); }
    }
    document.addEventListener("visibilitychange", changedVisibility);
    changedVisibility(null);
  };

  Background.isInBackground = function () {
    return isInactiveNow;
  };


})(this);
