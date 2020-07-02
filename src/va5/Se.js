(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Se = va5.Se || {}; va5.Se = Se;


  // ch -> state(seの。deviceのplayingStateではない事に要注意)
  var chToState = {};

  // path -> [ch1, ch2, ...]
  var pathToChs = {};


  var fadeGranularityMsec = 100;


  // 全SE共通の音量倍率
  var baseVolume = 1;

  Se.setBaseVolume = function (newVolume, isInit) {
    var oldBaseVolume = baseVolume;
    baseVolume = newVolume;
    if (isInit) { return; }
    Object.values(pathToChs).forEach(function (ch) {
      var state = chToState[ch];
      if (!state) { return; }
      if (!state.playingState) { return; }
      // フェード中は音量再計算がややこしいのでパスする
      if (state.fading) { return; }
      var volumeTrue = state.volume * baseVolume;
      state.volumeTrue = volumeTrue;
      va5._device.setVolume(state.playingState, volumeTrue);
    });
  };

  function stopImmediatelyByCh (ch) {
    if (!ch) { return; }
    var state = chToState[ch];
    if (!state) { return; }

    if (state.loading) {
      state.cancelled = true;
    }

    if (state.playingState) {
      // playingStateを強制停止する＆破棄する
      va5._device.disposePlayingState(state.playingState);
      state.playingState = null;
    }

    state.as = null;

    // 各テーブルから除去する
    delete chToState[ch];
    var path = state.path;
    var chans = pathToChs[path] || [];
    chans = chans.filter(function (ctmp) {
      return (ch !== ctmp);
    });
    if (chans.length) {
      pathToChs[path] = chans;
    }
    else {
      delete pathToChs[path];
    }
    va5._logDebug("stopped and disposed se " + ch);
  }

  // pathに対応する再生を即座に停止する。予約もキャンセルする
  Se.stopImmediatelyByPath = function (path) {
    if (path == null) { return; }
    path = va5._validatePath(path);
    if (path == null) { return; }
    var chans = pathToChs[path];
    if (!chans) { return; }
    // cloneする必要がある(stopImmediatelyByChによって書き換えられる為)
    chans.slice().forEach(stopImmediatelyByCh);
  };

  Se.stopImmediatelyAll = function () {
    Object.keys(chToState).forEach(stopImmediatelyByCh);
  };


  // 多重起動しないようにしてもよい(面倒なので後回し)
  Se.bootstrapPlayingAudioChannelPoolWatcher = function () {
    var ch;
    for (ch in chToState) {
      var state = chToState[ch];
      if (!state) { continue; }
      if (!state.playingState) { continue; }
      if (va5._device.isFinished(state.playingState)) { stopImmediatelyByCh(ch); }
    }
    // NB: stopImmediatelyByChによって、chToStateが全チェックされない
    //     ケースがありえる。しかしその場合でも次の周回でチェックされるので
    //     問題ないという事にしている
    window.setTimeout(Se.bootstrapPlayingAudioChannelPoolWatcher, 3333);
  };


  var chanCount = 0;
  function makeNewChannelId () {
    var ch = "sech" + ("0000" + chanCount).slice(-4);
    ch = va5._assertSeCh(ch);
    chanCount = (chanCount+1) % 10000;
    return ch;
  }

  function playSeTrue (path, opts, c, ch) {
    if (ch == null) { return null; }

    stopImmediatelyByCh(ch);

    var isAlarm = !!opts["isAlarm"];

    var volumeTrue = c.volume * baseVolume;

    var state = {
      path: path,
      volume: c.volume,
      pitch: c.pitch,
      pan: c.pan,
      isAlarm: isAlarm,

      startPos: c.startPos,
      endPos: c.endPos,

      volumeTrue: volumeTrue,

      as: null,
      playingState: null,
      loading: true,
      fading: false,
      cancelled: false
    };

    // TODO: このfnがメモリリークの原因になる事はありえるか？ちょっと検証する必要がある…
    va5.Cache.load(path, function (as) {
      state.loading = false;
      if (!as) {
        stopImmediatelyByCh(ch);
        return;
      }
      if (state.cancelled) {
        stopImmediatelyByCh(ch);
        return;
      }
      state.as = as;
      // ロード完了時にバックグラウンド状態なら、即座に終了させる
      if (va5.Bgm.isInBackground() && va5.config["is-pause-on-background"] && !state.isAlarm) {
        state.cancelled = true;
        stopImmediatelyByCh(ch);
        return;
      }
      // NB: ローディング中にse-chattering-secによってパラメータが
      //     変化している場合がある。なので元の値を参照せずに、
      //     stateから参照し直す必要がある
      var deviceOpts = {
        volume: state.volume * baseVolume,
        pitch: state.pitch,
        pan: state.pan,
        loopStart: null,
        loopEnd: null,
        startPos: state.startPos,
        endPos: va5.Util.calcActualEndPos(state)
      };
      va5._logDebug("loaded. play se " + path + " : " + ch);
      state.playingState = va5._device.play(as, deviceOpts);
    });

    chToState[ch] = state;
    var chans = pathToChs[path] || []; pathToChs[path] = chans;
    chans.push(ch);

    va5._logDebug("reserved to play se " + path + " : " + ch);

    return ch;
  }

  function mergeState (state, c) {
    var prevVolume = state.volume;
    var prevPitch = state.pitch;
    var prevPan = state.pan;

    // 合成後の音量は基本的に大きくなる。しかし普通に加算すると
    // すぐに音割れ状態になってしまうので増幅量は小さ目にしておく
    var newVolume = Math.max(prevVolume, c.volume) + 0.1 * Math.min(prevVolume, c.volume);
    newVolume = Math.min(newVolume, 1.1); // キャップ値の設定はかなり悩む
    var newPitch = (prevPitch + c.pitch) / 2; // これは調整の余地あり…
    var newPan = (prevPan + c.pan) / 2;
    state.volume = newVolume;
    state.pitch = newPitch;
    state.pan = newPan;
    // startPos/endPosのmergeも必要！
    // (通常mergeでは不要だがload前mergeの時に必要になる)
    state.startPos = c.startPos;
    state.endPos = c.endPos;
  }

  Se.playSe = function (path, opts) {
    if (path == null) { return null; }
    path = va5._validatePath(path);
    if (path == null) { return null; }

    opts = opts || {};
    var ch = va5._validateSeCh(opts["channel"] || makeNewChannelId());
    var c = va5.Util.parsePlayCommonOpts(path, opts);
    // Seでは必ずendPosを設定する必要がある(非ループ指定)
    if (c.endPos == null) { c.endPos = 0; }

    var seChatteringSec = va5.config["se-chattering-sec"];
    if (!seChatteringSec) { return playSeTrue(path, opts, c, ch); }
    var chs = pathToChs[path];
    if (!chs) { return playSeTrue(path, opts, c, ch); }
    var lastCh = chs.slice(-1)[0];
    if (!lastCh) { return playSeTrue(path, opts, c, ch); }
    var lastState = chToState[lastCh];
    if (!lastState) { return playSeTrue(path, opts, c, ch); }
    if (lastState.loading) {
      // loading時のみ、seChatteringSec判定を飛ばして、特殊mergeが必要
      // (再生前なのでseChatteringSec=0でない限り常に判定される)
      mergeState(lastState, c);
      va5._logDebug("se-chattering-sec detected. merging parameters for " + path);
      return lastCh;
    }
    if (!lastState.playingState) { return playSeTrue(path, opts, c, ch); }
    if (va5._device.isFinished(lastState.playingState)) { return playSeTrue(path, opts, c, ch); }
    if (lastState.fading) { return playSeTrue(path, opts, c, ch); }
    //console.log("startPos", lastState.startPos, c.startPos); // for debug
    //console.log("endPos", lastState.endPos, c.endPos); // for debug
    if (lastState.startPos != c.startPos) { return playSeTrue(path, opts, c, ch); }
    if (lastState.endPos != c.endPos) { return playSeTrue(path, opts, c, ch); }
    //console.log("startPos and endPos are same, continue to check chattering"); // for debug
    if (!va5._device.isInSeChatteringSec(lastState.playingState)) { return playSeTrue(path, opts, c, ch); }
    // chatterしていた。mergeを行う
    mergeState(lastState, c);
    var volumeTrue = lastState.volume * baseVolume;
    va5._device.setVolume(lastState.playingState, volumeTrue);
    va5._device.setPitch(lastState.playingState, lastState.pitch);
    va5._device.setPan(lastState.playingState, lastState.pan);
    va5._logDebug("se-chattering-sec detected. merging parameters for " + path);
    return lastCh;
  };


  Se.stopSe = function (ch, fadeSec) {
    if (fadeSec == null) { fadeSec = va5.Config["default-se-fade-sec"]; }
    fadeSec = va5._validateNumber("fadeSec", 0, fadeSec, null, 0);
    if (ch == null) {
      // chが偽値なら、全再生中chに対して再帰実行する
      Object.keys(chToState).forEach(function (ch2) {
        Se.stopSe(ch2, fadeSec);
      });
      return;
    }
    ch = va5._validateSeCh(ch);
    if (ch == null) { return; }

    var state = chToState[ch];
    if (!state) { return; }

    if (!fadeSec) {
      stopImmediatelyByCh(ch);
      return;
    }

    va5._logDebug("start to fade se " + ch);
    state.fading = true;
    var fadeStartMsec = va5.getNowMsec();
    var tick = function () {
      if (!state.playingState) { return; } // 他の要因で既にshutdownされた場合
      var now = va5.getNowMsec();
      var elapsedMsec = now - fadeStartMsec;
      var progress = elapsedMsec / (fadeSec * 1000);
      progress = Math.max(0, Math.min(progress, 1));
      var newVolume = state.volumeTrue * (1 - progress);
      va5._device.setVolume(state.playingState, newVolume);
      if (newVolume) {
        window.setTimeout(tick, fadeGranularityMsec);
      }
      else {
        stopImmediatelyByCh(ch);
      }
    };
    window.setTimeout(tick, fadeGranularityMsec);
  };


  // デバッグ用情報を取得する機能
  Se.stats = function () {
    var result = {
      entries: 0,
      loadings: 0,
      playings: 0,
      fadings: 0,
      cancelled: 0,
      finished: 0,
      unknowns: 0,
    };
    Object.keys(chToState).forEach(function (ch) {
      var state = chToState[ch];
      result.entries++;
      if (false) {}
      else if (state.cancelled) { result.cancelled++; }
      else if (state.loading) { result.loadings++; }
      // NB: ここのカウントはあまり正確でない。ここを正確にするには
      //     _device を呼んでまだ再生中か完了しているか調べる必要がある
      else if (state.fading) { result.fadings++; }
      else if (state.playingState) { result.playings++; }
      // ↑を実装したら、ここも実装する事
      else if (false) { result.finished++; }
      else { result.unknowns++; }
    });
    return result;
  };

})(this);
