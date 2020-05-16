(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Init = va5.Init || {}; va5.Init = Init;

  var isInstalled = false;
  Init.init = function () {
    if (isInstalled) { return; }
    isInstalled = true;
    // NB: initする前に va5.device を差し替える事で、WebAudio以外の音源
    //     (例えばelectron等)にも対応できる。必要ならここでdeviceの差し替えを
    //     行えるようにしてもよい
    //va5.device.init();
    //va5._background.startSupervise(va5._bgm.syncBackground);
    //va5._se.bootstrapPlayingAudioChannelPoolWatcher();
  }
})(this);
