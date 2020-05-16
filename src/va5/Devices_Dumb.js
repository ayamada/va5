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
    if (as === null) { return; }
    as.disposed = true;
  };

  device.audioSourceToDuration = function (as) {
    if (as === null) { return null; }
    if (as.disposed) { return null; }
    return 0;
  }

  device.loadAudioSource = function (path, cont) {
    if (path === null) {
      va5._logError(["failed to load", path]);
      cont(null);
      return;
    }
    cont({});
  };

  device.play = function (as, opts) {
    if (!as) { return null; }
    if (as.disposed) { return null; }

    var volume = opts["volume"] || 1;
    var pitch = opts["pitch"] || 1;
    var pan = opts["pan"] || 0;
    var isLoop = !!opts["isLoop"];
    var loopStart = opts["loopStart"] || 0;
    var loopEnd = opts["loopEnd"] || 0;
    var startPos = opts["startPos"] || 0;
    var endPos = opts["endPos"] || null;

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

  // TODO

})(this);
