(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Config = va5.Config || {}; va5.Config = Config;

  function deepCopy (obj) { return JSON.parse(JSON.stringify(obj)); }

  // 考えた結果、va4互換のkebab-caseのkeyにする事にした。何故ならここを下手に
  // property化してしまうとgccのoptimizationsによって短縮されてしまう為。
  // (externs指定すればよいのだが、それもうっかり忘れて気付かないケースが
  // ありえる。気軽にconfig項目を追加できなくなる)
  // それなら最初からproperty指定できないkebab-caseで固定としたい。
  var initialData = {
    "is-output-error-log": true,
    "is-output-debug-log": false,
    "volume-master": 0.6,
    "volume-bgm": 0.6,
    "volume-se": 0.6,
    "volume-voice": 0.6, // TODO: 将来拡張予約
    "default-bgm-fade-sec": 1,
    "default-se-fade-sec": 0,
    "is-pause-on-background": true,
    "se-chattering-sec": 0.05,
    "additional-query-string": null
  };

  // 既にconfigが存在する場合は何もしない
  var data = Config.data || deepCopy(initialData);
  Config.data = data;
})(this);
