(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Devices = va5.Devices || {}; va5.Devices = Devices;
  var device = Devices.WebAudio || {}; Devices.WebAudio = device;

  device.name = "WebAudio";


  var ac = null;
  var masterGainNode = null;


  var isInitialized = false;


  device.init = function () {
    if (isInitialized) { return !!ac; }
    isInitialized = true;

    va5._logDebug("called va5.Devices.WebAudio.init");

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      va5._logError("neither AudioContext nor webkitAudioContext");
      return false;
    }
    // かつて、モバイル系の音割れ対策として「acを一個生成してcloseすればよい」
    // というバッドノウハウがあった。
    // 今も必要なのか分からないが一応行っておく。
    // ただし、これが例外を投げてしまう場合があるのでtryで囲む必要がある。
    // (closeがない等のケースがあるようだ)
    try { (new AudioContext()).close(); } catch (e) {}
    // 今度は正式にacを生成する
    try {
      ac = new AudioContext();
    }
    catch (e) {
      ac = null;
      va5._logError("could not create AudioContext");
      return false;
    }

    // TODO: このタイミングで「あまりに古すぎるモバイル端末」を除外したい。どう判定する？できればuseragentに頼らない判定をしたいが…
    //       - (chromeでない)android標準ブラウザはWebAudio非対応なので自動的に除外されるので問題ない
    //       - 問題は、WebAudioに中途半端にしか対応していない環境。これをどうにかして検出する必要がある…
    if (false) {
      try { ac.close(); } catch (e) {}
      ac = null;
      va5._logError("too old WebAudio, disable forcibly");
      return false;
    }

    masterGainNode = ac.createGain();
    masterGainNode.gain.value = 1;
    masterGainNode.connect(ac.destination);

    device.Unlock.install(ac);

    return true;
  };







//  va5.device.disposeAudioSource = function (as) {
//    if (as === null) { return; }
//    // WebAudio では、全てが自動でGC可能な筈。
//    // ただブラウザ側の不具合でGCできない可能性もあり、
//    // その場合はここで何らかの処理を行う必要があるかもしれない
//    // TODO
//  };
//
//  va5.device.audioSourceToDuration = function (as) {
//    return as.duration;
//  }
//
//  // ロードに成功しても失敗してもcontが実行される。
//  // 成功していれば引数にasが渡され、失敗ならnullが渡される。
//  // NB: ここに渡すpathは va5._cache.appendQueryString() 処理済である事！
//  // va5ではasはbufそのものとして扱う。bufの長さは buf.duration で取れる。
//  va5.device.loadAudioSource = function (path, cont) {
//    function errorEnd1 (e) {
//      va5._logError(["failed to load", path]);
//      cont(null);
//      return;
//    }
//    function errorEnd2 (e) {
//      va5._logError(["cannot decode", path]);
//      cont(null);
//      return;
//    }
//    if (path === null) { errorEnd1(); return; }
//    if (ac === null) {
//      va5._logDebug(["disabled WebAudio", path]);
//      cont(null); // TODO: 可能ならダミーのasを返して成功扱いにしたい
//      return;
//    }
//    var xhr = new XMLHttpRequest();
//    xhr.open("GET", path);
//    xhr.responseType = "arraybuffer";
//    xhr.onerror = errorEnd1;
//    xhr.onload = function (e) {
//      var firstLetter = (""+e.target.status).substr(0, 1);
//      if ((firstLetter !== "0") && (firstLetter !== "2")) {
//        errorEnd1();
//        return;
//      }
//      try {
//        ac.decodeAudioData(xhr.response, function (buf) {
//          if (!buf) { errorEnd2(); return; }
//          cont(buf);
//          return;
//        }, errorEnd2);
//      }
//      catch (e) {
//        errorEnd2();
//        return;
//      }
//    };
//    xhr.send();
//  };
//
//  function disconnectSafely (node) {
//    if (node === null) { return; }
//    try {
//      node.disconnect();
//    }
//    catch (e) {
//    }
//  }
//
//  // これは音が鳴るところまでを実装した最小構成。これをベースに分解していき、間にキャッシュを入れたりしていく
//  va5.device.playProto = function (path, opts) {
//    if (ac === null) { return null; }
//
//    var pitch = opts["pitch"] || 1;
//    var volume = opts["volume"] || 1;
//    var pan = opts["pan"] || 0;
//    var isLoop = !!opts["isLoop"];
//    var loopStart = opts["loopStart"] || 0;
//    var loopEnd = opts["loopEnd"]; // 偽値の場合は as.duration が採用される
//    var startPos = opts["startPos"] || 0;
//
//    var playState = {};
//    playState.phase = "loading";
//
//    // TODO: asは _cache を通じて取得するようにする(毎回ロードしたくない)
//    //       ただしdevice自体は_cacheに依存しないようにする必要がある。
//    //       (この事を考えると、playProtoの引数はpathではなくasになるべき)
//    va5.device.loadAudioSource(path, function (as) {
//      playState.phase = "loaded";
//      if (!as) { return; }
//      if (as["dummy"]) { return; }
//
//      var sourceNode = ac.createBufferSource();
//      var gainNode = ac.createGain();
//      sourceNode.buffer = as;
//      sourceNode.playbackRate.value = pitch;
//      gainNode.gain.value = volume;
//      sourceNode.connect(gainNode);
//      var pannerNodeType;
//      var pannerNode;
//      if (ac.createStereoPanner) {
//        pannerNodeType = "stereoPannerNode";
//        pannerNode = ac.createStereoPanner();
//        pannerNode.pan.value = pan;
//        gainNode.connect(pannerNode);
//        pannerNode.connect(masterGainNode);
//      }
//      else if (ac.createPanner) {
//        pannerNodeType = "pannerNode";
//        pannerNode = ac.createPanner();
//        pannerNode.panningModel = "equalpower";
//        pannerNode.setPosition(pan, 0, 1-Math.abs(pan));
//        gainNode.connect(pannerNode);
//        pannerNode.connect(masterGainNode);
//      }
//      else {
//        pannerNodeType = "none";
//        pannerNode = null;
//        gainNode.connect(masterGainNode);
//      }
//
//      if (isLoop) {
//        sourceNode.loop = true;
//        sourceNode.loopStart = loopStart;
//        sourceNode.loopEnd = loopEnd || as.duration;
//      }
//      else {
//        sourceNode.onended(function () {
//          var now = ac.currentTime;
//          disconnectSafely(sourceNode);
//          disconnectSafely(gainNode);
//          disconnectSafely(pannerNode);
//          playState.sourceNode = null;
//          playState.gainNode = null;
//          playState.pannerNode = null;
//          playState.playEndTIme = now;
//        });
//      }
//
//      var now = ac.currentTime;
//      playState.sourceNode = sourceNode;
//      playState.gainNode = gainNode;
//      playState.pannerNodeType = pannerNodeType;
//      playState.pannerNode = pannerNode;
//      playState.volume = volume;
//      playState.pitch = pitch;
//      playState.pan = pan;
////                       :loop loop?
////                       :started-pos start-pos
////                       :play-start-time now
//      playState.playEndTIme = null;
//      playState.phase = "playing";
//      sourceNode.start(now startPos);
//    });
//    return playState; // TODO: playStateではなくch(id値)を返すべき？
//  };

  // TODO: もっと機能を追加する必要あり

})(this);
