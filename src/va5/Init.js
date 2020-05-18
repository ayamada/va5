(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Init = va5.Init || {}; va5.Init = Init;

  var isInitialized = false;
  Init.init = function () {
    if (isInitialized) { return; }
    isInitialized = true;

    // NB: ここを拡張する事で、WebAudio以外の音源にも対応できる。
    //     (例えばelectron等)
    //     対応がない場合はDumb(無音)にしておく事
    va5.device = va5.Devices.WebAudio;
    if (!va5.device.init()) {
      va5.device = va5.Devices.Dumb;
      va5.device.init();
    }

    va5.device.setVolumeMaster(va5.config["volume-master"]);
    va5.Background.startSupervise(va5.Bgm.syncBackground);
    va5.Se.bootstrapPlayingAudioChannelPoolWatcher();
  }
})(this);
