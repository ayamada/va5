(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Se = va5.Se || {}; va5.Se = Se;


  var allSeChTable = {};


  // pathに対応する再生を即座に停止する。予約も解除する
  Se.shutdown = function (path) {
    if (path == null) { return; } path = va5._assertPath(path);

    // TODO
  };


  Se.shutdownAll = function () {
    // TODO
  };


  Se.bootstrapPlayingAudioChannelPoolWatcher = function () {
    // TODO
  };


  var chanCount = 0;
  function makeNewChannelId () {
    var ch = "sech" + ("00000000" + chanCount).slice(-8);
    ch = va5._assertSeCh(ch);
    chanCount = (chanCount+1) % 100000000;
    return ch;
  }

  // NB: 無制限にchを作れるのではなく、同時再生数上限を決めた方がよいかも
  //     (上限に達した場合は最も古いchを強制停止させて再利用する)
  Se.playSe = function (path, opts) {
    if (path == null) { return null; }
    path = va5._assertPath(path);
    opts = opts || {};
    var oldCh = opts["channel"];
    if (oldCh != null) { oldCh = va5._assertSeCh(oldCh); }

    var volume = opts["volume"]; if (volume == null) { volume = 1; }
    volume = va5._assertNumber("volume", 0, volume, 10);
    var pitch = va5._assertNumber("pitch", 0.1, opts["pitch"]||1, 10);
    var pan = va5._assertNumber("pan", -1, opts["pan"]||0, 1);

    var isAlarm = !!opts["isAlarm"]; // TODO: 将来実装予定

    var volumeSe = va5.config["volume-se"];
    var volumeTrue = volume * volumeSe;
    var ch = oldCh || makeNewChannelId();

//    var isLoop = !!opts["isLoop"];
//    var loopStart = opts["loopStart"] || 0;
//    var loopEnd = opts["loopEnd"] || buf.duration;
//    var startPos = opts["startPos"] || 0;
//    var endPos = opts["endPos"] || null;

//    "volume-master": 0.6,
//    "volume-bgm": 0.6,
//    "volume-se": 0.6,

    // TODO
  };


  Se.stopSe = function (ch, fadeSec) {
    if (fadeSec == null) { fadeSec = va5.Config["default-se-fade-sec"]; }
    fadeSec = va5._assertNumber("fadeSec", 0, fadeSec, null);
    if (ch == null) {
      // chが偽値なら、全再生中chに対して再帰実行する
      allSeChTable.forEach(function (ch2) { Se.stopSe(ch2, fadeSec); });
      return;
    }
    ch = va5._assertSeCh(ch);

    // TODO: 実際のSE停止処理をここに実装
  };

})(this);
