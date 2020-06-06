(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Devices = va5.Devices || {}; va5.Devices = Devices;
  var device = Devices.WebAudio || {}; Devices.WebAudio = device;

  device.name = "WebAudio";


  // NB: WebAudio / AudioContext へのiOSの対応はmobile safari6からとなっている。
  //     それ以前は無音になるので問題ないが、中途半端に対応している機能を
  //     うっかり叩かないように注意する必要がある。


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
    // (closeが存在しない等のケースがあるようだ)
    try { (new AudioContext()).close(); } catch (e) { va5._logDebug(e); }
    // 今度は正式にacを生成する
    try {
      ac = new AudioContext();
    }
    catch (e) {
      ac = null;
      va5._logError("could not create AudioContext");
      va5._logDebug(e);
      return false;
    }

    // TODO: このタイミングで「あまりに古すぎるモバイル端末」を除外したい。どう判定する？できればuseragentに頼らない判定をしたいが…
    //       - (chromeでない)android標準ブラウザはWebAudio非対応なので自動的に除外されるので問題ない
    //       - 問題は、WebAudioに中途半端にしか対応していない環境。これをどうにかして検出する必要がある…
    if (false) {
      try { ac.close(); } catch (e) { va5._logDebug(e); }
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


  // NB: これはcurrentTimeを提供していないデバイスでは実装してはいけない。
  //     (どうしても実装する場合はnullを返すようにする事)
  // NB: ac.currentTimeはあるものの0から動かない環境があるらしい。
  //     なので0だった場合は特別にnullを返すようにする
  device.getCurrentSec = function () { return ac.currentTime || null; };


  function disconnectSafely (node) {
    if (node == null) { return; }
    try { node.disconnect(); } catch (e) { va5._logDebug(e); }
  }

  function stopSafely (state) {
    if (!state) { return; }
    if (state.disposed) { return; }
    if (!state.sourceNode) { return; }
    // NB: race conditionがありえるので、tryで囲む
    try { state.gainNode.gain.value = 0; } catch (e) { va5._logDebug(e); }
    try { state.sourceNode.stop(); } catch (e) { va5._logDebug(e); }
  }

  function shutdownPlayingState (state) {
    if (!state) { return; }
    if (state.disposed) { return; }
    // stopSafelyによって onended が発生する可能性があるので、
    // 先にdisposedフラグを立てておく(onendedが発生しても二重実行を防げる)
    state.disposed = true;
    state.playEndSec = va5.getNowMsec() / 1000;

    stopSafely(state);
    disconnectSafely(state.sourceNode);
    disconnectSafely(state.gainNode);
    disconnectSafely(state.pannerNode);
    if (state.sourceNode) { state.sourceNode.onended = null; }
    state.sourceNode = null;
    state.gainNode = null;
    state.pannerNode = null;
  }


  device.disposeAudioSource = function (as) {
    if (as == null) { return; }
    if (as.disposed) { return; }
    // WebAudio では、全てが自動でGC可能な筈。
    // ただブラウザ側の不具合でGCできない可能性もあり、
    // その場合はここで何らかの処理を行う必要があるかもしれない
    as.buf = null;
    as.disposed = true;
  };


  device.disposePlayingState = function (state) {
    shutdownPlayingState(state);
    // WebAudio では、全てが自動でGC可能な筈。
    // ただブラウザ側の不具合でGCできない可能性もあり、
    // その場合はここで何らかの処理を行う必要があるかもしれない
  };


  device.audioSourceToDuration = function (as) {
    if (as == null) { return null; }
    if (as.disposed) { return null; }
    if (!as.buf) { return null; }
    return as.buf.duration;
  }


  device.bufToAudioSource = function (buf) {
    // NB: buf以外の情報はこの外側で付与する。
    //     ここに渡ってくるpathはquery付き、ここでpathを含めない事！
    var as = {buf: buf};
    return as;
  };


  // ロードに成功しても失敗してもcontが実行される。
  // 成功していれば引数にasが渡され、失敗ならnullが渡される。
  // asは「メタ情報を付与されたAudioSource」であり、WebAudioの場合は
  // bufとその他のメタ情報になる。
  // NB: ここに渡すpathは va5._cache.appendQueryString() 処理済である事！
  device.loadAudioSource = function (path, cont) {
    // init()実行前もしくはinit()がfalseを返したのにここが呼ばれた
    if (ac == null) { throw new Error("Invalid call"); }
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
    path = va5._validatePath(path);
    if (path == null) { errorEnd1(); return; }
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
          cont(device.bufToAudioSource(buf));
          return;
        }, errorEnd2);
      }
      catch (e) {
        va5._logDebug(e);
        errorEnd2();
        return;
      }
    };
    xhr.send();
  };


  function appendNodes (state, isSleepingStart) {
    var sourceNode = ac.createBufferSource();
    var gainNode = ac.createGain();
    sourceNode.buffer = state.as.buf;
    sourceNode.playbackRate.value = state.pitch;
    gainNode.gain.value = isSleepingStart ? 0 : state.volume;
    sourceNode.connect(gainNode);
    var pannerNodeType;
    var pannerNode;
    if (ac.createStereoPanner) {
      pannerNodeType = "stereoPannerNode";
      pannerNode = ac.createStereoPanner();
      pannerNode.pan.value = state.pan;
      gainNode.connect(pannerNode);
      pannerNode.connect(masterGainNode);
    }
    else if (ac.createPanner) {
      pannerNodeType = "pannerNode";
      pannerNode = ac.createPanner();
      pannerNode.panningModel = "equalpower";
      pannerNode.setPosition(state.pan, 0, 1-Math.abs(state.pan));
      gainNode.connect(pannerNode);
      pannerNode.connect(masterGainNode);
    }
    else {
      pannerNodeType = "none";
      pannerNode = null;
      gainNode.connect(masterGainNode);
    }

    state.sourceNode = sourceNode;
    state.gainNode = gainNode;
    state.pannerNodeType = pannerNodeType;
    state.pannerNode = pannerNode;
  }


  // stateを返す。stateは再生状況に応じて変化する
  // (nullが返った場合は、何らかの理由で再生に失敗した)
  device.play = function (as, opts) {
    if (!as) { return null; }
    if (as.disposed) { return null; }
    if (!as.buf) { return null; }
    var buf = as.buf;

    var volume = opts["volume"]; if (volume == null) { volume = 1; }
    volume = va5._validateNumber("volume", 0, volume, 10, 0);
    var pitch = va5._validateNumber("pitch", 0.1, opts["pitch"]||1, 10, 1);
    var pan = va5._validateNumber("pan", -1, opts["pan"]||0, 1, 0)
    var isLoop = !!opts["isLoop"];
    var loopStart = va5._validateNumber("loopStart", 0, opts["loopStart"]||0, null, 0);
    var loopEnd = va5._validateNumber("loopEnd", null, opts["loopEnd"]||buf.duration, null, buf.duration);
    var startPos = va5._validateNumber("startPos", 0, opts["startPos"]||0, null, 0);
    var endPos = opts["endPos"] || null;
    if (endPos != null) { endPos = va5._validateNumber("endPos", null, endPos, null, buf.duration); }
    var isSleepingStart = !!opts["isSleepingStart"];

    var isNeedFinishImmediately = (endPos < startPos);
    // すぐ終わらせるので、強制的にisSleepingStartと同様の処理を行わせる
    if (isNeedFinishImmediately) { isSleepingStart = true; }

    if (isLoop && (loopEnd <= loopStart)) {
      va5._logError(["found confused loopStart and loopEnd", loopStart, loopEnd]);
      loopStart = 0;
      loopEnd = buf.duration;
    }

    var now = va5.getNowMsec() / 1000;

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

      // ここは直後のappendNodesで設定される
      sourceNode: null,
      gainNode: null,
      pannerNodeType: null,
      pannerNode: null,

      // この二つは「現在の再生位置」を算出する為の内部用の値。
      // sleep/resumeおよびsetPitchによって変化するので要注意。
      playStartSec: now,
      playStartPos: startPos,

      // これは「再生終了済」のフラグ用途。値はほぼ利用されない
      playEndSec: null,

      // TODO: きちんと対応する事
      playPausePos: isSleepingStart ? startPos : null
      // TODO: dumbにも対応するプロパティを用意する事
    };
    appendNodes(state, isSleepingStart);

    // TODO

    if (isLoop) {
      state.sourceNode.loop = true;
      state.sourceNode.loopStart = loopStart;
      state.sourceNode.loopEnd = loopEnd;
    }
    else {
      state.sourceNode.onended = function () { shutdownPlayingState(state); };
    }

    var offset = startPos;
    if (isLoop) {
      offset = startPos || loopStart || 0;
    }
    if (endPos) {
      var duration = endPos - offset;
      state.sourceNode.start(0, offset, duration);
    }
    else {
      state.sourceNode.start(0, offset);
    }
    if (isSleepingStart) {
      state.gainNode.gain.value = 0;
      state.sourceNode.stop();
    }


    if (isNeedFinishImmediately) { shutdownPlayingState (state); }
    return state;
  };


  device.getVolume = function (state) { return state.volume; };

  device.getPitch = function (state) { return state.pitch; };

  device.getPan = function (state) { return state.pan; };

  device.setVolume = function (state, newVolume) {
    state.volume = newVolume;
    // NB: race conditionがありえるので、tryで囲む
    try {
      if (state.gainNode) { state.gainNode.gain.value = newVolume; }
    }
    catch (e) { va5._logDebug(e); }
  };

  device.setPitch = function (state, newPitch) {
    var oldPitch = state.pitch;
    state.pitch = newPitch;
    // NB: race conditionがありえるので、tryで囲む
    try {
      if (state.sourceNode) {
        var oldStartSec = state.playStartSec;
        var oldStartPos = state.playStartPos;
        var now = va5.getNowMsec() / 1000;
        var elapsed = now - oldStartSec;
        var pos = oldStartPos + (elapsed * oldPitch);
        state.sourceNode.playbackRate.value = newPitch;
        state.playStartSec = now;
        state.playStartPos = pos;
      }
    }
    catch (e) { va5._logDebug(e); }
  };

  device.setPan = function (state, newPan) {
    state.pan = newPan;
    // NB: race conditionがありえるので、tryで囲む
    try {
      if (state.pannerNode) {
        if (state.pannerNodeType === "stereoPannerNode") {
          state.pannerNode.pan.value = newPan;
        }
        else if (state.pannerNodeType === "pannerNode") {
          state.pannerNode.setPosition(newPan, 0, 1-Math.abs(newPan));
        }
        else {
          throw new Error("unknown pannerNodeType: "+state.pannerNodeType);
        }
      }
    }
    catch (e) { va5._logDebug(e); }
  };


  device.setVolumeMaster = function (volume) {
    masterGainNode.gain.value = volume;
    return;
  };


  // dispose後等、取得できない状態の場合はnullを返す、要注意
  device.calcPos = function (state) {
    // TODO
  };

  // BGMのバックグラウンド一時停止用。それ以外の用途には使わない事(衝突する為)
  // 実装としては、 playPausePos に現在のposを記録しておき、完全停止する。
  // 再開時には古いnodeをGCし、全く新しいnodeを生成して差し替える。
  // なんでこんな仕様なのかというと、AudioContext.suspend()は呼べないし、
  // nodeだけ一時停止する事はできないようなので。
  // (sourceNodeを止めてもバッファが生きているのですぐには止まらない為)
  device.sleep = function (state) {
    if (!state) { return; }
    if (!state.sourceNode) { return; }
    // NB: 既に再生停止している場合は何もしない
    if (state.playEndSec != null) { return; }
    //state.playPausePos = state.sourceNode.
    // TODO
  }
  device.resume = function (state) {
    // TODO
  }

  // TODO: dumbに対応する関数を実装する事

  // TODO: もっと機能を追加する必要あり

})(this);
