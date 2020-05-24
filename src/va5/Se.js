(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Se = va5.Se || {}; va5.Se = Se;


  // sech -> state(seの。deviceのplayingStateではない事に要注意)
  var seChToState = {};

  // path -> [sech, ...]
  var pathToSeChs = {};


  var fadeGranularityMsec = 100;


  // 全SE共通の音量倍率
  var commonVolumeSe = 1;

  Se.setVolumeSe = function (newVolumeSe, isInit) {
    var oldVolumeSe = commonVolumeSe;
    commonVolumeSe = newVolumeSe;
    if (isInit) { return; }
    Object.vals(pathToSeChs).forEach(function (ch) {
      var state = seChToState[ch];
      if (!state) { return; }
      if (!state.playingState) { return; }
      // フェード中は音量再計算がややこしいのでパスする
      if (state.fading) { return; }
      var volumeTrue = state.volume * commonVolumeSe;
      state.volumeTrue = volumeTrue;
      va5._device.setVolume(state.playingState, volumeTrue);
    });
  };

  function stopImmediatelyByCh (ch) {
    if (!ch) { return; }
    var state = seChToState[ch];
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
    delete seChToState[ch];
    var path = state.as.path;
    var chans = pathToSeChs[path] || [];
    chans = chans.filter(function (ctmp) {
      return (ch !== ctmp);
    });
    if (chans.length) {
      pathToSeChs[path] = chans;
    }
    else {
      delete pathToSeChs[path];
    }
  }

  // pathに対応する再生を即座に停止する。予約もキャンセルする
  Se.stopImmediatelyByPath = function (path) {
    if (path == null) { return; } path = va5._assertPath(path);
    var chans = pathToSeChs[path];
    if (!chans) { return; }
    // cloneする必要がある(stopImmediatelyByChによって書き換えられる為)
    chans = chans.slice();
    chans.forEach(stopImmediatelyByCh);
  };

  Se.stopImmediatelyAll = function () {
    Object.keys(seChToState).forEach(stopImmediatelyByCh);
  };


  // TODO: 旧版とは違い、playingStateが再生終了していたらstopImmediatelyByChしていくだけでよい？(ただしロード待ちのものを除去しないよう注意する事)
  Se.bootstrapPlayingAudioChannelPoolWatcher = function () {
    // TODO
//(defn run-playing-audiochannel-pool-watcher! []
//  (when-not @playing-audiochannel-pool-watcher
//    (let [c (async/chan)]
//      (go-loop []
//        (<! (async/timeout 1111))
//        (swap! playing-state-pool
//               (fn [old]
//                 (reduce (fn [stack [sid state]]
//                           (or
//                             ;; fade-targetsにエントリがある内は除去しない
//                             (when-not (get @fade-targets sid)
//                               ;; ロード完了前なら除去しない
//                               (when (cache/loaded? (:path @state))
//                                 ;; 再生中なら除去しない
//                                 (when-not (device/call! :playing? ac)
//                                   ;; disposeして除去する
//                                   (device/call! :dispose-audio-channel! ac)
//                                   stack)))
//                             (assoc stack sid state)))
//                         {}
//                         old)))
//        (recur))
//      (reset! playing-audiochannel-pool-watcher c))))
  };


  var chanCount = 0;
  function makeNewChannelId () {
    var ch = "sech" + ("00000000" + chanCount).slice(-8);
    ch = va5._assertSeCh(ch);
    chanCount = (chanCount+1) % 100000000;
    return ch;
  }

  function playSeTrue (path, opts) {
    opts = opts || {};
    var oldCh = opts["channel"];
    if (oldCh != null) {
      oldCh = va5._assertSeCh(oldCh);
      stopImmediatelyByCh(oldCh);
    }

    var volume = opts["volume"]; if (volume == null) { volume = 1; }
    volume = va5._assertNumber("volume", 0, volume, 10);
    var pitch = va5._assertNumber("pitch", 0.1, opts["pitch"]||1, 10);
    var pan = va5._assertNumber("pan", -1, opts["pan"]||0, 1);
    var isAlarm = !!opts["isAlarm"];

    var volumeTrue = volume * commonVolumeSe;
    var ch = oldCh || makeNewChannelId();

    var state = {
      path: path,
      volume: volume,
      pitch: pitch,
      pan: pan,
      isAlarm: isAlarm,

      volumeTrue: volumeTrue,

      as: null,
      playingState: null,
      loading: true,
      fading: false,
      cancelled: false
    };

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
      var opts = {
        volume: volumeTrue,
        pitch: pitch,
        pan: pan,
        isLoop: false,
        loopStart: null,
        loopEnd: null,
        startPos: 0,
        endPos: null
      };
      state.playingState = va5._device.play(as, opts);
    });

    seChToState[ch] = state;
    var chans = pathToSeChs[path] || []; pathToSeChs[path] = chans;
    chans.push(ch);

    return ch;
  }

  Se.playSe = function (path, opts) {
    if (path == null) { return null; }
    path = va5._assertPath(path);
    // TODO: va5.config["se-chattering-sec"] のチェックおよび対応を行う事
    // se-chattering-secに引っかかった場合は既存のchを返してよい、という結論になった
    return playSeTrue(path, opts);
  };


  Se.stopSe = function (ch, fadeSec) {
    if (fadeSec == null) { fadeSec = va5.Config["default-se-fade-sec"]; }
    fadeSec = va5._assertNumber("fadeSec", 0, fadeSec, null);
    if (ch == null) {
      // chが偽値なら、全再生中chに対して再帰実行する
      Object.keys(seChToState).forEach(function (ch2) {
        Se.stopSe(ch2, fadeSec);
      });
      return;
    }
    ch = va5._assertSeCh(ch);

    state = seChToState[ch];
    if (!state) { return; }

    if (!fadeSec) {
      stopImmediatelyByCh(ch);
      return;
    }

    state.fading = true;
    var fadeStartTime = va5.getNowMsec();
    var tick = function () {
      if (!state.playingState) { return; }
      var now = va5.getNowMsec();
      var elapsedMsec = now - fadeStartTime;
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

})(this);
