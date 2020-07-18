(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Util = va5.Util || {}; va5.Util = Util;

  // NB: percentは小数を持たない扱いである事に注意
  Util.floatToPercent = function (f) { return Math.round(f * 100); };
  Util.percentToFloat = function (p) { return p * 0.01; };


  function getNowByAudioContext () {
    // AudioContext回りの秒数の単位はsecなので、msecに変換する
    return va5._device.getCurrentSec() * 1000;
  }
  function getNowByPerformanceNow () {
    return window.performance.now();
  }
  var startTimestamp = null;
  var prevTimestamp = null;
  function getNowByDateNow () {
    var now = Date.now();
    if (!startTimestamp) { startTimestamp = now; }
    if (!prevTimestamp) { prevTimestamp = now; }
    // もし巻き戻りが発生していたら、その分を取り消す
    if (now < prevTimestamp) {
      var rollback = prevTimestamp - now;
      startTimestamp = startTimestamp - rollback;
    }
    prevTimestamp = now;
    return now - startTimestamp;
  }

  // タイムスタンプ取得アルゴリズムは一旦決めたら変動しない必要がある
  var getNowFn = null;
  // msecのタイムスタンプを返す。実際の日時ではないので注意
  Util.getNowMsec = function () {
    if (getNowFn) { return getNowFn(); }
    if (va5._device && va5._device.getCurrentSec && (va5._device.getCurrentSec() != null)) {
      getNowFn = getNowByAudioContext;
      va5._logDebug("getNowMsec function determined to getNowByAudioContext");
    }
    else if (window.performance && window.performance.now) {
      getNowFn = getNowByPerformanceNow;
      va5._logDebug("getNowMsec function determined to getNowByPerformanceNow");
    }
    else {
      getNowFn = getNowByDateNow;
      va5._logDebug("getNowMsec function determined to getNowByDateNow");
    }
    return getNowFn();
  };


  // NB: これは本来Devices_WebAudio内に含めるべき内容だが、
  //     Devices_Dumbと共通にしたいので、ここに置いている
  Util.createDeviceState = function (as, opts, duration) {
    var volume = opts.volume; if (volume == null) { volume = 1; }
    volume = va5._validateNumber("volume", 0, volume, 10, 0);
    var pitch = va5._validateNumber("pitch", 0.1, opts.pitch||1, 10, 1);
    var pan = va5._validateNumber("pan", -1, opts.pan||0, 1, 0)
    // NB: loopStartSec=nullの時はloopStartSec=0とする
    var loopStartSec = va5._validateNumber("loopStartSec", 0, opts.loopStartSec||0, null, 0);
    // NB: loopEndSec=nullの時はloopEndSec=durationとする
    var loopEndSec = va5._validateNumber("loopEndSec", null, opts.loopEndSec||duration, null, duration);
    // NB: playStartSec=nullの時はplayStartSec=loopStartSecとする
    var playStartSec = opts.playStartSec;
    if (playStartSec == null) { playStartSec = loopStartSec; }
    playStartSec = va5._validateNumber("playStartSec", 0, playStartSec, null, 0);
    // NB: playEndSec=nullの時はplayEndSec=nullを維持する
    var playEndSec = opts.playEndSec;
    if (playEndSec != null) { playEndSec = va5._validateNumber("playEndSec", playStartSec, playEndSec, null, duration); }
    var isSleepingStart = !!opts.isSleepingStart;

    var isNeedFinishImmediately = (playEndSec != null) && (playEndSec < playStartSec);
    // すぐ終わらせるので、強制的にisSleepingStartと同様の処理を行わせる
    if (isNeedFinishImmediately) { isSleepingStart = true; }

    if ((playEndSec == null) && (loopEndSec <= loopStartSec)) {
      va5._logError(["found confused loop parameters", {"loopStartSec": loopStartSec, "loopEndSec": loopEndSec}]);
      loopStartSec = 0;
      loopEndSec = duration;
    }

    var now = va5.getNowMsec() / 1000;

    var state = {
      as: as,
      volume: volume,
      pitch: pitch,
      pan: pan,
      loopStartSec: loopStartSec,
      loopEndSec: loopEndSec,
      playStartSec: playStartSec,
      playEndSec: playEndSec,

      // ここは直後のappendNodesで設定される
      sourceNode: null,
      gainNode: null,
      pannerNodeType: null,
      pannerNode: null,

      // この二つは「現在の再生位置」を算出する為の内部用の値。
      // sleep/resumeおよびsetPitchによって変化する。
      // 上記以外の用途には使わない事！
      replayStartTimestamp: now,
      replayStartPos: playStartSec,
      playPausedPos: isSleepingStart ? playStartSec : null,

      // これはse-chattering-secの判定で必要な「いつ開始したか」の情報
      playStartedTimestamp: now,
      // これは「再生終了済」のフラグ用途。値はほぼ利用されない
      playEndedTimestamp: null,

      // その他の内部用フラグ
      isSleepingStart: isSleepingStart,
      isNeedFinishImmediately: isNeedFinishImmediately
    };
    return state;
  };


  // playEndSecTrue類が0やマイナスの時は、
  // duration側から動かした値にする必要がある
  function adjustEndSecTrue (t, state) {
    if ((t != null) && (t <= 0)) {
      var duration = va5._device.audioSourceToDuration(state.as);
      if (0 < duration) {
        t = (t % duration) + duration;
      }
      else {
        //va5._logError("invalid duration found " + state.path);
        // deviceがdumbの時にこっちに来る。適当なダミー値をセットする
        t = 1;
      }
    }
    return t;
  }


  function setP (r, rk, params, pk) {
    var v = params[pk];
    if (v != null) { r[rk] = v; }
  }

  function parseAndApplyPathParameter (path) {
    var r = {};
    if (path == null) { return r; }
    r.path = path;
    // - キーのセット一覧
    //     - LOOPSTART or LOOPSTARTSEC
    //     - LOOPEND or LOOPENDSEC or LOOPLENGTH or LOOPLENGTHSEC
    //     - PLAYSTART or PLAYSTARTSEC
    //     - PLAYEND or PLAYENDSEC or PLAYLENGTH or PLAYLENGTHSEC
    //     - 上記の省略形 LS LE LL PS PE PL LSS LES LLS PSS PES PLS
    //     - 特殊ショートカット NL ME
    // - 実例
    //     - foo__LOOPSTART0_LOOPEND99600_PLAYSTART44800.m4a
    //     - foo__LOOPSTARTSEC0.5_LOOPENDSEC2.0_PLAYSTARTSEC1.0.m4a
    //     - foo__LOOPSTARTSEC=0.5_LOOPENDSEC=2.0_PLAYSTARTSEC=1.0.m4a # も可
    //     - foo__PLAYEND-1.5.m4a
    //     - foo__PLAYEND=-1.5.m4a # マイナス値ありなら=入りが分かりやすい？
    //     - foo.m4a#__PLAYEND-1.5 # キャッシュが増えるのでよくない
    //     - foo.m4a?__PLAYEND-1.5 # キャッシュがとても増えるのでとてもよくない
    //     - foo__PLAYEND5.3gp -> foo__PLAYEND5_.3gp # 5.3と認識されるのを防ぐ

    // ディレクトリセパレータである「/」以前を除去する
    // (親ディレクトリ部分に「__」があると引っかかってしまうのを避ける)
    var found = path.match(/([^\/]*)$/);
    if (found) { path = found[1]; }
    found = path.match(/__(.*)/);
    if (!found) { return r; }
    var params = {};
    found[1].split("_").forEach(function (s) {
      var m = s.match(/([A-Z]+)=?(.*)/);
      if (m) {
        var n = parseFloat(m[2]);
        if (isFinite(n)) { params[m[1]] = n; }
      }
    });
    va5._logDebug(["parse params from path", path, params]);

    // 特殊ショートカット
    if ("NL" in params) { r["playEndSec"] = 0; } // NO LOOP
    if ("ME" in params) { r["playEndSec"] = 0; } // MUSIC EFFECT(ツクール呼称)

    // ショートカット
    setP(r, "loopStartSec", params, "LSS");
    setP(r, "loopEndSec", params, "LES");
    setP(r, "loopLengthSec", params, "LLS");
    setP(r, "loopStart", params, "LS");
    setP(r, "loopEnd", params, "LE");
    setP(r, "loopLength", params, "LL");
    setP(r, "playStartSec", params, "PSS");
    setP(r, "playEndSec", params, "PES");
    setP(r, "playLengthSec", params, "PLS");
    setP(r, "playStart", params, "PS");
    setP(r, "playEnd", params, "PE");
    setP(r, "playLength", params, "PL");

    // 通常
    setP(r, "loopStartSec", params, "LOOPSTARTSEC");
    setP(r, "loopEndSec", params, "LOOPENDSEC");
    setP(r, "loopLengthSec", params, "LOOPLENGTHSEC");
    setP(r, "loopStart", params, "LOOPSTART");
    setP(r, "loopEnd", params, "LOOPEND");
    setP(r, "loopLength", params, "LOOPLENGTH");
    setP(r, "playStartSec", params, "PLAYSTARTSEC");
    setP(r, "playEndSec", params, "PLAYENDSEC");
    setP(r, "playLengthSec", params, "PLAYLENGTHSEC");
    setP(r, "playStart", params, "PLAYSTART");
    setP(r, "playEnd", params, "PLAYEND");
    setP(r, "playLength", params, "PLAYLENGTH");

    return r;
  }

  // NB: これは本来Bgm/Se内に含めるべき内容だが、
  //     共通にしたいので、ここに置いている
  // NB: playStartSec系はここではparseせず、そのまま保持する方針に
  //     変更となった。これらのparseはload後に行う。
  Util.parsePlayCommonOpts = function (path, opts) {
    var r = parseAndApplyPathParameter(path);

    r.volume = opts["volume"];
    if (r.volume == null) { r.volume = 1; }
    r.volume = va5._validateNumber("volume", 0, r.volume, 10, 0);
    r.pitch = va5._validateNumber("pitch", 0.1, opts["pitch"]||1, 10, 1);
    r.pan = va5._validateNumber("pan", -1, opts["pan"]||0, 1, 0);

    // pathとoptsの両方に指定があった場合はoptsの方が優先される
    if (opts["loopStartSec"] != null) { r.loopStartSec = opts["loopStartSec"]; }
    if (opts["loopEndSec"] != null) { r.loopEndSec = opts["loopEndSec"]; }
    if (opts["loopLengthSec"] != null) { r.loopLengthSec = opts["loopLengthSec"]; }
    if (opts["loopStart"] != null) { r.loopStart = opts["loopStart"]; }
    if (opts["loopEnd"] != null) { r.loopEnd = opts["loopEnd"]; }
    if (opts["loopLength"] != null) { r.loopLength = opts["loopLength"]; }
    if (opts["playStartSec"] != null) { r.playStartSec = opts["playStartSec"]; }
    if (opts["playEndSec"] != null) { r.playEndSec = opts["playEndSec"]; }
    if (opts["playLengthSec"] != null) { r.playLengthSec = opts["playLengthSec"]; }
    if (opts["playStart"] != null) { r.playStart = opts["playStart"]; }
    if (opts["playEnd"] != null) { r.playEnd = opts["playEnd"]; }
    if (opts["playLength"] != null) { r.playLength = opts["playLength"]; }

    // どちらを採用するのか判定し、フラグに持つ。優先順は以下の通り
    // - どちらも存在するならSecを優先
    // - 片方しか存在しないなら存在する方を選択
    // - どちらも存在しないならSecを優先
    r.isAdoptLoopStartSec = true;
    if ((r.loopStartSec == null) && (r.loopStart != null)) { r.isAdoptLoopStartSec = false; }
    r.isAdoptLoopEndSec = true;
    if ((r.loopEndSec == null) && (r.loopEnd != null)) { r.isAdoptLoopEndSec = false; }
    r.isAdoptLoopLengthSec = true;
    if ((r.loopLengthSec == null) && (r.loopLength != null)) { r.isAdoptLoopLengthSec = false; }
    r.isAdoptPlayStartSec = true;
    if ((r.playStartSec == null) && (r.playStart != null)) { r.isAdoptPlayStartSec = false; }
    r.isAdoptPlayEndSec = true;
    if ((r.playEndSec == null) && (r.playEnd != null)) { r.isAdoptPlayEndSec = false; }
    r.isAdoptPlayLengthSec = true;
    if ((r.playLengthSec == null) && (r.playLength != null)) { r.isAdoptPlayLengthSec = false; }

    return r;
  };


  // parsePlayCommonOptsでparseしなかったパラメータをparseする。
  // その結果はTrue系パラメータに反映される。
  Util.parsePlayCommonOpts2 = function (r) {
    var sampleRate = va5._device.audioSourceToSampleRate(r.as);
    if (!sampleRate) {
      va5._logError(["failed to get sampleRate", r.path]);
      sampleRate = 44100;
    }

    // validate処理
    // NB: 元々のloopStartSec類を変更しないようにする事！
    //     (これらはcanConnect判定に使われるので変更してはいけない)

    // まずsec系とframe系のどちらを採用するかを決め、その値を取る
    // (その際にframe系の場合はSec化する)
    var loopStartSec = r.loopStartSec;
    if (!r.isAdoptLoopStartSec) { loopStartSec = r.loopStart / sampleRate; }
    var loopEndSec = r.loopEndSec;
    if (!r.isAdoptLoopEndSec) { loopEndSec = r.loopEnd / sampleRate; }
    var loopLengthSec = r.loopLengthSec;
    if (!r.isAdoptLoopLengthSec) { loopLengthSec = r.loopLength / sampleRate; }
    var playStartSec = r.playStartSec;
    if (!r.isAdoptPlayStartSec) { playStartSec = r.playStart / sampleRate; }
    var playEndSec = r.playEndSec;
    if (!r.isAdoptPlayEndSec) { playEndSec = r.playEnd / sampleRate; }
    var playLengthSec = r.playLengthSec;
    if (!r.isAdoptPlayLengthSec) { playLengthSec = r.playLength / sampleRate; }

    // length系がnullでない＆startが存在する場合は、これをend系に変換し上書き
    // (length系がnullでなくても、startがnullの場合はend化しない)
    if ((loopLengthSec != null) && (loopStartSec != null)) {
      loopEndSec = loopStartSec + loopLengthSec;
    }
    if ((playLengthSec != null) && (playStartSec != null)) {
      playEndSec = playStartSec + playLengthSec;
    }

    loopStartSec = va5._validateNumber("loopStartSec", 0, loopStartSec||0, null, 0);
    if (loopEndSec != null) { loopEndSec = va5._validateNumber("loopEndSec", 0, loopEndSec, null, null); }
    if (playStartSec == null) { playStartSec = loopStartSec; }
    playStartSec = va5._validateNumber("playStartSec", 0, playStartSec, null, loopStartSec);
    if (playEndSec != null) { playEndSec = va5._validateNumber("playEndSec", null, playEndSec, null, null); }

    // True系パラメータへの反映
    r.loopStartSecTrue = loopStartSec;
    r.loopEndSecTrue = loopEndSec;
    r.playStartSecTrue = playStartSec;
    r.playEndSecTrue = playEndSec;
    // loopEndSecTrue/playEndSecTrueは範囲内補正が必要
    r.loopEndSecTrue = adjustEndSecTrue(r.loopEndSecTrue, r);
    r.playEndSecTrue = adjustEndSecTrue(r.playEndSecTrue, r);

    return r;
  };


  // seおよびvoiceにて、load前にplayEnd系パラメータの有無を確認したいケースが
  // ある。それらを調べる関数を用意しておく
  Util.hasPlayEnd = function (state) {
    if (state.playStartSecTrue != null) {
      // true版のstartが存在するなら、true版のendで判定できる
      // (true版のstartはload後は必ずnull以外になる)
      return (state.playEndSecTrue != null);
    }

    // EndSec採用フラグが立っている場合は簡単に判定できる
    // (＝EndSecに何か有用な値が入っている)
    if (state.isAdoptPlayEndSec) { return true; }
    // そうでない場合はLengthSecとStartSecが両方あるならEndSecが算出できる
    if (state.isAdoptPlayLengthSec && state.isAdoptPlayStartSec) { return true; }
    // Sec版からは分からなかった。frame版から調査する
    if (state.playEnd != null) { return true; }
    if (state.playLength != null) { return true; }
    // Endパラメータはどこにもなかった
    return false;
  };
  // こっちは今のところ必要ない想定だが一応用意
  Util.hasLoopEnd = function (state) {
    if (state.loopStartSecTrue != null) {
      // true版のstartが存在するなら、true版のendで判定できる
      // (true版のstartはload後は必ずnull以外になる)
      return (state.loopEndSecTrue != null);
    }

    // EndSec採用フラグが立っている場合は簡単に判定できる
    // (＝EndSecに何か有用な値が入っている)
    if (state.isAdoptLoopEndSec) { return true; }
    // そうでない場合はLengthSecとStartSecが両方あるならEndSecが算出できる
    if (state.isAdoptLoopLengthSec && state.isAdoptLoopStartSec) { return true; }
    // Sec版からは分からなかった。frame版から調査する
    if (state.loopEnd != null) { return true; }
    if (state.loopLength != null) { return true; }
    // Endパラメータはどこにもなかった
    return false;
  };


  // NB: これは本来Bgm/Se内に含めるべき内容だが、
  //     共通にしたいので、ここに置いている
  Util.canConnect = function (transitionMode, state1, state2, isSkipLoop) {
    // isSkipLoopはSe用のスイッチ。
    // これが真ならSe用と判断しloop系パラメータのチェックはパスする
    transitionMode = va5._assertEnum("transitionMode", transitionMode, ["connectNever", "connectIfSame", "connectIfPossible"]);
    if (transitionMode == "connectNever") { return false; }
    // NB: ここからconnectIfPossibleの判定。指定パラメータ全てが同一なら真
    if (state1.path != state2.path) { return false; }
    if (!isSkipLoop) {
      if (state1.loopStartSec != state2.loopStartSec) { return false; }
      if (state1.loopStart != state2.loopStart) { return false; }
      if (state1.loopEndSec != state2.loopEndSec) { return false; }
      if (state1.loopEnd != state2.loopEnd) { return false; }
      if (state1.loopLengthSec != state2.loopLengthSec) { return false; }
      if (state1.loopLength != state2.loopLength) { return false; }
    }
    if (state1.playStartSec != state2.playStartSec) { return false; }
    if (state1.playStart != state2.playStart) { return false; }
    if (state1.playEndSec != state2.playEndSec) { return false; }
    if (state1.playEnd != state2.playEnd) { return false; }
    if (state1.playLengthSec != state2.playLengthSec) { return false; }
    if (state1.playLength != state2.playLength) { return false; }
    if (transitionMode == "connectIfPossible") { return true; }
    // NB: ここからconnectIfSameの判定。追加の指定パラメータ全ても同一なら真
    if (state1.pitch != state2.pitch) { return false; }
    if (state1.pan != state2.pan) { return false; }
    // NB: volumeはconnectによる自動調整の対象なので同一チェックをしなくてよい
    return true;
  };


})(this);
