(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;

  va5.version = "(TODO)"; // reserved(将来に更新しやすい機構を導入したら対応)

  // NB: percentは小数を持たない扱いである事に注意
  va5.floatToPercent = function (f) { return Math.round(f * 100); };
  va5.percentToFloat = function (p) { return p * 0.01; };
})(this);
