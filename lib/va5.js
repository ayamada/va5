// base
(function(exports) {
  "use strict";
  var va5 = exports.va5 || {};
  exports.va5 = va5;

  va5.version = "(TODO)"; // reserved(将来に更新しやすい機構を導入したら対応)

  // 汎用の状態保持
  // debugしやすいように、外部から見れるようにしておく
  if (!va5.state) { va5.state = {}; }

  // NB: percentは小数を持たない扱いである事に注意
  va5.floatToPercent = function (f) { return Math.round(f * 100); };
  va5.percentToFloat = function (p) { return p * 0.01; };

})(this);




// config
(function(exports) {
  "use strict";
  var window = exports;
  var document = exports.document;
  var va5 = exports.va5;

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
    "force-disable-old-mobile": true,
    "force-disable-edge": false,
    "is-output-error-log": false,
    "is-output-debug-log": false
  };

  function deepCopy (obj) { return JSON.parse(JSON.stringify(obj)); }

  if (!va5.config) { va5.config = deepCopy(initialConfig); }
})(this);




// device
// NB: これを差し替えればWebAudio以外の音源にも対応できる、という建前
//     (実際にはかなり大変なので、そこまでやらないと思うが…)
(function(exports) {
  "use strict";
  var window = exports;
  var document = exports.document;
  var va5 = exports.va5;

  if (!va5.device) { va5.device = {}; }

  va5.device.init = function () {
    // TODO
  };

  // TODO

})(this);




// background
(function(exports) {
  "use strict";
  var window = exports;
  var document = exports.document;
  var va5 = exports.va5;

  va5._background = {};
  va5._background.startSupervise = function (h) {
    // TODO
    //  (reset! background/background-handle bgm/sync-background!)
//(defn start-supervise! []
//  (when-not @installed?
//    (reset! installed? true)
//    (when (nil? (state/get :in-background?))
//      (state/set! :in-background?
//                  (boolean (= js/document.visibilityState "hidden"))))
//    (let [event-name "visibilitychange"
//          h (fn [e]
//              (let [bg? (boolean (= js/document.visibilityState "hidden"))]
//                (state/set! :in-background? bg?)
//                (when @background-handle
//                  (@background-handle bg?))))]
//      (js/document.addEventListener event-name h)
//      (h nil))))
  };
})(this);




// bgm
(function(exports) {
  "use strict";
  var window = exports;
  var document = exports.document;
  var va5 = exports.va5;

  va5._bgm = {};

})(this);



// se
(function(exports) {
  "use strict";
  var window = exports;
  var document = exports.document;
  var va5 = exports.va5;

  va5._se = {};
  va5._se.bootstrapPlayingAudioChannelPoolWatcher = function () {
    // TODO
    //  (se/run-playing-audiochannel-pool-watcher!)
  };



})(this);




(function(exports) {
  "use strict";
  var window = exports;
  var document = exports.document;
  var va5 = exports.va5;


})(this);




(function(exports) {
  "use strict";
  var window = exports;
  var document = exports.document;
  var va5 = exports.va5;














  function init () {
    if (va5.state.initialized) { return; }
    va5.state.initialized = true;
    va5.device.init();
    background.startSupervise();
    se.bootstrapPlayingAudioChannelPoolWatcher();
  }






  // TODO




  va5.canPlayMime = function (mime) {
    init();
    // TODO
  };
  va5.canPlayOgg = function () { return va5.canPlayMime("audio/ogg"); };
  va5.canPlayMp3 = function () { return va5.canPlayMime("audio/mpeg"); };
  va5.canPlayM4a = function () { return va5.canPlayMime("audio/mp4"); };

  va5.stopBgm = function (fadeSec, bgmCh) {
    init();
    //引数の形式を変更した方がよいかもしれない
    // TODO
  };
  va5.playBgm = function (path, opts) {
    init();
    //新オプションとして「今流してるoneshotのが終わっ>たら次にこれを再生する」オプションを追加
    // TODO
  };
  va5.stopSe = function (fadeSec, seCh) {
    init();
    //引数の形式を変更した方がよいかもしれない
    // TODO
  };
  va5.playSe = function (path, opts) {
    init();
    // TODO
  };
  va5.stopVoice = function (fadeSec, voiceCh) {
    init();
    //引数の形式を変更した方がよいかもしれない
    // TODO
  };
  va5.playVoice = function (path, opts) {
    // TODO
  };
  va5.load = function (path) {
    init();
    // TODO
  };
  va5.unload = function (path) {
    init();
    // TODO
  };
  va5.unloadAll = function () {
    init();
    // TODO
  };
  va5.isLoaded = function (path) {
    // TODO
  };
  va5.isError = function (path) {
    // TODO
  };



  // configのvolume系を変更し、現在鳴っているものにも即座に反映したい場合は
  // これを実行する事(実行しない場合は新しく鳴らしたものにのみ影響する)
  // TODO: bgmとse(とvoice)を分けるべき？
  va5.syncVolume = function () {
    // TODO
  };

  exports.va5 = va5;
})(this);
