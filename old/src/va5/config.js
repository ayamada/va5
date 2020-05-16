(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;

  // 考えた結果、va4互換のkebab-caseのkeyにする事に
  var initialConfig = {
    "volume-master": 0.6,
    "volume-bgm": 0.6,
    "volume-se": 0.6,
    "volume-voice": 0.6, // TODO: 将来拡張予約
    "default-bgm-fade-sec": 1,
    "default-se-fade-sec": 0,
    "is-pause-on-background": true,
    "se-chattering-sec": 0.05,
    "additional-query-string": null,
    "is-output-error-log": true,
    "is-output-debug-log": false
  };
  // NB: これらのconfig値の変更は現在再生中のものには影響を与えない。
  //     (変更したその後の再生/停止リクエストから影響を与える)
  //     現在再生中のものに影響を与えたい volume- 系の項目は、変更後に
  //     明示的に va5.syncVolume(); を実行する事。

  function deepCopy (obj) { return JSON.parse(JSON.stringify(obj)); }

  // 既にconfigが存在する場合は何もしない
  if (!va5.config) { va5.config = deepCopy(initialConfig); }
})(this);
