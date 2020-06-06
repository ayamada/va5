(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Bgm = va5.Bgm || {}; va5.Bgm = Bgm;


  // NB: これはbgmのみならずvoiceの対応も行っている！要注意！
  //     (voiceは基本的に「常にoneshotで別名前空間のBGM」という扱い)

  // フェード時の音量変更は、現在のところ
  // Bgm.bootstrapPlayingAudioChannelPoolWatcher にて手動で行っている。
  // フェードを自前でやらずにAudioParamを使うとより正確になるのだが、
  // 動作にどうも不安があるので自前でやった方がよいという結論になった。
  // ( https://www.g200kg.com/jp/docs/webaudio/audioparam.html )





  var fadeGranularityMsec = 100;


  // 現在バックグラウンドかどうか。バックグラウンド時にplayしようとした際には
  // sleep状態で待機する必要があるが、その判定の為に参照する
  var isBackgroundNow = false;


  // bgmでch省略をした時に使われるch名
  // (voiceではch指定が必須)
  var defaultBgmCh = "_bgm";


  // pchとchについて。pchはprefixつきch、chはprefixなしch。
  // ここではbgmもvoiceも扱うので、内部では勝手にprefixをつけて管理する。
  // (bgm系のchannel idは外部から好きな文字列をつけられる)
  // つくprefixは voice_ と bgm_ の二つのみ。どちらかが必ず付く


  // pch -> [state, nextState] (bgmの。deviceのplayingStateではない事に要注意)
  var pchToStatus = {};




  // 全BGM共通の音量倍率
  var baseVolume = 1;
  // 全voice共通の音量倍率
  var baseVolumeVoice = 1;

  Bgm.setBaseVolume = function (newVolume, isInit) {
    var oldBaseVolume = baseVolume;
    baseVolume = newVolume;
    if (isInit) { return; }
    Object.keys(pchToStatus).forEach(function (pch) {
      var stats = pchToStatus[pch];
      if (!stats) { return; }
      if (pch.indexOf("bgm_") !== 0) { return; }
      var state = stats[0];
      var nextState = stats[1];
      // TODO: 上記二つにボリュームを再設定する事。
      // SEとは違い、フェードをきちんと管理する必要あり！難しい…
    });
  };

  Bgm.setBaseVolumeVoice = function (newVolume, isInit) {
    var oldBaseVolume = baseVolume;
    baseVolumeVoice = newVolume;
    if (isInit) { return; }
    Object.keys(pchToStatus).forEach(function (pch) {
      var stats = pchToStatus[pch];
      if (!stats) { return; }
      if (pch.indexOf("voice_") !== 0) { return; }
      var state = stats[0];
      var nextState = stats[1];
      // TODO: 上記二つにボリュームを再設定する事。
      // SEとは違い、フェードをきちんと管理する必要あり！難しい…
    });
  };


  // これは再生即停止も兼ねている
  function disposeState (state) {
    if (!state) { return; }
    if (state.disposed) { return; }
    state.disposed = true;
    state.cancelled = true;
    state.sleepPos = null;
    if (!state.playingState) { return; }
    va5._device.disposePlayingState(state.playingState);
    state.playingState = null;
  }




  // TODO: 以下はまだ未整理(不完全、重複あり)


  // pathに対応する再生を即座に停止する。予約も解除する
  // TODO: race condition注意だが、「対象が現在再生中のBGM」かつ
  //       「フェードアウト中」かつ「次のBGMが予約済」
  //       の、全てを満たすのであれば、
  //       BGMの停止後に「次のBGM」を再生する必要がある。
  //       (unloadAllからの呼び出しでは、この処理をしてはいけない、
  //       全てをunloadするのだから…)
  // NB: これは今のところbgmとvoice両方に作用する
  Bgm.stopImmediatelyByPath = function (path) {
    if (path == null) { return; }
    path = va5._validatePath(path);
    if (path == null) { return; }
    // TODO
    //disposeState(state);
  };


  // NB: これはbgmとvoice両方に作用する
  Bgm.stopImmediatelyAll = function () {
    // TODO
  };

  function makeInitialState (isVoice, path, opts) {
    opts = opts || {};

    var volume = opts["volume"]; if (volume == null) { volume = 1; }
    volume = va5._validateNumber("volume", 0, volume, 10, 0);
    var pitch = va5._validateNumber("pitch", 0.1, opts["pitch"]||1, 10, 1);
    var pan = va5._validateNumber("pan", -1, opts["pan"]||0, 1, 0);

    var isOneshot = !!opts["isOneshot"];
    var loopStart = va5._validateNumber("loopStart", 0, opts["loopStart"]||0, null, 0);
    var loopEnd = opts["loopEnd"] || null;
    if (loopEnd != null) { loopEnd = va5._validateNumber("loopEnd", 0, loopEnd, null, null); }

    var startPos = va5._validateNumber("startPos", 0, opts["startPos"]||loopStart, null, loopStart);

    // fadeを適用する前の再生音量
    var volumeTrue = volume * (isVoice ? baseVolumeVoice : baseVolume);

    var fadein = va5._validateNumber("fadein", 0, opts["fadein"]||0, null, 0);
    var transitionMode = va5._validateEnum("transitionMode", opts["transitionMode"]||"connectIfSame", ["connectNever", "connectIfSame", "connectPossibly"], "connectIfSame");
    var fadeVolume = 1; // TODO: fadeinが0でない場合は適切に処理する事
    var fadeDelta = 0; // TODO: fadeinが0でない場合は適切に処理する事
    var fadeEnd = 1; // TODO: fadeinが0でない場合は適切に処理する事

    var sleepPos = null;
    if (va5.config["is-pause-on-background"] && isBackgroundNow) {
      sleepPos = 0;
    }

    var state = {
      path: path,

      volume: volume,
      pitch: pitch,
      pan: pan,

      isOneshot: isOneshot,
      loopStart: loopStart,
      loopEnd: loopEnd,

      startPos: startPos,

      volumeTrue: volumeTrue,

      fadein: fadein,
      transitionMode: transitionMode,

      fadeVolume: fadeVolume,
      fadeDelta: fadeDelta,
      fadeEnd: fadeEnd,

      as: null,
      playingState: null, // バックグラウンドsleep時にもnullになる事に注意
      loading: true,
      sleepPos: sleepPos,
      cancelled: false
    };

    return state;
  }

  // TODO: 現状では「無音からの再生」前提のコードになっている。「既に鳴っているチャンネルに対してフェード対応する」部分の処理が抜けている。そこをどうするか考える必要がある…
  // bgmとvoiceで共通
  function playTrue (isVoice, path, opts) {
    opts = opts || {};
    var ch = opts["channel"];
    if (isVoice) {
      // voiceの場合はch指定は必須
      if (ch == null) { return; }
      ch = va5._validateVoiceCh(ch);
    }
    else {
      if (ch == null) { ch = defaultBgmCh; }
      ch = va5._validateBgmCh(ch);
    }
    if (ch == null) { return; }
    var pchPrefix = isVoice ? "voice_" : "bgm_";
    var pch = pchPrefix + ch;

    var state = makeInitialState(isVoice, path, opts);

    va5.Cache.load(path, function (as) {
      state.loading = false;
      if (!as) {
        // TODO: pchToStatusからこのstateを除去し、後続処理を行う
        return;
      }
      if (state.cancelled) {
        // TODO: pchToStatusからこのstateを除去し、後続処理を行う
        return;
      }
      state.as = as;
      // NB: ローディング中にmergeによってパラメータが
      //     変化している場合がある。なので元の値を参照せずに、
      //     stateから参照し直す必要がある
      var deviceOpts = {
        volume: state.volumeTrue * state.fadeVolume,
        pitch: state.pitch,
        pan: state.pan,
        isLoop: !state.isOneshot,
        loopStart: state.loopStart,
        loopEnd: state.loopEnd,
        startPos: state.startPos,
        endPos: null,
        isSleepingStart: (state.sleepPos != null)
      };
      va5._logDebug("loaded. play bgm or voice " + path + " : " + ch);
      state.playingState = va5._device.play(as, deviceOpts);
    });


    // TODO: pchToStatusテーブルに登録するのだが、既存の状態に応じて登録先が変動する。ちょっと考える必要がある…
    var oldStatus = pchToStatus[pch];
    var oldState = oldStatus && oldStatus[0];
    var newStatus = null;
    if (oldState) {
      // TODO: 適切にoldStateをmergeする必要がある
      newStatus = [oldState, state];
      // TODO: oldStateをフェードアウトする必要がある
    }
    else {
      newStatus = [state, null];
    }
    pchToStatus[pch] = newStatus;

    va5._logDebug("reserved to play bgm or voice " + path + " : " + ch);

    return ch;
  }


  function gotoNextBgm (ch, pch) {
    var stats = pchToStatus[pch];
    if (!stats) { return; }
    var state = stats[0];
    var nextState = stats[1];
    disposeState(state);
    if (!nextState) {
      pchToStatus[pch] = null;
      return;
    }
    stats[0] = nextState;
    stats[1] = null;
    // TODO: nextStateの再生を実行。ロードされてないなら待つ等の処理も必要…。実質的にplayTrueに近い処理が必要なのだが…
  }

  function stopCommon (ch, pch, fadeSec) {
    if (!fadeSec) { return gotoNextBgm(ch, pch); }
    var stats = pchToStatus[pch];
    if (!stats) { return; }
    var state = stats[0];
    var nextState = stats[1];
    if (!state) { return; }
    // TODO: フェード処理
  }
//    va5._logDebug("start to fade se " + ch);
//    state.fading = true;
//    var fadeStartMsec = va5.getNowMsec();
//    var tick = function () {
//      if (!state.playingState) { return; } // 他の要因で既にshutdownされた場合
//      var now = va5.getNowMsec();
//      var elapsedMsec = now - fadeStartMsec;
//      var progress = elapsedMsec / (fadeSec * 1000);
//      progress = Math.max(0, Math.min(progress, 1));
//      var newVolume = state.volumeTrue * (1 - progress);
//      va5._device.setVolume(state.playingState, newVolume);
//      if (newVolume) {
//        window.setTimeout(tick, fadeGranularityMsec);
//      }
//      else {
//        stopImmediatelyByCh(ch);
//      }
//    };
//    window.setTimeout(tick, fadeGranularityMsec);
//  };

  Bgm.stopBgm = function (ch, fadeSec) {
    if (fadeSec == null) { fadeSec = va5.Config["default-bgm-fade-sec"]; }
    if (ch == null) {
      Object.keys(pchToStatus).forEach(function (pch) {
        if (pch.indexOf("bgm_") !== 0) { return; }
        var ch2 = pch.replace(/^bgm_/, "");
        Bgm.stopBgm(ch2, fadeSec);
      });
      return;
    }
    ch = va5._assertBgmCh(ch); // これに通らないなら何かがおかしくなっている
    var pch = "bgm_" + ch;
    stopCommon(ch, pch, fadeSec);
  };
  Bgm.stopVoice = function (ch, fadeSec) {
    if (fadeSec == null) { fadeSec = va5.Config["default-voice-fade-sec"]; }
    if (ch == null) {
      Object.keys(pchToStatus).forEach(function (pch) {
        if (pch.indexOf("voice_") !== 0) { return; }
        var ch2 = pch.replace(/^voice_/, "");
        Bgm.stopVoice(ch2, fadeSec);
      });
      return;
    }
    ch = va5._assertVoiceCh(ch); // これに通らないなら何かがおかしくなっている
    var pch = "voice_" + ch;
    stopCommon(ch, pch, fadeSec);
  };



  // 多重起動しないようにしてもよい(面倒なので後回し)
  Bgm.bootstrapPlayingAudioChannelPoolWatcher = function () {
    var pch;
    for (pch in pchToStatus) {
      var stats = pchToStatus[pch];
      if (!stats) { continue; }
      var state = stats[0];
      var nextState = stats[1];
      var isNeedPlayNextBgm = false;
      if (!state) {
        // 通常はありえない筈だが…
        va5._logError("internal error: empty state found in bgm");
        isNeedPlayNextBgm = true;
      }
      // ローディング中なら常に残す(キャンセルなら次の曲へ)
      if (state && state.loading && !state.cancelled) { continue; }
      // キャンセルなら次の曲へ
      if (state && state.cancelled) {
        isNeedPlayNextBgm = true;
      }
      // TODO: ここからどうする？
      //if (state && state.sleepPos != null) {
      //  // 特例で常に残す
      //  continue;
      //}
      //playingState: null, // バックグラウンドsleep時にもnullになる事に注意
      //sleepPos: null, // バックグラウンドsleep時のみ値が保持される
      //fadein: fadein,
      //transitionMode: transitionMode,
      //fadeVolume: fadeVolume,
      //fadeDelta: fadeDelta,
      //fadeEnd: fadeEnd,
      if (state && state.playingState) {
        // フェード処理
        // TODO
        // フェード処理は完了しているか？
        // TODO
      }
      if (state && state.playingState) {
        // state.playingStateは再生終了しているか？
        if (state.playingState.playEndSec) { disposeState(state); }
        state = null;
        stats[0] = null;
      }
      // stateが再生終了していたら、GCし、nextStateの再生を開始する
      // (ただしnextStateがcancelされていたらそのままnextStateもGCする事)
      // TODO
      //if (!state.playingState) { return; }
      //if (state.playingState.playEndSec) { stopImmediatelyByCh(ch); }
      if (isNeedPlayNextBgm) {
        // TODO
      }
    }
    // NB: stopImmediatelyByChによって、pchToStatusが全チェックされない
    //     ケースがありえる。しかしその場合でも次の周回でチェックされるので
    //     問題ないという事にしている
    window.setTimeout(Bgm.bootstrapPlayingAudioChannelPoolWatcher, fadeGranularityMsec);
  };



  // TODO: sleep中にstateの更新やdisposeがあっても正常に動くようにしなくてはならない。この為、va4でやっていたように「退避する」だけでは上手くいかない。これを考えた結果「deviceの方で個別に一時停止するしかない」「state.sleepPosに記録する」という仕様にする事になった
  var sleepData = null;
  function sleepBackground () {
    // "is-pause-on-background" が偽ならsleepしない
    if (!va5.config["is-pause-on-background"]) { return; }
    // sleepDataがあるなら既にsleep状態、何もしない
    if (sleepData) { return; }
    sleepData = [];
    Object.keys(pchToStatus).forEach(function (pch) {
      var stats = pchToStatus[pch];
      if (!stats) { return; }
      var state = stats[0];
      var nextState = stats[1];
      // TODO
      // sleepData.push({...});
    });
  }
  function resumeBackground () {
    // "is-pause-on-background" によらず、sleepしているならresumeする
    // sleepDataがないなら既にresume状態、何もしない
    if (!sleepData) { return; }
    sleepData.slice().forEach(function (data) {
      // TODO
    });
  }

//;;; バックグラウンドに入ったので、stateの再生を停止する
//(defn- background-on! [bgm-ch state]
//  ;; acが存在する場合は基本的には論理再生中。
//  ;; ただし、:oneshot?再生終了時はその限りではなく、個別に対応する必要がある
//  (when-let [ac (:ac (:current-param @state))]
//    ;; NB: :oneshot?のみ、acが存在して再生終了状態になっているケースがある
//    (let [playing? (device/call! :playing? ac)]
//      (if-not playing?
//        (swap! resume-pos-table dissoc bgm-ch)
//        (let [pos (device/call! :pos ac)]
//          (swap! resume-pos-table assoc bgm-ch pos)
//          (device/call! :stop! ac))))))
//;;; バックグラウンドが解除されたので、復帰させるべき曲があれば、再生を再開する
//(defn- background-off! [bgm-ch state pos]
//  (when pos
//    (let [param (:current-param @state)]
//      (when-let [ac (:ac param)]
//        (let [volume (:volume param)
//              pitch (:pitch param)
//              pan (:pan param)
//              oneshot? (:oneshot? param)
//              fadein (:fadein param)
//              [i-volume i-pitch i-pan] (util/calc-internal-params
//                                         :bgm volume pitch pan)
//              i-volume (* i-volume (:fade-factor @state))]
//          (device/call! :play! ac pos (not oneshot?) i-volume i-pitch i-pan false)))
//      (swap! resume-pos-table dissoc bgm-ch))))

  // TODO: 以上はまだ未整理(不完全、重複あり)




  Bgm.syncBackground = function (isInactiveNow) {
    isBackgroundNow = isInactiveNow;
    isInactiveNow ? sleepBackground() : resumeBackground();
  };


})(this);
