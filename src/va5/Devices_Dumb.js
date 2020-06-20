(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Devices = va5.Devices || {}; va5.Devices = Devices;
  var device = Devices.Dumb || {}; Devices.Dumb = device;

  device.name = "Dumb";

  // NB: Debices_WebAudio.js と同じインターフェースで、
  //     「なにもしない」動作かつ「それらしい返り値」を返す実装を行う事

  device.init = function () {
    return true;
  };

  device.disposeAudioSource = function (as) {
    if (as == null) { return; }
    as.disposed = true;
  };

  device.disposePlayingState = function (state) {
    if (state == null) { return; }
    state.disposed = true;
  };

  device.audioSourceToDuration = function (as) {
    if (as == null) { return null; }
    if (as.disposed) { return null; }
    return 0;
  }


  device.bufToAudioSource = function (buf) {
    var as = {};
    return as;
  };


  device.loadAudioSource = function (path, cont) {
    if (path == null) {
      va5._logError(["failed to load", path]);
      cont(null);
      return;
    }
    path = va5._validatePath(path);
    if (path == null) {
      cont(null);
    }
    else {
      cont({});
    }
  };

  device.play = function (as, opts) {
    if (!as) { return null; }
    if (as.disposed) { return null; }

    var volume = opts["volume"]; if (volume == null) { volume = 1; }
    volume = va5._validateNumber("volume", 0, volume, 10, 0);
    var pitch = va5._validateNumber("pitch", 0.1, opts["pitch"]||1, 10, 1);
    var pan = va5._validateNumber("pan", -1, opts["pan"]||0, 1, 0);
    var isLoop = !!opts["isLoop"];
    var loopStart = va5._validateNumber("loopStart", 0, opts["loopStart"]||0, null, 0);
    var loopEnd = va5._validateNumber("loopEnd", null, opts["loopEnd"]||0, null, 0);
    var startPos = va5._validateNumber("startPos", 0, opts["startPos"]||0, null, 0);
    var endPos = opts["endPos"] || null;
    if (endPos != null) { endPos = va5._validateNumber("endPos", null, endPos, null, 0); }
    var isSleepingStart = !!opts["isSleepingStart"];

    var now = va5.getNowMsec() / 1000;

    // 何も再生できないので、いきなり再生終了状態にしておく
    // (たとえisLoopが真だったとしても)
    var state = {
      as: as,
      volume: volume,
      pitch: pitch,
      pan: pan,
      isLoop: isLoop,
      loopStart: loopStart,
      loopEnd: loopEnd,
      startPos: startPos,
      endPos: endPos,

      playStartSec: now,
      playStartPos: startPos,

      playEndSec: now,

      playPausePos: null
    };

    return state;
  };


  device.setVolume = function (state, newVolume) {
    state.volume = newVolume;
  };

  device.setPitch = function (state, newPitch) {
    state.pitch = newPitch;
  };

  device.setPan = function (state, newPan) {
    state.pan = newPan;
  };


  device.setVolumeMaster = function (volume) {
    return;
  };

  device.calcPos = function (state) {
    return null;
  };

  // BGMのバックグラウンド一時停止用。それ以外の用途には使わない事(衝突する為)
  device.sleep = function (state) {
  };
  device.resume = function (state) {
  };

  device.getAudioContext = function () {
    return null;
  };


})(this);
