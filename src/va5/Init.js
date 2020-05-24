(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Init = va5.Init || {}; va5.Init = Init;

  var isInitialized = false;
  Init.init = function () {
    if (isInitialized) { return; }
    isInitialized = true;

    // NB: 事前にva5._deviceをセットしておく事で、
    //     WebAudio以外の音源にも対応できる(例えばelectron等)
    //     ただしgccのname manglingに注意する必要がある
    //     (外部から追加する場合はmin版の利用は絶望的となる)
    if (!va5._device) {
      va5._device = va5.Devices.WebAudio;
    }
    if (!va5._device.init()) {
      va5._device = va5.Devices.Dumb;
      va5._device.init();
    }

    va5._device.setVolumeMaster(va5.config["volume-master"]);
    va5.Se.setVolumeSe(va5.config["volume-se"], true);
    va5.Bgm.setVolumeBgm(va5.config["volume-bgm"], true);

    va5.Background.startSupervise(va5.Bgm.syncBackground);
    va5.Se.bootstrapPlayingAudioChannelPoolWatcher();
  }
})(this);
