(function(exports) {
  "use strict";
  var va5 = (function (k) {
    va5 = exports[k] || {}; exports[k] = va5; return va5;
  })(("[object Object]" !== exports.toString()) ? "va5" : "exports");
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
  var defaultBgmCh = "__BGM";

  // voiceでch省略をした時に使われるch名
  var defaultVoiceCh = "__VOICE";


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



  function updateVolume (state, isVoice) {
    if (!state) { return; }
    state.volumeTrue = state.volume * (isVoice ? baseVolumeVoice : baseVolume);
    var fv = state.volumeTrue * state.fadeVolume;
    if (state.playingState) {
      va5._device.setVolume(state.playingState, fv);
    }
  }

  Bgm.setBaseVolume = function (newVolume, isInit) {
    var oldBaseVolume = baseVolume;
    baseVolume = newVolume;
    if (isInit) { return; }
    // init前はpchToStatusは空なので、init前に以下を実行しても安全
    Object.keys(pchToStatus).forEach(function (pch) {
      var stats = pchToStatus[pch];
      if (!stats) { return; }
      if (pch.indexOf("bgm_") !== 0) { return; }
      var state = stats[0];
      var nextState = stats[1];
      updateVolume(state, false);
      updateVolume(nextState, false);
    });
  };

  Bgm.setBaseVolumeVoice = function (newVolume, isInit) {
    var oldBaseVolume = baseVolume;
    baseVolumeVoice = newVolume;
    if (isInit) { return; }
    // init前はpchToStatusは空なので、init前に以下を実行しても安全
    Object.keys(pchToStatus).forEach(function (pch) {
      var stats = pchToStatus[pch];
      if (!stats) { return; }
      if (pch.indexOf("voice_") !== 0) { return; }
      var state = stats[0];
      var nextState = stats[1];
      updateVolume(state, true);
      updateVolume(nextState, true);
    });
  };

  Bgm.hasReference = function (path) {
    var pch;
    for (pch in pchToStatus) {
      var stats = pchToStatus[pch];
      if (!stats) { continue; }
      var s = stats[0];
      if (s && (path == s.path)) {
        return true;
      }
      s = stats[1];
      if (s && (path == s.path)) {
        return true;
      }
    }
    return false;
  };

  function unloadIfUnused (path) {
    if (!va5.getConfig("is-unload-automatically-when-finished-bgm")) { return; }
    // 参照可能な全stateをなめて、このpathが1個もなければunloadする
    // (再生中や予約が1個でもあるならunloadはしない)
    va5.Cache.unloadIfUnused(path);
  }

  // これは再生即停止も兼ねている
  function disposeState (state) {
    if (!state) { return; }
    if (state.disposed) { unloadIfUnused(state.path); return; }
    state.disposed = true;
    state.isCancelled = true;
    state.isSleep = null;
    if (!state.playingState) { unloadIfUnused(state.path); return; }
    va5._device.disposePlayingState(state.playingState);
    state.playingState = null;
    unloadIfUnused(state.path);
  }


  // NB: これは「無音から新たに再生する」向けのstateになっている。
  //     そうでない場合は生成後に更に調整が必要となる。
  //     また isLoading がtrueで開始される事にも注意。
  //     (通常はこの後すぐに va5.Cache.load() が実行されるので
  //     これで問題ないのだが、そうではない場合は注意する事。
  //     なおnextStateに入る場合もisLoading=trueで問題ない想定。
  //     ただしプリロードを事前に走らせておく事が望ましい。)
  function makeInitialState (isVoice, path, opts) {
    opts = opts || {};

    var c = va5.Util.parsePlayCommonOpts(path, opts);

    // voiceは常に非ループなので、もしnullなら0(音源終端)にする。
    // これが問題になるならvoiceではなくbgm扱いで再生すべき。
    if (isVoice && !va5.Util.hasPlayEnd(c)) { c.playEndSec = 0; }

    var transitionMode = va5._validateEnum("transitionMode", opts["transitionMode"]||"connectIfSame", ["connectNever", "connectIfSame", "connectIfPossible"], "connectIfSame");
    var fadeinSec = va5._validateNumber("fadeinSec", 0, opts["fadeinSec"]||0, null, 0);
    var fadeVolume = fadeinSec ? 0 : 1;
    var fadeEndVolume = 1; // フェードインの有無によらず、ここは1でよい
    var fadeDeltaPerSec = 0;
    if (fadeinSec) { fadeDeltaPerSec = (fadeEndVolume - fadeVolume) / fadeinSec; }

    var isSleep = false;
    if (va5.getConfig("is-pause-on-background") && isBackgroundNow) {
      isSleep = true;
    }

    var state = c; // volume, pitch, pan, loop系, play系
    state.path = path;
    state.volumeTrue = c.volume * (isVoice ? baseVolumeVoice : baseVolume);

    state.transitionMode = transitionMode;
    state.fadeinSec = fadeinSec;
    state.fadeVolume = fadeVolume;
    state.fadeEndVolume = fadeEndVolume;
    state.fadeDeltaPerSec = fadeDeltaPerSec;

    state.as = null;
    state.playingState = null;
    state.isLoading = true;
    state.isSleep = isSleep;
    state.isCancelled = false;

    return state;
  }


  // NB: これはbgmとvoice両方に作用する
  Bgm.stopImmediatelyAll = function () {
    Object.keys(pchToStatus).forEach(function (pch) {
      var stats = pchToStatus[pch];
      if (!stats) { return; }
      var state = stats[0];
      var nextState = stats[1];
      disposeState(state);
      disposeState(nextState);
      delete pchToStatus[pch];
    });
  };


  // これは「新規にBGMを再生する」時だけではなく、
  // 「再生中の曲が即座もしくはフェードアウト終了が完了した時かつ
  // 次の曲が予約されている」時にも実行される。
  // NB: ここでのstateは基本的に pchToStatus[pch][0] に入っている前提。
  //     ただし例外としてcancelされた場合等がありえる。
  //     (だからpchToStatus[pch][0]とstateが同一かどうかのチェックが必要)
  // TODO: 関数名がちょっと分かりづらい。もっと良い名前はあるか？
  function playByState (pch, state) {
    va5.Cache.load(state.path, function (as) {
      state.isLoading = false;
      var stats = pchToStatus[pch];
      if (!as || state.isCancelled) {
        disposeState(state);
        if (!stats || (state !== stats[0])) { return; }
        stats[0] = stats[1];
        stats[1] = null;
        if (stats[0]) {
          playByState(pch, stats[0]);
        }
        else {
          delete pchToStatus[pch];
        }
        return;
      }
      state.as = as;
      // このタイミングで残りパラメータのvalidateを行い、True系パラメータを算出
      va5.Util.parsePlayCommonOpts2(state);
      // NB: ローディング中にパラメータが変化している場合がある。
      //     なので元の値を参照せずに、stateから参照し直す必要がある
      var deviceOpts = {
        volume: state.volumeTrue * state.fadeVolume,
        pitch: state.pitch,
        pan: state.pan,
        loopStartSec: state.loopStartSecTrue,
        loopEndSec: state.loopEndSecTrue,
        playStartSec: state.playStartSecTrue,
        playEndSec: state.playEndSecTrue,
        isSleepingStart: state.isSleep
      };
      va5._logDebug("loaded. play bgm or voice " + state.path + " : " + pch);
      state.playingState = va5._device.play(as, deviceOpts);
    });
  }

  function playCommon (isVoice, path, opts) {
    opts = opts || {};
    va5.Util.checkUnknownOptsBgm(opts);
    var ch = opts["channel"];

    if (isVoice) {
      if (ch == null) { ch = defaultVoiceCh; }
      ch = va5._validateVoiceCh(ch);
    }
    else {
      if (ch == null) { ch = defaultBgmCh; }
      ch = va5._validateBgmCh(ch);
    }
    if (ch == null) { return; }
    var pchPrefix = isVoice ? "voice_" : "bgm_";
    var pch = pchPrefix + ch;

    var newState = makeInitialState(isVoice, path, opts);

    var stats = pchToStatus[pch] || [null, null]; pchToStatus[pch] = stats;
    var oldState = stats[0];

    // oldStateが存在していない場合は即座に再生開始できる
    if (!oldState) {
      if (stats[1]) { stats[1].isCancelled = true; }
      stats[1] = null;
      stats[0] = newState;
      playByState(pch, newState);
      return;
    }

    // oldStateが存在している場合であっても、再生終了直前であるなら、
    // 即座に再生停止を行って再生開始してよい
    var canStopOldStateImmediately;
    var oldPos = va5._device.calcPos(oldState.playingState);
    var endPos = oldState.playEndSecTrue;
    // posを取るのに失敗した。再生開始前もしくは既に終了している。
    // 即座に再生停止を行うべきである
    if (oldPos == null) {
      canStopOldStateImmediately = true;
    }
    // ループならフェードアウト以外で終了直前判定になる事はない
    // (フェードアウトの場合は安全に処理できる)
    else if (!va5.Util.hasPlayEnd(oldState)) {
      canStopOldStateImmediately = false;
    }
    // 非ループかつendPosとoldPosが非常に近い。
    // 即座に再生停止を行って再生開始した方が安全
    else if ((endPos != null) && (endPos < oldPos + 0.01)) {
      canStopOldStateImmediately = true;
    }

    // 上記での判定が「即座対応」なら、それを行って完了
    if (canStopOldStateImmediately) {
      if (stats[1]) { stats[1].isCancelled = true; }
      stats[1] = null;
      disposeState(oldState);
      stats[0] = newState;
      playByState(pch, newState);
      return;
    }

    var defaultBgmFadeSec = va5.getConfig("default-bgm-fade-sec");

    if (va5.Util.canConnect(newState.transitionMode, newState, oldState)) {
      // connectを行う。具体的には、即座に、volume, pitch, panの3パラメータの
      // 適用をoldStateに行う。そしてnewStateは処分する。
      // まぎらわしいが、volumeは即座に適用される(フェード適用はされない)。
      // フェード適用がされるのは、途中までフェードアウトしていた時のみで、
      // この時だけフェードイン化がなされる。
      oldState.volume = newState.volume;
      oldState.volumeTrue = newState.volumeTrue;
      oldState.pitch = newState.pitch;
      oldState.pan = newState.pan;
      va5._device.setVolume(oldState.playingState, oldState.volumeTrue * oldState.fadeVolume);
      va5._device.setPitch(oldState.playingState, oldState.pitch);
      va5._device.setPan(oldState.playingState, oldState.pan);
      // フェードアウト中だった時のみ、フェードイン化を行う
      if (oldState.fadeDeltaPerSec) {
        oldState.fadeEndVolume = 1;
        oldState.fadeDeltaPerSec = 1 / (defaultBgmFadeSec || 0.01);
      }
      stats[0] = oldState;
      // 次の曲の予約は破棄する
      if (stats[1]) { stats[1].isCancelled = true; }
      stats[1] = null;
      // newsStateも破棄する(oldStateにmergeされたので)
      newState.isCancelled = true;
      disposeState(newState);
      return;
    }

    // oldStateはそのまま維持するが、
    stats[0] = oldState;
    // oldStateはフェードアウト終了させる
    oldState.fadeEndVolume = 0;
    oldState.fadeDeltaPerSec = (-1 / (defaultBgmFadeSec || 0.01));
    // 古いnextStateがあるならキャンセルしておく必要がある
    if (stats[1]) { stats[1].isCancelled = true; }
    // newStateはnextStateへと突っ込む
    stats[1] = newState;
    // 未ロードの場合、先行ロードだけ走らせておく
    if (va5.Cache.isCancelled(newState.path)) {
      va5.Cache.load(newState.path, function (as) {});
    }
  }

  Bgm.playBgm = function (path, opts) {
    return playCommon(false, path, opts);
  };
  Bgm.playVoice = function (path, opts) {
    return playCommon(true, path, opts);
  };


  // 現在のstateをdisposeし、nextがあるならそれを再生する
  function stopStateAndPlayNextState (pch) {
    var stats = pchToStatus[pch];
    if (!stats) { return; }
    var state = stats[0];
    var nextState = stats[1];
    disposeState(state);
    state = nextState;
    nextState = null;
    stats[0] = state;
    stats[1] = nextState;
    if (state == null) {
      delete pchToStatus[pch];
      return;
    }
    playByState(pch, state);
  }


  // pathに対応する再生を即座に停止する。予約も解除する
  // NB: これは今のところbgmとvoice両方に作用する
  Bgm.stopImmediatelyByPath = function (path) {
    if (path == null) { return; }
    path = va5._validatePath(path);
    if (path == null) { return; }
    Object.keys(pchToStatus).forEach(function (pch) {
      var stats = pchToStatus[pch];
      if (!stats) { return; }
      var state = stats[0];
      var nextState = stats[1];
      if (path != state.path) { return; }
      // NB: race condition注意だが、「次のBGMが予約済」なら、
      //     現在のBGMの停止後に「次のBGM」を再生する必要がある。
      //     (なおunloadAllからの呼び出しではこの処理をしてはいけない、
      //     全てをunloadするのだから…)
      stopStateAndPlayNextState(pch);
    });
  };


  function stopCommon (ch, pch, fadeSec) {
    if (!fadeSec) { stopStateAndPlayNextState(pch); }

    // TODO: フェード処理
    var stats = pchToStatus[pch];
    if (!stats) { return; }
    var state = stats[0];
    if (!state) { return; }

    va5._logDebug("start to fade bgm or voice " + ch + " ttl " + fadeSec);

    var now = va5.getNowMsec();

    // 既に何らかのフェード中だった場合、事前にfadeSecを割合減少させておく
    // (通常は1→0だが、既にフェード中という事は0.5→0のような変化だという事)
    fadeSec = fadeSec * state.fadeVolume;
    if (state.fadeVolume != 1) { fadeSec *= 0.5; }
    if (!fadeSec) { stopStateAndPlayNextState(pch); }

    state.fadeEndVolume = 0;
    state.fadeDeltaPerSec = (state.fadeEndVolume - state.fadeVolume) / fadeSec;
  }


  Bgm.stopBgm = function (ch, fadeSec) {
    if (fadeSec == null) { fadeSec = va5.getConfig("default-bgm-fade-sec"); }
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
    if (fadeSec == null) { fadeSec = va5.getConfig("default-voice-fade-sec"); }
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


  var watcherPrevMsec = 0;
  // 多重起動しないようにしてもよい(とても面倒なので後回し)
  // 「終了済chのGC」「フェード処理」の両方をここで行う
  Bgm.bootstrapPlayingAudioChannelPoolWatcher = function () {
    // まず次回実行の予約を最初にしておく
    window.setTimeout(Bgm.bootstrapPlayingAudioChannelPoolWatcher, fadeGranularityMsec);
    // バックグラウンドsleep中は完全に処理を一時停止する
    if (va5.getConfig("is-pause-on-background") && isBackgroundNow) { return; }
    var now = va5.getNowMsec();
    var deltaMsec = now - watcherPrevMsec;
    watcherPrevMsec = now;
    deltaMsec = Math.max(fadeGranularityMsec, deltaMsec);
    // NB: ↓のループをforEachではなくfor inとした事により、
    //     pchToStatusが全チェックされないケースがありえる。
    //     しかしその場合でも次の周回でチェックされるので問題ない
    //     (それよりはGCの発生量を抑える方を優先する事にした)
    var pch;
    for (pch in pchToStatus) {
      var stats = pchToStatus[pch];
      if (!stats) { continue; }
      var state = stats[0];
      var nextState = stats[1];
      if (!state) {
        // 通常はありえない筈だが…
        va5._logError("internal error: empty state found in bgm");
        stopStateAndPlayNextState(pch);
        continue;
      }
      // sleepしているなら何もしない(race conditionで起こり得る)
      if (state.isSleep) {
        continue;
      }
      // キャンセルされているなら次の曲へ
      if (state.isCancelled) {
        stopStateAndPlayNextState(pch);
        continue;
      }
      // ローディング中なら残す
      if (state.isLoading) { continue; }
      // 再生終了しているなら次の曲へ
      if (!state.playingState) {
        stopStateAndPlayNextState(pch);
        continue;
      }
      if (va5._device.isFinished(state.playingState)) {
        stopStateAndPlayNextState(pch);
        continue;
      }
      // フェード処理を適用
      if (state.fadeDeltaPerSec) {
        state.fadeVolume += state.fadeDeltaPerSec * (deltaMsec * 0.001);
        // overrun check
        if (0 < state.fadeDeltaPerSec) {
          if (state.fadeEndVolume < state.fadeVolume) {
            state.fadeVolume = state.fadeEndVolume;
          }
        }
        else {
          if (state.fadeVolume < state.fadeEndVolume) {
            state.fadeVolume = state.fadeEndVolume;
          }
        }
        // 変化したvolumeを適用
        va5._device.setVolume(state.playingState, state.volumeTrue * state.fadeVolume);
        // フェード完了か？(↑でoverrun補正しているので==でチェック可能)
        if (state.fadeEndVolume == state.fadeVolume) {
          // フェード完了。これ以上フェード処理をしないよう0をセットする
          state.fadeDeltaPerSec = 0;
          // またフェードの結果音量が0になった場合のみ曲の停止も行う
          if (!state.fadeVolume) { stopStateAndPlayNextState(pch); }
        }
      }
    }
  };


  function emitSleep (state) {
    if (!state) { return; }
    if (!state.playingState) { return; }
    if (state.isSleep) { return; }
    state.isSleep = true;
    va5._device.sleep(state.playingState);
  }

  function emitAwake (state) {
    if (!state) { return; }
    if (!state.playingState) { return; }
    if (!state.isSleep) { return; }
    state.isSleep = false;
    va5._device.resume(state.playingState);
  }


  function sleepBackground () {
    // "is-pause-on-background" が偽ならsleepしない
    if (!va5.getConfig("is-pause-on-background")) { return; }
    // まだsleepしていないものをsleepさせる
    Object.keys(pchToStatus).forEach(function (pch) {
      var stats = pchToStatus[pch];
      if (!stats) { return; }
      var state = stats[0];
      var nextState = stats[1];
      emitSleep(state);
      emitSleep(nextState);
    });
  }
  function resumeBackground () {
    // "is-pause-on-background" によらず、sleepしているものを全てresumeする
    Object.keys(pchToStatus).forEach(function (pch) {
      var stats = pchToStatus[pch];
      if (!stats) { return; }
      var state = stats[0];
      var nextState = stats[1];
      emitAwake(state);
      emitAwake(nextState);
    });
  }

  // バックグラウンド状態かどうかを返す。これは
  // va5.getConfig("is-pause-on-background") を考慮しない。
  Bgm.isInBackground = function () {
    return isBackgroundNow;
  };

  Bgm.syncBackground = function (isInactiveNow) {
    if (isInactiveNow) {
      va5._logDebug("into background");
    }
    else {
      va5._logDebug("into foreground");
    }
    isBackgroundNow = isInactiveNow;
    isInactiveNow ? sleepBackground() : resumeBackground();
  };


  // NB: これはbgm専用。voiceの対応はなし
  Bgm.getBgmPos = function (ch) {
    if (ch == null) { ch = defaultBgmCh; }
    var pch = "bgm_" + ch;
    var stats = pchToStatus[pch];
    if (!stats) { return null; }
    var state = stats[0];
    if (!state) { return null; }
    if (!state.playingState) { return null; }
    return va5._device.calcPos(state.playingState);
  };


})(this);
