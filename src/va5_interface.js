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


  va5.getConfig = va5.Config.get;
  va5.setConfig = va5.Config.set;


  va5._logError = va5.Log.error;
  va5._logDebug = va5.Log.debug;


  va5.init = va5.Init.init_;


  va5.getDeviceName = function () {
    va5.init();
    return va5._device.name;
  };


  va5.floatToPercent = va5.Util.floatToPercent_;
  va5.percentToFloat = va5.Util.percentToFloat_;
  va5.getNowMsec = va5.Util.getNowMsec_;


  va5.isLoading = va5.Cache.isLoading_;
  //va5.isLoaded = va5.Cache.isLoaded_; // これは外部には提供しない事になった
  va5.isError = va5.Cache.isError_;
  va5.isCancelled = va5.Cache.isCancelled_;

  va5.load = function (path, cont) {
    va5._logDebug(["called va5.load", path]);
    va5.init();
    va5.Cache.load_(path, cont);
  };

  // こちらは即座にロードされるのでconfを取る必要はない。
  // 返り値としてpath相当の文字列を返すので、これをplaySe等に渡す事
  // (このpathはunload後の再利用はできないので要注意)
  va5.loadBuf = function (buf) {
    va5._logDebug(["called va5.loadBuf", buf]);
    va5.init();
    return va5.Cache.loadBuf_(buf);
  };

  va5.unload = function (path) {
    va5._logDebug(["called va5.unload", path]);
    va5.init();
    va5.Bgm.stopImmediatelyByPath(path); // voiceもここに含まれる
    va5.Se.stopImmediatelyByPath(path);
    va5.Cache.unload_(path);
  };

  va5.unloadIfUnused = function (path) {
    va5._logDebug(["called va5.unloadIfUnused", path]);
    va5.init();
    va5.Cache.unloadIfUnused_(path);
  };

  va5.unloadAll = function () {
    va5._logDebug("called va5.unloadAll");
    va5.init();
    va5.Bgm.stopImmediatelyAll(); // voiceもここに含まれる
    va5.Se.stopImmediatelyAll();
    va5.Cache.getAllPaths().forEach(va5.Cache.unload_);
  };

  // TODO: これは気軽に呼ばれる割にかなり重い、軽量化できるならしたいが…
  va5.unloadAllIfUnused = function () {
    va5._logDebug("called va5.unloadAllIfUnused");
    va5.init();
    va5.Cache.getAllPaths().forEach(va5.Cache.unloadIfUnused_);
  };

  // NB: ロード済のpathのみ取得可能、未ロードの場合はnullが返る
  //     WebAudio非対応の場合は0が返る、注意
  //     単位はsec
  va5.getDuration = va5.Cache.getDuration_;


  // NB: ロード済のpathのみ取得可能、未ロードの場合はnullが返る
  //     WebAudio非対応の場合は0が返る、注意
  //     単位はHz(大体は44100, 48000, 22050, あたりの値が返る)
  va5.getSampleRate = va5.Cache.getSampleRate_;


  va5.se = function (path, opts) {
    va5._logDebug(["called va5.se", path, opts]);
    va5.init();
    if (path == null) {
      var ch = (opts && opts["channel"]) || null;
      va5.stopSe(ch, null);
      return null;
    }
    else {
      return va5.Se.playSe_(path, opts);
    }
  };

  va5.playSe = va5.se; // alias

  va5.stopSe = function (ch, fadeSec) {
    va5._logDebug(["called va5.stopSe", ch, fadeSec]);
    va5.init();
    va5.Se.stopSe_(ch, fadeSec);
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


  // seをon the flyに生成する時等にこれが必要となった
  va5.getAudioContext = function () {
    va5.init();
    return va5._device.getAudioContext_();
  };


  va5.getBgmPos = va5.Bgm.getBgmPos_;
  va5.isInBackground = va5.Bgm.isInBackground_;

  va5.bgm = function (path, opts) {
    va5._logDebug(["called va5.bgm", path, opts]);
    va5.init();
    return va5.Bgm.playBgm_(path, opts);
  };
  va5.playBgm = va5.bgm; // alias

  va5.voice = function (path, opts) {
    va5._logDebug(["called va5.voice", path, opts]);
    va5.init();
    return va5.Bgm.playVoice_(path, opts);
  };
  va5.playVoice = va5.voice; // alias

  va5.stopBgm = va5.Bgm.stopBgm_;
  va5.stopVoice = va5.Bgm.stopVoice_;


  va5.version = va5.version || "0.0.0-UNDEFINED";
})(this);
