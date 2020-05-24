(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;


  va5._assertNumber = va5.Assert.assertNumber;
  va5._assertString = va5.Assert.assertString;
  va5._assertPath = va5.Assert.assertPath;
  va5._assertSeCh = va5.Assert.assertSeCh;
  va5._assertBgmCh = va5.Assert.assertBgmCh;


  va5.config = va5.Config.data;


  // TODO: これらはConfig内に移行させる事
  va5.syncVolumeBgm = function () {
    va5.init();
    va5.Bgm.setVolumeBgm(va5.config["volume-bgm"]);
  };
  va5.syncVolumeSe = function () {
    va5.init();
    va5.Se.setVolumeSe(va5.config["volume-se"]);
  };
  va5.syncVolumeVoice = function () {
    va5.init();
    // TODO: あとで実装する
    throw new Error("not implemented yet");
  };


  va5._logError = va5.Log.error;
  va5._logDebug = va5.Log.debug;


  va5.init = va5.Init.init;


  va5.getDeviceName = function () {
    va5.init();
    return va5._device.name;
  };


  va5.floatToPercent = va5.Util.floatToPercent;
  va5.percentToFloat = va5.Util.percentToFloat;
  va5.getNowMsec = va5.Util.getNowMsec;


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
    va5.Bgm.stopImmediatelyByPath(path);
    va5.Se.stopImmediatelyByPath(path);
    va5.Cache.unload(path);
  };

  va5.unloadAll = function () {
    va5._logDebug("called va5.unloadAll");
    va5.init();
    va5.Bgm.stopImmediatelyAll();
    va5.Se.stopImmediatelyAll();
    va5.Cache.getAllPaths().forEach(va5.Cache.unload);
  };

  // NB: ロード済のpathのみ取得可能、未ロードの場合はnullが返る
  //     WebAudio非対応の場合は0が返る、注意
  //     単位はsec
  va5.getDuration = va5.Cache.getDuration;


  va5.se = function (path, opts) {
    va5._logDebug(["called va5.se", path, opts]);
    init();
    if (path == null) {
      var ch = (opts && opts["channel"]) || null;
      va5.stopSe(ch);
      return null;
    }
    else {
      return va5.Se.playSe(path, opts);
    }
  };

  va5.playSe = va5.se;

  va5.stopSe = function (ch, fadeSec) {
    va5._outputDebugLog(["called va5.stopSe", ch, fadeSec]);
    init();
    va5.Se.stopSe(ch, fadeSec);
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





  va5.version = va5.version || "0.0.0-UNDEFINED";


})(this);
