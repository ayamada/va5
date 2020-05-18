(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Log = va5.Log || {}; va5.Log = Log;

  Log.error = function (logObj) {
    if (!va5.config["is-output-error-log"]) { return; }
    var c = window.console;
    if (c) { c.error("va5:", logObj); }
  };

  Log.debug = function (logObj) {
    if (!va5.config["is-output-debug-log"]) { return; }
    var c = window.console;
    if (c) { c.info("va5:", logObj); }
  };

  // assert系は厳密にはLogではないがここに入れる事に
  Log.assertNumber = function (label, min, v, max) {
    if (typeof v !== 'number' || !isFinite(v)) {
      throw new Error("" + label + " must be a number, but found " + v + " (" + typeof v + ")");
    }
    // clampした結果を返す
    if (min != null) { v = Math.max(min, v); }
    if (max != null) { v = Math.min(v, max); }
    return v;
  };

  function assertString (label, v) {
    if (typeof v !== 'string') {
      throw new Error("" + label + " must be a string, but found " + v + " (" + typeof v + ")");
    }
    return v;
  }

  Log.assertPath = function (v) {
    // 現状だとこれ以上のチェックはできない…
    return assertString("path", v);
  };

  Log.assertSeCh = function (v) {
    assertString("se-channel-id", v);
    if (!v.match(/^sech\d\d\d\d\d\d\d\d$/)) {
      throw new Error("invalid se-channel-id " + v + " (" + typeof v + ")");
    }
    return v;
  };

  Log.assertBgmCh = function (v) {
    // 今のところ「文字列である事」以上の制約はなし
    return assertString("bgm-channel-id", v);
  };

})(this);
