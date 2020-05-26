(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Config = va5.Config || {}; va5.Config = Config;

  function deepCopy (obj) { return JSON.parse(JSON.stringify(obj)); }

  // TODO: 「defmacroでdefentryを定義する」みたいな方向での対応にしたい。
  //       (現状だとエントリ追加時にあちこちいじる必要がありミスしやすい)
  //       ただ、Objectのgetter/setterの仕様的に、それが可能なのか微妙。
  //       (後からgetter/setterを追加できる、古いブラウザでも動く方式はある？)
  //       できそうなら対応したい
  //       (おそらくpolyfill入れて対応するしかない気はするが…)

  // 考えた結果、va4互換のkebab-caseのkeyにする事にした。何故ならここを下手に
  // property化してしまうとgccのoptimizationsによって短縮されてしまう為。
  // (externs指定すればよいのだが、それもうっかり忘れて気付かないケースが
  // ありえる。気軽にconfig項目を追加できなくなる)
  // それなら最初からproperty指定できないkebab-caseで固定としたい。
  // ただしlisp的な「boolean値は末尾に?をつける」のはやめて、
  // 「boolean値は先頭にis-をつける」ようにした。
  var initialData = {
    "is-output-error-log": true,
    "is-output-debug-log": false,
    "volume-master": 0.8,
    "volume-bgm": 0.5,
    "volume-se": 0.5,
    "volume-voice": 0.5,
    "default-bgm-fade-sec": 1,
    "default-se-fade-sec": 0,
    "default-voice-fade-sec": 0.1,
    "is-pause-on-background": true,
    "se-chattering-sec": 0.05,
    "additional-query-string": null // 自動ではuriエスケープされない、要注意
  };

  var d = deepCopy(initialData);

  Config.data = {
    get "is-output-error-log" () { return d["is-output-error-log"]; },
    set "is-output-error-log" (v) { d["is-output-error-log"] = !!v; },
    get "is-output-debug-log" () { return d["is-output-debug-log"]; },
    set "is-output-debug-log" (v) { d["is-output-debug-log"] = !!v; },
    get "volume-master" () { return d["volume-master"]; },
    set "volume-master" (v) {
      d["volume-master"] = va5._assertNumber("volume-master", 0, v, 1);
      if (va5._device) {
        va5._device.setVolumeMaster(d["volume-master"]);
      }
    },
    get "volume-bgm" () { return d["volume-bgm"]; },
    set "volume-bgm" (v) {
      d["volume-bgm"] = va5._assertNumber("volume-bgm", 0, v, 1);
      va5.Bgm.setBaseVolume(d["volume-bgm"]);
    },
    get "volume-se" () { return d["volume-se"]; },
    set "volume-se" (v) {
      d["volume-se"] = va5._assertNumber("volume-se", 0, v, 1);
      va5.Se.setBaseVolume(d["volume-se"]);
    },
    get "volume-voice" () { return d["volume-voice"]; },
    set "volume-voice" (v) {
      d["volume-voice"] = va5._assertNumber("volume-voice", 0, v, 1);
      //va5.Voice.setBaseVolume(d["volume-voice"]); // TODO
    },
    get "default-bgm-fade-sec" () { return d["default-bgm-fade-sec"]; },
    set "default-bgm-fade-sec" (v) {
      d["default-bgm-fade-sec"] = va5._assertNumber("default-bgm-fade-sec", 0, v, null);
    },
    get "default-se-fade-sec" () { return d["default-se-fade-sec"]; },
    set "default-se-fade-sec" (v) {
      d["default-se-fade-sec"] = va5._assertNumber("default-se-fade-sec", 0, v, null);
    },
    get "default-voice-fade-sec" () { return d["default-voice-fade-sec"]; },
    set "default-voice-fade-sec" (v) {
      d["default-voice-fade-sec"] = va5._assertNumber("default-voice-fade-sec", 0, v, null);
    },
    get "is-pause-on-background" () { return d["is-pause-on-background"]; },
    set "is-pause-on-background" (v) { d["is-pause-on-background"] = !!v; },
    get "se-chattering-sec" () { return d["se-chattering-sec"]; },
    set "se-chattering-sec" (v) {
      d["se-chattering-sec"] = va5._assertNumber("se-chattering-sec", 0, v, null);
    },
    get "additional-query-string" () { return d["additional-query-string"]; },
    set "additional-query-string" (v) {
      // 悩んだ結果、これはassertもstringifyも行わない事にした
      d["additional-query-string"] = v;
    }
  };
})(this);
