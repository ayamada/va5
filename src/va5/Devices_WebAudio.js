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
  //     ただ、そういう環境と、AudioContextの初期状態がsuspendedなので
  //     0から動かない環境との区別が全く付かない。
  //     前者の環境はもうないとするしかない
  device.getCurrentSec = function () { return ac.currentTime; };


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

    if (state.isLoop) {
      state.sourceNode.loop = true;
      state.sourceNode.loopStart = state.loopStart;
      state.sourceNode.loopEnd = state.loopEnd;
    }
    else {
      // NB: 古い端末で、自動再生終了すると音が鳴らなくなる問題があり、
      //     またendedイベントが発生しないものもあるらしく、
      //     それへのdirty fixとして、わざとloop有効にしてloopを検出したら
      //     手で音源を停止する、という技があった。
      //     でももうやらなくてもいいだろう…
      state.sourceNode.onended = function () { shutdownPlayingState(state); };
    }

    if (state.endPos) {
      state.sourceNode.start(0, state.startPos, state.endPos - state.startPos);
    }
    else {
      state.sourceNode.start(0, state.startPos);
    }
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
    if (endPos != null) { endPos = va5._validateNumber("endPos", startPos, endPos, null, buf.duration); }
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
      // sleep/resumeおよびsetPitchによって変化するので、
      // それ以外の用途には使わない事！
      playStartSec: now,
      playStartPos: startPos,

      // これは「再生終了済」のフラグ用途。値はほぼ利用されない
      playEndSec: null,

      playPausePos: isSleepingStart ? startPos : null
    };
    appendNodes(state, isSleepingStart);

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
        // NB: もしここで例外が発生したら、playStartSecとplayStartPosは
        //     そのままになるべきなので、この処理順となっている
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


  // この音源の現在の再生位置を返す。ほぼ音ゲー用。
  // 再生終了後はnullを返す、要注意。
  // pitch設定によらず、返される値は 0 ～ buf.duration の間の値となる。
  // ループ分も考慮されない。しかしループ時には巻き戻りが発生するので、
  // 巻き戻りが起こったかを呼び出し元でチェックすれば
  // ループをカウントする事は一応可能。
  device.calcPos = function (state) {
    if (!state) { return null; }
    if (state.playEndSec != null) { return null; }
    if (state.playPausePos) { return state.playPausePos; }
    var now = va5.getNowMsec() / 1000;
    var elapsed = now - state.playStartSec;
    return state.playStartPos + (elapsed / state.pitch);
  };


  // BGMのバックグラウンド一時停止用。それ以外の用途には使わない事(衝突する為)
  // 実装としては、 playPausePos に現在のposを記録しておき、完全停止する。
  // 再開時には古いnodeをGCし、全く新しいnodeを生成して差し替える。
  // なんでこんな仕様なのかというと、AudioContext.suspend()は呼べないし、
  // sourceNodeだけ一時停止する事はできない為。
  // (sourceNodeは一旦停止させたら再度playする事はできない)
  device.sleep = function (state) {
    if (!state) { return; }
    if (!state.sourceNode) { return; }
    if (state.playEndSec != null) { return; }
    if (state.playPausePos != null) { return; } // 既にpause状態だった
    state.playPausePos = device.calcPos(state);
    // sourceNodeを停止させる(ただし除去はしない)
    stopSafely(state);
    disconnectSafely(state.sourceNode);
    disconnectSafely(state.gainNode);
    disconnectSafely(state.pannerNode);
  };
  device.resume = function (state) {
    if (!state) { return; }
    if (!state.sourceNode) { return; }
    if (state.playEndSec != null) { return; }
    if (state.playPausePos == null) { return; } // pause状態ではなかった
    state.playStartPos = state.playPausePos;
    state.playPausePos = null;
    state.playStartSec = va5.getNowMsec() / 1000;
    // nodesを再生成する(古いものは除去してよい)
    appendNodes(state, false);
  };


  // 効果音をon the flyに生成するのに必要となった
  device.getAudioContext = function () {
    return ac;
  };


})(this);
