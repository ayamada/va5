(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Bgm = va5.Bgm || {}; va5.Bgm = Bgm;


  // 全BGM共通の音量倍率
  var baseVolume = 1;

  Bgm.setBaseVolume = function (newVolume, isInit) {
    // TODO
  };


  // pathに対応する再生を即座に停止する。予約も解除する
  // TODO: race condition注意だが、「対象が現在再生中のBGM」かつ
  //       「フェードアウト中」かつ「次のBGMが予約済」
  //       の、全てを満たすのであれば、
  //       BGMの停止後に「次のBGM」を再生する必要がある。
  //       (unloadAllからの呼び出しでは、この処理をしてはいけない、
  //       全てをunloadするのだから…)
  Bgm.stopImmediatelyByPath = function (path) {
    if (path == null) { return; }
    path = va5._assertPath(path);
    // TODO
  };


  Bgm.stopImmediatelyAll = function () {
    // TODO
  };


  Bgm.syncBackground = function (isInactiveNow) {
    // TODO
  };


})(this);
