(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
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

  Background.isInBackground_ = function () {
    return isInactiveNow;
  };


})(this);
