(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Util = va5.Util || {}; va5.Util = Util;

  // NB: percentは小数を持たない扱いである事に注意
  Util.floatToPercent = function (f) { return Math.round(f * 100); };
  Util.percentToFloat = function (p) { return p * 0.01; };


  function getNowByAudioContext () {
    // AudioContext回りの秒数の単位はsecなので、msecに変換する
    return va5._device.getCurrentSec() * 1000;
  }
  function getNowByPerformanceNow () {
    return window.performance.now();
  }
  var startTimestamp = null;
  var prevTimestamp = null;
  function getNowByDateNow () {
    var now = Date.now();
    if (!startTimestamp) { startTimestamp = now; }
    if (!prevTimestamp) { prevTimestamp = now; }
    // もし巻き戻りが発生していたら、その分を取り消す
    if (now < prevTimestamp) {
      var rollback = prevTimestamp - now;
      startTimestamp = startTimestamp - rollback;
    }
    prevTimestamp = now;
    return now - startTimestamp;
  }

  // タイムスタンプ取得アルゴリズムは一旦決めたら変動しない必要がある
  var getNowEntity = null;
  // msecのタイムスタンプを返す。実際の日時ではないので注意
  Util.getNowMsec = function () {
    if (getNowEntity) { return getNowEntity(); }
    if (va5._device && va5._device.getCurrentSec && (va5._device.getCurrentSec() != null)) {
      getNowEntity = getNowByAudioContext;
      va5._logDebug("getNowMsec function determined to getNowByAudioContext");
    }
    else if (window.performance && window.performance.now) {
      getNowEntity = getNowByPerformanceNow;
      va5._logDebug("getNowMsec function determined to getNowByPerformanceNow");
    }
    else {
      getNowEntity = getNowByDateNow;
      va5._logDebug("getNowMsec function determined to getNowByDateNow");
    }
    return getNowEntity();
  };


  // NB: これは本来Devices_WebAudio内に含めるべき内容だが、
  //     Devices_Dumbと共通にしたいので、ここに置いている
  Util.createDeviceState = function (as, opts, duration) {
    var volume = opts["volume"]; if (volume == null) { volume = 1; }
    volume = va5._validateNumber("volume", 0, volume, 10, 0);
    var pitch = va5._validateNumber("pitch", 0.1, opts["pitch"]||1, 10, 1);
    var pan = va5._validateNumber("pan", -1, opts["pan"]||0, 1, 0)
    // NB: loopStart=nullの時はloopStart=0とする
    var loopStart = va5._validateNumber("loopStart", 0, opts["loopStart"]||0, null, 0);
    // NB: loopEnd=nullの時はloopEnd=durationとする
    var loopEnd = va5._validateNumber("loopEnd", null, opts["loopEnd"]||duration, null, duration);
    // NB: startPos=nullの時はstartPos=loopStartとする
    var startPos = opts["startPos"];
    if (startPos == null) { startPos = loopStart; }
    startPos = va5._validateNumber("startPos", 0, startPos, null, 0);
    // NB: endPos=nullの時はendPos=nullを維持する
    var endPos = opts["endPos"];
    if (endPos != null) { endPos = va5._validateNumber("endPos", startPos, endPos, null, duration); }
    var isSleepingStart = !!opts["isSleepingStart"];

    var isNeedFinishImmediately = (endPos != null) && (endPos < startPos);
    // すぐ終わらせるので、強制的にisSleepingStartと同様の処理を行わせる
    if (isNeedFinishImmediately) { isSleepingStart = true; }

    if ((endPos == null) && (loopEnd <= loopStart)) {
      va5._logError(["found confused loopStart and loopEnd", loopStart, loopEnd]);
      loopStart = 0;
      loopEnd = duration;
    }

    var now = va5.getNowMsec() / 1000;

    var state = {
      as: as,
      volume: volume,
      pitch: pitch,
      pan: pan,
      loopStart: loopStart,
      loopEnd: loopEnd,
      startPos: startPos,
      endPos: endPos,

      // ここは直後のappendNodesで設定される
      sourceNode: null,
      gainNode: null,
      pannerNodeType: null,
      pannerNode: null,

      // この二つは「現在の再生位置」を算出する為の内部用の値。
      // sleep/resumeおよびsetPitchによって変化する。
      // 上記以外の用途には使わない事！
      replayStartTimestamp: now,
      replayStartPos: startPos,
      playPausedPos: isSleepingStart ? startPos : null,

      // これはse-chattering-secの判定で必要な「いつ開始したか」の情報
      playStartedTimestamp: now,
      // これは「再生終了済」のフラグ用途。値はほぼ利用されない
      playEndedTimestamp: null,

      // その他の内部用フラグ
      isSleepingStart: isSleepingStart,
      isNeedFinishImmediately: isNeedFinishImmediately
    };
    return state;
  };


  // endPosが0やマイナスの時は、duration側から動かした値にする必要がある。
  // それを計算する関数
  // NB: これは本来Bgm/Se内に含めるべき内容だが、
  //     共通にしたいので、ここに置いている
  Util.calcActualEndPos = function (state) {
    var endPosTrue = state.endPos;
    if ((endPosTrue != null) && (endPosTrue <= 0)) {
      var duration = va5._device.audioSourceToDuration(state.as);
      if (0 < duration) {
        endPosTrue = (endPosTrue % duration) + duration;
      }
      else {
        //va5._logError("invalid duration found " + state.path);
        // deviceがdumbの時にこっちに来る。適当なダミー値をセットする
        endPosTrue = 1;
      }
    }
    return endPosTrue;
  };


  // NB: これは本来Bgm/Se内に含めるべき内容だが、
  //     共通にしたいので、ここに置いている
  Util.parsePlayCommonOpts = function (path, opts) {
    var r = {};

    r.volume = opts["volume"];
    if (r.volume == null) { r.volume = 1; }
    r.volume = va5._validateNumber("volume", 0, r.volume, 10, 0);
    r.pitch = va5._validateNumber("pitch", 0.1, opts["pitch"]||1, 10, 1);
    r.pan = va5._validateNumber("pan", -1, opts["pan"]||0, 1, 0);

    // TODO: この辺りはpathからも読み取る(optsにあるならそちらを優先)

    r.loopStart = va5._validateNumber("loopStart", 0, opts["loopStart"]||0, null, 0);
    r.loopEnd = opts["loopEnd"] || null;
    if (r.loopEnd != null) { r.loopEnd = va5._validateNumber("loopEnd", 0, r.loopEnd, null, null); }

    r.startPos = opts["startPos"];
    if (r.startPos == null) { r.startPos = r.loopStart; }
    r.startPos = va5._validateNumber("startPos", 0, r.startPos, null, r.loopStart);
    r.endPos = opts["endPos"];
    if (r.endPos != null) { r.endPos = va5._validateNumber("endPos", null, r.endPos, null, null); }

    return r;
  };


  // NB: これは本来Bgm/Se内に含めるべき内容だが、
  //     共通にしたいので、ここに置いている
  Util.canConnect = function (transitionMode, state1, state2, isSkipLoop) {
    // isSkipLoopはSe用のスイッチ。
    // これが真ならSe用と判断しloop系パラメータのチェックはパスする
    transitionMode = va5._assertEnum("transitionMode", transitionMode, ["connectNever", "connectIfSame", "connectIfPossible"]);
    if (transitionMode == "connectNever") { return false; }
    // NB: ここからconnectIfPossibleの判定。指定パラメータ全てが同一なら真
    if (state1.path != state2.path) { return false; }
    if (state1.startPos != state2.startPos) { return false; }
    if (state1.endPos != state2.endPos) { return false; }
    if (!isSkipLoop && (state1.loopStart != state2.loopStart)) { return false; }
    if (!isSkipLoop && (state1.loopEnd != state2.loopEnd)) { return false; }
    if (transitionMode == "connectIfPossible") { return true; }
    // NB: ここからconnectIfSameの判定。追加の指定パラメータ全ても同一なら真
    if (state1.pitch != state2.pitch) { return false; }
    if (state1.pan != state2.pan) { return false; }
    // NB: volumeはconnectによる自動調整の対象なので同一チェックをしなくてよい
    return true;
  };


})(this);
