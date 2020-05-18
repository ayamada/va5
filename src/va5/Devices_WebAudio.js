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


  device.disposeAudioSource = function (as) {
    if (as == null) { return; }
    if (as.disposed) { return; }
    // WebAudio では、全てが自動でGC可能な筈。
    // ただブラウザ側の不具合でGCできない可能性もあり、
    // その場合はここで何らかの処理を行う必要があるかもしれない
    as.buf = null;
    as.disposed = true;
  };


  device.audioSourceToDuration = function (as) {
    if (as == null) { return null; }
    if (as.disposed) { return null; }
    if (!as.buf) { return null; }
    return as.buf.duration;
  }


  // ロードに成功しても失敗してもcontが実行される。
  // 成功していれば引数にasが渡され、失敗ならnullが渡される。
  // asは「メタ情報を付与されたAudioSource」であり、WebAudioの場合は
  // bufとその他のメタ情報になる。
  // NB: ここに渡すpathは va5._cache.appendQueryString() 処理済である事！
  device.loadAudioSource = function (path, cont) {
    function errorEnd1 (e) {
      va5._logError(["failed to load", path]);
      cont(null);
      return;
    }
    function errorEnd2 (e) {
      va5._logError(["cannot decode", path]);
      cont(null);
      return;
    }
    if (path == null) { errorEnd1(); return; }
    path = va5._assertPath(path);
    if (ac == null) {
      va5._logDebug(["disabled WebAudio", path]);
      cont(null); // TODO: 可能ならダミーのasを返して成功扱いにしたい
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", path);
    xhr.responseType = "arraybuffer";
    xhr.onerror = errorEnd1;
    xhr.onload = function (e) {
      var firstLetter = (""+e.target.status).substr(0, 1);
      if ((firstLetter !== "0") && (firstLetter !== "2")) {
        errorEnd1();
        return;
      }
      try {
        ac.decodeAudioData(xhr.response, function (buf) {
          if (!buf) { errorEnd2(); return; }
          // NB: buf以外の情報はこの外側で付与する。
          //     ここに渡ってくるpathはquery付きなので、ここでは含めない事！
          var as = {buf: buf};
          cont(as);
          return;
        }, errorEnd2);
      }
      catch (e) {
        errorEnd2();
        return;
      }
    };
    xhr.send();
  };


  // WebAudioのnodeを安全にdisconnectする為のラッパー。大した事はしていない
  function disconnectSafely (node) {
    if (node == null) { return; }
    try { node.disconnect(); } catch (e) {}
  }


  // stateを返す。stateは再生状況に応じて変化する
  // (nullが返った場合は、何らかの理由で再生に失敗した)
  device.play = function (as, opts) {
    if (!as) { return null; }
    if (as.disposed) { return null; }
    if (!as.buf) { return null; }
    var buf = as.buf;

    var volume = opts["volume"]; if (volume == null) { volume = 1; }
    volume = va5._assertNumber("volume", 0, volume, 10);
    var pitch = va5._assertNumber("pitch", 0.1, opts["pitch"]||1, 10);
    var pan = va5._assertNumber("pan", -1, opts["pan"]||0, 1);
    var isLoop = !!opts["isLoop"];
    var loopStart = va5._assertNumber("loopStart", 0, opts["loopStart"]||0, null);
    var loopEnd = va5._assertNumber("loopEnd", null, opts["loopEnd"]||buf.duration, null);
    var startPos = va5._assertNumber("startPos", 0, opts["startPos"]||0, null);
    var endPos = opts["endPos"] || null;
    if (endPos != null) { endPos = va5._assertNumber("endPos", null, endPos, null); }

    var sourceNode = ac.createBufferSource();
    var gainNode = ac.createGain();
    sourceNode.buffer = buf;
    sourceNode.playbackRate.value = pitch;
    gainNode.gain.value = volume;
    sourceNode.connect(gainNode);
    var pannerNodeType;
    var pannerNode;
    if (ac.createStereoPanner) {
      pannerNodeType = "stereoPannerNode";
      pannerNode = ac.createStereoPanner();
      pannerNode.pan.value = pan;
      gainNode.connect(pannerNode);
      pannerNode.connect(masterGainNode);
    }
    else if (ac.createPanner) {
      pannerNodeType = "pannerNode";
      pannerNode = ac.createPanner();
      pannerNode.panningModel = "equalpower";
      pannerNode.setPosition(pan, 0, 1-Math.abs(pan));
      gainNode.connect(pannerNode);
      pannerNode.connect(masterGainNode);
    }
    else {
      pannerNodeType = "none";
      pannerNode = null;
      gainNode.connect(masterGainNode);
    }

    if (isLoop) {
      sourceNode.loop = true;
      sourceNode.loopStart = loopStart;
      sourceNode.loopEnd = loopEnd;
    }
    else {
      sourceNode.onended = function () {
        disconnectSafely(sourceNode);
        disconnectSafely(gainNode);
        disconnectSafely(pannerNode);
        state.sourceNode = null;
        state.gainNode = null;
        state.pannerNode = null;
        state.playEndTime = ac.currentTime || (Date.now()/1000);
      };
    }

    var offset = startPos;
    if (isLoop) {
      offset = startPos || loopStart || 0;
    }
    if (endPos) {
      var duration = endPos - offset;
      sourceNode.start(0, offset, duration);
    }
    else {
      sourceNode.start(0, offset);
    }

    var now = ac.currentTime || (Date.now()/1000);

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

      sourceNode: sourceNode,
      gainNode: gainNode,
      pannerNodeType: pannerNodeType,
      pannerNode: pannerNode,

      playStartTime: now,
      playEndTime: null
    };

    return state;
  };

  device.setVolumeMaster = function (volume) {
    masterGainNode.gain.value = volume;
    return;
  };


  // TODO: もっと機能を追加する必要あり

})(this);
