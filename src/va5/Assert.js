(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Assert = va5.Assert || {}; va5.Assert = Assert;


  // NB: 元々は引数ミス対策の為に例外を投げていたが、
  //     引数ミスだとしても例外はなるべく投げない挙動とする事に変更になった


  // validate系機能は「値に問題がなければ」「補正後の値」が返される。
  // 「値に問題があれば」「consoleにエラーを出力し」「fallback値」が返される。
  // fallback値を指定できないものはnullを返すしかない(続行不可能)。
  // fallback値を指定できるものは適当に指定する事で、適当に続行できる。
  // ※nullが返されるものを || で補正する場合は注意が必要！
  // 0 まで補正されてしまうケースがある。


  Assert.validateNumber = function (label, min, v, max, fallback) {
    if (typeof v !== 'number' || !isFinite(v)) {
      va5._logError("" + label + " must be a number, but found " + v + " (" + typeof v + ")");
      return fallback;
    }
    // clampした結果を返す
    if (min != null) { v = Math.max(min, v); }
    if (max != null) { v = Math.min(v, max); }
    return v;
  };


  Assert.validateString = function (label, v, fallback) {
    if (typeof v !== 'string') {
      va5._logError("" + label + " must be a string, but found " + v + " (" + typeof v + ")");
      return fallback;
    }
    if (v === "") {
      va5._logError("" + label + " should not be empty string");
      return fallback;
    }
    return v;
  };


  // 不正ならnullを返す
  Assert.validatePath = function (v) {
    // 現状だとこれ以上のチェックはできない…
    return Assert.validateString("path", v, null);
  };


  // 不正ならnullを返す
  Assert.validateSeCh = function (v) {
    v = Assert.validateString("se-channel-id", v, null);
    if (v == null) { return null; }
    if (!v.match(/^sech\d\d\d\d$/)) {
      va5._logError("invalid se-channel-id " + v + " (" + typeof v + ")");
      return null;
    }
    return v;
  };


  // 不正ならnullを返す
  Assert.validateBgmCh = function (v) {
    // 数値なら文字列化する(hash keyにする為)
    if ("number" === typeof v) { v = v.toString(); }
    return Assert.validateString("bgm-channel-id", v, null);
  };


  // 不正ならnullを返す
  Assert.validateVoiceCh = function (v) {
    // 数値なら文字列化する(hash keyにする為)
    if ("number" === typeof v) { v = v.toString(); }
    return Assert.validateString("voice-channel-id", v, null);
  };


  // enums内にnullを含める事はできないのに注意
  Assert.validateEnum = function (label, v, enums, fallback) {
    var isFound = false;
    enums.forEach(function (e) { if (e === v) { isFound = true; } });
    if (!isFound) {
      va5._logError("" + label + " must be " +
        enums.map(JSON.stringify).join(" or ") + ", but found " + v +
        " (" + typeof v + ")");
      return fallback;
    }
    return v;
  };


  // 元々はこちらを使っていたが、なるべく使わない方針となった


  Assert.assertNumber = function (label, min, v, max) {
    var r = Assert.validateNumber(label, min, v, max, null);
    if (r == null) { throw new Error("assertion failed"); }
    return r;
  };
  Assert.assertString = function (label, v) {
    var r = Assert.validateString(label, v, null);
    if (r == null) { throw new Error("assertion failed"); }
    return r;
  };
  Assert.assertPath = function (v) {
    var r = Assert.validatePath(v);
    if (r == null) { throw new Error("assertion failed"); }
    return r;
  };
  Assert.assertSeCh = function (v) {
    var r = Assert.validateSeCh(v);
    if (r == null) { throw new Error("assertion failed"); }
    return r;
  };
  Assert.assertBgmCh = function (v) {
    var r = Assert.validateBgmCh(v);
    if (r == null) { throw new Error("assertion failed"); }
    return r;
  };
  Assert.assertVoiceCh = function (v) {
    var r = Assert.validateVoiceCh(v);
    if (r == null) { throw new Error("assertion failed"); }
    return r;
  };
  Assert.assertEnum = function (label, v, enums) {
    var r = Assert.validateEnum(label, v, enums, null);
    if (r == null) { throw new Error("assertion failed"); }
    return r;
  };



})(this);
