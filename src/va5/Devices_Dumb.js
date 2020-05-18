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

  device.audioSourceToDuration = function (as) {
    if (as == null) { return null; }
    if (as.disposed) { return null; }
    return 0;
  }

  device.loadAudioSource = function (path, cont) {
    if (path == null) {
      va5._logError(["failed to load", path]);
      cont(null);
      return;
    }
    path = va5._assertPath(path);
    cont({});
  };

  device.play = function (as, opts) {
    if (!as) { return null; }
    if (as.disposed) { return null; }

    var volume = opts["volume"]; if (volume == null) { volume = 1; }
    volume = va5._assertNumber("volume", 0, volume, 10);
    var pitch = va5._assertNumber("pitch", 0.1, opts["pitch"]||1, 10);
    var pan = va5._assertNumber("pan", -1, opts["pan"]||0, 1);
    var isLoop = !!opts["isLoop"];
    var loopStart = va5._assertNumber("loopStart", 0, opts["loopStart"]||0, null);
    var loopEnd = va5._assertNumber("loopEnd", null, opts["loopEnd"]||0, null);
    var startPos = va5._assertNumber("startPos", 0, opts["startPos"]||0, null);
    var endPos = opts["endPos"] || null;
    if (endPos != null) { endPos = va5._assertNumber("endPos", null, endPos, null); }

    var now = Date.now()/1000;

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

      playStartTime: now,
      playEndTime: now
    };

    return state;
  };

  device.setVolumeMaster = function (volume) {
    return;
  };

  // TODO

})(this);
