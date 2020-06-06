(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;


  va5._validateNumber = va5.Assert.validateNumber;
  va5._validateString = va5.Assert.validateString;
  va5._validatePath = va5.Assert.validatePath;
  va5._validateSeCh = va5.Assert.validateSeCh;
  va5._validateBgmCh = va5.Assert.validateBgmCh;
  va5._validateVoiceCh = va5.Assert.validateVoiceCh;
  va5._validateEnum = va5.Assert.validateEnum;

  va5._assertNumber = va5.Assert.assertNumber;
  va5._assertString = va5.Assert.assertString;
  va5._assertPath = va5.Assert.assertPath;
  va5._assertSeCh = va5.Assert.assertSeCh;
  va5._assertBgmCh = va5.Assert.assertBgmCh;
  va5._assertVoiceCh = va5.Assert.assertVoiceCh;
  va5._assertEnum = va5.Assert.assertEnum;


  va5.config = va5.Config.data;


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

  // こちらは即座にロードされるのでconfを取る必要はない。
  // 返り値としてpath相当の文字列を返すので、これをplaySe等に渡す事
  // (このpathはunload後の再利用はできないので要注意)
  va5.loadBuf = function (buf) {
    va5._logDebug(["called va5.loadBuf", buf]);
    va5.init();
    return va5.Cache.loadBuf(buf);
  };

  va5.unload = function (path) {
    va5._logDebug(["called va5.unload", path]);
    va5.init();
    va5.Bgm.stopImmediatelyByPath(path); // voiceもここに含まれる
    va5.Se.stopImmediatelyByPath(path);
    va5.Cache.unload(path);
  };

  va5.unloadAll = function () {
    va5._logDebug("called va5.unloadAll");
    va5.init();
    va5.Bgm.stopImmediatelyAll(); // voiceもここに含まれる
    va5.Se.stopImmediatelyAll();
    va5.Cache.getAllPaths().forEach(va5.Cache.unload);
  };

  // NB: ロード済のpathのみ取得可能、未ロードの場合はnullが返る
  //     WebAudio非対応の場合は0が返る、注意
  //     単位はsec
  va5.getDuration = va5.Cache.getDuration;


  va5.se = function (path, opts) {
    va5._logDebug(["called va5.se", path, opts]);
    va5.init();
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
    va5._logDebug(["called va5.stopSe", ch, fadeSec]);
    va5.init();
    va5.Se.stopSe(ch, fadeSec);
  };

  va5.statsSe = va5.Se.stats;


  // 個別にse-chattering-secを設定したいような時に使うユーティリティ
  va5.makePlaySePeriodically = function (intervalSec, path, opts) {
    var lastPlaySec = 0;
    var f = function () {
      var now = va5.getNowMsec() / 1000;
      if ((now - lastPlaySec) < intervalSec) { return null; }
      lastPlaySec = now;
      var ch = va5.playSe(path, opts);
      return ch;
    };
    return f;
  };


  va5.version = va5.version || "0.0.0-UNDEFINED";


})(this);
