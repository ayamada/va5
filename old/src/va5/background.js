(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;

  va5._background = {};

  var isInstalled = false;
  var isInactiveNow = false;

  va5._background.startSupervise = function (h) {
    if (isInstalled) { return; }
    isInstalled = true;
    function changedVisibility (e) {
      isInactiveNow = (document.visibilityState === "hidden");
      if (h) { h(isInactiveNow); }
    }
    document.addEventListener("visibilitychange", changedVisibility);
    changedVisibility(null);
  };
  va5._background.isInBackground = function () {
    return isInactiveNow;
  };
})(this);
