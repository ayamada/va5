(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;


  va5.config = va5.Config.data;
  // NB: va4とは違い、このconfig値の変更は現在再生中のものには影響を与えない。
  //     (変更したその後の再生/停止リクエストから影響を与える)
  //     volume-系の項目の変更時に、その内容を現在再生中のものに即座に
  //     適用したい場合は、変更後に明示的に va5.syncVolume(); を実行する事。
  // TODO: bgmとse(とvoice)を分けるべき？やめとく？
  va5.syncVolume = function () {
    // TODO: あとで実装する事(deviceとconfigの両方の参照が必要になる)
    throw new Error("not implemented yet");
  };


  va5._logError = va5.Log.error;
  va5._logDebug = va5.Log.debug;


  va5.init = va5.Init.init;


  va5.getDeviceName = function () {
    va5.init();
    return va5.device.name;
  };


  va5.floatToPercent = va5.Util.floatToPercent;
  va5.percentToFloat = va5.Util.percentToFloat;


  va5.isLoading = va5.Cache.isLoading;
  //va5.isLoaded = va5.Cache.isLoaded; // これは外部には提供しない事になった
  va5.isError = va5.Cache.isError;
  va5.isCancelled = va5.Cache.isCancelled;

  va5.load = function (path, cont) {
    va5._logDebug(["called va5.load", path]);
    va5.init();
    va5.Cache.load(path, cont);
  };

  va5.unload = function (path) {
    va5._logDebug(["called va5.unload", path]);
    va5.init();
    // TODO: 事前に、このpathの全ての再生を即座に停止させる必要がある！！！！
    //       この為には、BgmおよびSe側での再生チャンネルの管理が必要。
    //       なので、あとで実装する事。
    // TODO: race condition注意だが、「対象が現在再生中のBGM」かつ
    //       「フェードアウト中」かつ「次のBGMが予約済」
    //       の、全てを満たすのであれば、
    //       BGMの停止後に「次のBGM」を再生する必要がある。
    //       (unloadAllからの呼び出しでは、この処理をしてはいけない、
    //       全てをunloadするのだから…)
    va5.Cache.unload(path);
  };

  va5.unloadAll = function () {
    va5._logDebug("called va5.unloadAll");
    va5.init();
    // TODO: 事前に、全再生を即座に全て完全停止させる必要がある！！！！
    //       この為には、BgmおよびSe側での再生チャンネルの管理が必要。
    //       なので、あとで実装する事。
    va5.Cache.getAllPaths().forEach(va5.Cache.unload);
  };




  // 以下は古いコード

//  va5.playProto = function (path, opts) {
//    va5._outputDebugLog(["called va5.playProto", path, opts]);
//    init();
//    // TODO: まずここに最小構成実装を行う。これはbgmでもseでもない奴になる…
//    va5._cache.load(path);
//    if (va5._cache.isError(path)) {
//      va5._outputDebugLog(["failed to load", path]);
//      return;
//    }
//    if (va5._cache.isLoaded(path) {
//      va5._outputDebugLog(["play", path]);
//      va5.device.playProto(path);
//      return;
//    }
//    // TODO: 本当はもう少し小さい単位でリトライしたい(無駄にログがたくさん出ないようにしたい)。でも今はテストなのでこれで
//    window.setTimeout(va5.playProto, 33);
//  };
//
//  va5.stopBgm = function (fadeSec, bgmCh) {
//    va5._outputDebugLog(["called va5.stopBgm", fadeSec, bgmCh]);
//    init();
//    //引数の形式を変更した方がよいかもしれない
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.playBgm = function (path, opts) {
//    va5._outputDebugLog(["called va5.playBgm", path, opts]);
//    init();
//    // TODO: 「今流してるoneshotのが終わったら次にこれを再生する」新オプションを追加する事
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.stopSe = function (fadeSec, seCh) {
//    va5._outputDebugLog(["called va5.stopSe", fadeSec, seCh]);
//    init();
//    //引数の形式を変更した方がよいかもしれない
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.playSe = function (path, opts) {
//    va5._outputDebugLog(["called va5.playSe", path, opts]);
//    init();
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.stopVoice = function (fadeSec, voiceCh) {
//    va5._outputDebugLog(["called va5.stopVoice", fadeSec, voiceCh]);
//    init();
//    //引数の形式を変更した方がよいかもしれない
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.playVoice = function (path, opts) {
//    va5._outputDebugLog(["called va5.playVoice", path, opts]);
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };

  // 以上は古いコード





  // va5.version; // これのみ va5_version.js で定義される
})(this);
