(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Assert = va5.Assert || {}; va5.Assert = Assert;

  Assert.assertNumber = function (label, min, v, max) {
    if (typeof v !== 'number' || !isFinite(v)) {
      throw new Error("" + label + " must be a number, but found " + v + " (" + typeof v + ")");
    }
    // clampした結果を返す
    if (min != null) { v = Math.max(min, v); }
    if (max != null) { v = Math.min(v, max); }
    return v;
  };

  Assert.assertString = function (label, v) {
    if (typeof v !== 'string') {
      throw new Error("" + label + " must be a string, but found " + v + " (" + typeof v + ")");
    }
    return v;
  };

  Assert.assertPath = function (v) {
    // 現状だとこれ以上のチェックはできない…
    return Assert.assertString("path", v);
  };

  Assert.assertSeCh = function (v) {
    Assert.assertString("se-channel-id", v);
    if (!v.match(/^sech\d\d\d\d$/)) {
      throw new Error("invalid se-channel-id " + v + " (" + typeof v + ")");
    }
    return v;
  };

  Assert.assertBgmCh = function (v) {
    // 今のところ「文字列である事」以上の制約はなし
    return Assert.assertString("bgm-channel-id", v);
  };

})(this);
