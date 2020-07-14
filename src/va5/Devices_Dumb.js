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

  device.getCurrentSec = function () { return null; }


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
    return 0.1;
  }
  device.audioSourceToSampleRate = function (as) {
    if (as == null) { return null; }
    if (as.disposed) { return null; }
    return 8000;
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

    var duration = 1;
    var state = va5.Util.createDeviceState(as, opts, duration);
    // 何も再生できないので、いきなり再生終了状態にしておく
    // (たとえ通常は自動終了しないループ再生だったとしても)
    state.playPausedPos = null;
    state.playEndedTimestamp = state.playStartedTimestamp;

    return state;
  };


  device.getVolume = function (state) { return state.volume; };

  device.getPitch = function (state) { return state.pitch; };

  device.getPan = function (state) { return state.pan; };


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
  device.sleep = function (state) {};
  device.resume = function (state) {};


  device.getAudioContext_ = function () {
    return null;
  };


  device.isFinished = function (state) {
    return true;
  };


  device.getPlayStartedTimestamp = function (state) {
    if (!state) { return null; }
    return state.playStartedTimestamp;
  };


  device.isInSeChatteringSec = function (state) {
    return false;
  };


})(this);
