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
    //if (false) {
    //  try { ac.close(); } catch (e) { va5._logDebug(e); }
    //  ac = null;
    //  va5._logError("too old WebAudio, disable forcibly");
    //  return false;
    //}

    masterGainNode = ac.createGain();
    masterGainNode.gain.value = 1;
    masterGainNode.connect(ac.destination);

    va5.Devices_WebAudio_Unlock.install(ac);

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
    try {
      if (node.buffer) { node.buffer = null; }
    } catch (e) { va5._logDebug(e); }
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
    state.playEndedTimestamp = va5.getNowMsec() / 1000;

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


  device.audioSourceToSampleRate = function (as) {
    if (as == null) { return null; }
    if (as.disposed) { return null; }
    if (!as.buf) { return null; }
    return as.buf.sampleRate;
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
    if (path == null) { errorEnd1(null); return; }
    path = va5._validatePath(path);
    if (path == null) { errorEnd1(null); return; }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", path);
    xhr.responseType = "arraybuffer";
    xhr.onerror = errorEnd1;
    xhr.onload = function (e) {
      var firstLetter = (""+e.target.status).substr(0, 1);
      if ((firstLetter !== "0") && (firstLetter !== "2")) {
        errorEnd1(null);
        return;
      }
      try {
        ac.decodeAudioData(xhr.response, function (buf) {
          if (!buf) { errorEnd2(null); return; }
          // NB: ロードに成功しても、極端に短い曲はエラー扱いにする
          //     (無限ループで過負荷になるのを避ける為)
          if (buf.duration < 0.01) {
            va5._logError(["duration too short", path]);
            errorEnd1(null);
            return;
          }
          cont(device.bufToAudioSource(buf));
          return;
        }, errorEnd2);
      }
      catch (e) {
        va5._logDebug(e);
        errorEnd2(null);
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

    if (state.playEndSec == null) {
      state.sourceNode.loop = true;
      state.sourceNode.loopStart = state.loopStartSec;
      state.sourceNode.loopEnd = state.loopEndSec;
    }
    else {
      // NB: 古い端末で、自動再生終了すると音が鳴らなくなる問題があり、
      //     またendedイベントが発生しないものもあるらしく、
      //     それへのdirty fixとして、わざとloop有効にしてloopを検出したら
      //     手で音源を停止する、という技があった。
      //     でももうやらなくてもいいだろう…
      state.sourceNode.onended = function () {
        // NB: 通常はそのまま終了でよいが、sleepに入る時は破棄してはいけない
        if (state.playPausedPos == null) {
          va5._logDebug(["onended", state, "and shutdown"]);
          shutdownPlayingState(state);
        }
        else {
          va5._logDebug(["onended", state, "but slept (dont shutdown)"]);
        }
      };
    }

    if (state.playEndSec != null) {
      state.sourceNode.start(0, state.replayStartPos, state.playEndSec - state.replayStartPos);
    }
    else {
      state.sourceNode.start(0, state.replayStartPos);
    }
  }


  // stateを返す。stateは再生状況に応じて変化する
  // (nullが返った場合は、何らかの理由で再生に失敗した)
  device.play = function (as, opts) {
    if (!as) { return null; }
    if (as.disposed) { return null; }
    if (!as.buf) { return null; }
    var buf = as.buf;
    var duration = buf.duration;

    var state = va5.Util.createDeviceState(as, opts, duration);

    appendNodes(state, state.isSleepingStart);

    if (state.isSleepingStart) {
      state.gainNode.gain.value = 0;
      state.sourceNode.stop();
    }

    if (state.isNeedFinishImmediately) { shutdownPlayingState(state); }

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
        var oldStartSec = state.replayStartTimestamp;
        var oldStartPos = state.replayStartPos;
        var now = va5.getNowMsec() / 1000;
        var elapsed = now - oldStartSec;
        var pos = oldStartPos + (elapsed * oldPitch);
        state.sourceNode.playbackRate.value = newPitch;
        // NB: もし↑で例外が発生した時は、replayStartTimestampと
        //     replayStartPosは以前のままになるべきなので、↑の後に変更する
        state.replayStartTimestamp = now;
        state.replayStartPos = pos;
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
  // ループ時は巻き戻る(resumeの為の仕様)
  device.calcPos = function (state) {
    if (!state) { return null; }
    if (state.playEndedTimestamp != null) { return null; }
    if (state.playPausedPos != null) { return state.playPausedPos; }
    var now = va5.getNowMsec() / 1000;
    var elapsed = now - state.replayStartTimestamp;
    var rawPos = state.replayStartPos + (elapsed / state.pitch);
    // ループなしなら、そのままの値を再生位置として利用できる
    if (state.playEndSec != null) { return rawPos; }
    // ループありの場合は巻き戻りを考慮しなくてはならない
    var loopStartSec = state.loopStartSec;
    var loopEndSec = state.loopEndSec;
    if (loopEndSec <= loopStartSec) {
      va5._logError(["found confused loop parameters", {"loopStartSec": loopStartSec, "loopEndSec": loopEndSec}]);
      return null;
    }
    return loopStartSec + ((rawPos - loopStartSec) % (loopEndSec - loopStartSec));
  };


  // BGMのバックグラウンド一時停止用。それ以外の用途には使わない事(衝突する為)
  // 実装としては、 playPausedPos に現在のposを記録しておき、完全停止する。
  // 再開時には古いnodeをGCし、全く新しいnodeを生成して差し替える。
  // なんでこんな仕様なのかというと、AudioContext.suspend()は呼べないし、
  // sourceNodeだけ一時停止する事はできない為。
  // (sourceNodeは一旦停止させたら再度playする事はできない)
  device.sleep = function (state) {
    if (!state) { return; }
    if (!state.sourceNode) { return; }
    if (state.playEndedTimestamp != null) { return; }
    if (state.playPausedPos != null) { return; } // 既にpause状態だった
    state.playPausedPos = device.calcPos(state);
    // sourceNodeを停止させる(ただし除去はしない)
    stopSafely(state);
    disconnectSafely(state.sourceNode);
    disconnectSafely(state.gainNode);
    disconnectSafely(state.pannerNode);
  };
  device.resume = function (state) {
    if (!state) { return; }
    if (!state.sourceNode) { return; }
    if (state.playEndedTimestamp != null) { return; }
    if (state.playPausedPos == null) { return; } // pause状態ではなかった
    state.replayStartTimestamp = va5.getNowMsec() / 1000;
    state.replayStartPos = state.playPausedPos;
    state.playPausedPos = null;
    // nodesを再生成する(古いものは除去してよい)
    appendNodes(state, false);
  };


  // 効果音をon the flyに生成するのに必要となった
  device.getAudioContext = function () {
    return ac;
  };


  device.isFinished = function (state) {
    return (state.playEndedTimestamp != null);
  };


  device.getPlayStartedTimestamp = function (state) {
    if (!state) { return null; }
    return state.playStartedTimestamp;
  };


  device.isInSeChatteringSec = function (state) {
    var seChatteringSec = va5.getConfig("se-chattering-sec");
    if (!seChatteringSec) { return false; }
    var now = va5.getNowMsec() / 1000;
    var diff = now - state.playStartedTimestamp;
    return (diff < seChatteringSec);
  };


})(this);
