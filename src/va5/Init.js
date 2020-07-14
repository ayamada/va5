(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Init = va5.Init || {}; va5.Init = Init;

  var isInitialized = false;
  Init.init = function () {
    if (isInitialized) { return; }
    isInitialized = true;

    // 強制dumbモード対応
    if (va5.getConfig("is-use-dumb-mode-forcibly")) {
      va5._device = va5.Devices.Dumb;
    }

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

    va5._device.setVolumeMaster(va5.getConfig("volume-master"));
    va5.Se.setBaseVolume(va5.getConfig("volume-se"), true);
    va5.Bgm.setBaseVolume(va5.getConfig("volume-bgm"), true);

    va5.Background.startSupervise(va5.Bgm.syncBackground);
    va5.Se.bootstrapPlayingAudioChannelPoolWatcher();
    va5.Bgm.bootstrapPlayingAudioChannelPoolWatcher();
  }
})(this);
