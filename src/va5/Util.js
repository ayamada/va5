(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Util = va5.Util || {}; va5.Util = Util;


  Util.isObject = function (o) {
    if (o == null) { return false; }
    return (Object.prototype.toString.call(o) === "[object Object]");
  }


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
    if (!va5._device) {
      return null;
    }
    else if (va5._device.getCurrentSec && (va5._device.getCurrentSec() != null)) {
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

  /**
   * specialFilename
   *
   * 音源ファイルの名前に特定の文字列を含むようにrenameする事により、
   * 再生開始位置、再生終了位置、ループ開始位置、ループ終端位置を指定できます。
   * これらの詳細についてはplay系関数の該当引数の項目を参照してください。
   * もしplay系関数の引数も同時に与えられた場合は引数の方が優先されます。
   *
   * 以下のパラメータが指定可能です。
   * - ループ開始位置 `LOOPSTART` or `LOOPSTARTSEC`
   * - ループ終端 `LOOPEND` or `LOOPENDSEC` or `LOOPLENGTH` or `LOOPLENGTHSEC`
   * - 再生開始位置 `PLAYSTART` or `PLAYSTARTSEC`
   * - 終了位置 `PLAYEND` or `PLAYENDSEC` or `PLAYLENGTH` or `PLAYLENGTHSEC`
   * - 短縮 `LS` `LSS` `LE` `LES` `LL` `LLS` `PS` `PSS` `PE` `PES` `PL` `PLS`
   * - 特殊ショートカット `NL` `ME`
   *   (どちらも「非ループ音源」である事を示す、PLAYENDSEC=0の省略形)
   *
   * `foo.m4a` があった場合に `foo__(パラメータ名)=(数値).m4a` のように
   * renameする事で、パラメータを指定する事が可能です。
   * fooの直後のアンダーバーは二個必要です。
   * 以下に実際のrename例を示します。
   * (`foo.m4a` のサンプリングレートは44100Hzとします)
   * - `foo__LOOPSTART0_LOOPEND88200_PLAYSTART44100.m4a`
   *   ループ開始0秒位置、ループ終了2秒位置、実際の再生開始1秒位置
   * - `foo__LOOPSTARTSEC0.5_LOOPENDSEC2.0_PLAYSTARTSEC1.0.m4a`
   *   ループ開始0.5秒位置、ループ終了2秒位置、実際の再生開始1秒位置
   *   (ファイル名の途中にドットが入るのが嫌な場合は、
   *   SECなし指定の方を使ってください)
   * - `foo__LOOPSTARTSEC0.5LOOPENDSEC2.0PLAYSTARTSEC1.0.m4a`
   *   同上(パラメータの間をアンダーバーで区切らなくても認識される)
   * - `foo__LOOPSTARTSEC=0.5_LOOPENDSEC=2.0_PLAYSTARTSEC=1.0.m4a`
   *   同上(パラメータ値の前に=をつけてもよい)
   * - `foo__LSS0.5LES2PSS1.m4a`
   *   同上(短縮名)
   * - `foo__PLAYEND-1.5.m4a`
   *   曲の最後から1.5秒前の位置で再生終了
   * - `foo__PLAYEND=-1.5.m4a`
   *   同上(マイナス値ありなら=入りが分かりやすい)
   * - `foo__NL.m4a` / `foo__ME.m4a`
   *   非ループ曲指定(よく使う)
   * - `foo__PES=5_.3gp` (foo.3gpが元ファイル)
   *   これを foo__PES=5.3gp と指定してしまうと区切りが分からなくなるので、
   *   パラメータの最後にアンダーバーをつけている
   *
   * @name specialFilename
   */
  function parseAndApplyPathParameter (path) {
    var r = {};
    if (path == null) { return r; }
    r.path = path;

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

    // 短縮名
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


  // seおよびvoiceにて、load前にplayEnd系パラメータの有無を確認したい時用
  Util.hasPlayEnd = function (state) {
    if (state.playStartSecTrue != null) {
      // true版のstartが存在するなら、true版のendで判定できる
      // (true版のstartはload後は必ずnull以外になる)
      return (state.playEndSecTrue != null);
    }
    // End系の値そのものが設定されている場合は簡単に判定できる
    if (state.playEndSec != null) { return true; }
    if (state.playEnd != null) { return true; }
    // End系がなくても、Length系があるなら「endあり」の判定になる
    // (Start系はなくても0になるので「常にある」とできる)
    if ((state.playLength != null) || (state.playLengthSec != null)) { return false; }
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


  /**
   * va5.bgm(opts) / va5.se(opts) / va5.voice(opts) のオプション詳細
   *
   * - opts.path : 再生関数の第1引数にObjectを渡す場合は、ここで再生したい音源のpathを指定する。
   * - opts.volume : 再生時の相対音量の倍率を指定する。マスターボリュームとBgm/Se/Voiceのボリューム設定の影響を受ける。デフォルト値1.0。
   * - opts.pitch : 再生時のピッチを指定する。デフォルト値1.0。下限0.1、上限10.0。
   * - opts.pan : 再生時のパンを指定する。デフォルト値0.0。下限-1.0、上限1.0。
   *
   * - opts.loopStartSec : 「ループ再生の復帰ポイント位置」をファイル先頭からの秒数で指定する(これはpitchを変えた場合であっても本来の速度で換算される)。省略時は0秒地点。
   * - opts.loopStart : loopStartSecのフレーム数指定版。整数で指定する事。多くのオーディオファイルのサンプリングレートは44100Hzなので44100＝1秒になる。
   * - opts.loopEndSec : 「ループ再生の末尾位置」をファイル先頭からの秒数で指定する。ただし0およびマイナス値を指定した場合はファイル末尾基準で換算される。省略時はファイル末尾。
   * - opts.loopEnd : loopEndSecのフレーム数指定版。
   * - opts.loopLengthSec : 「ループ再生の末尾位置」をloopStartSec(もしくはloopStartからの秒数)で指定する。
   * - opts.loopLength : loopLengthSecのフレーム数指定版。
   * - opts.playStartSec : 曲の再生開始位置を秒数指定する。省略時はloopStartSec(もしくはloopStartから換算される秒数)と同じになる。loopStartSec系列と異なる値を設定可能。
   * - opts.playStart : playStartSecのフレーム数指定版。
   * - opts.playEndSec : 省略時はループ音源として扱われる。これが指定されると非ループ音源扱いとなりループ系パラメータは無視され、この秒数地点に到達したタイミングで再生が即座に終了される。
   * - opts.playEnd : playEndSecのフレーム数指定版。
   * - opts.playLengthSec : playEndSecをplayStartSec地点からの相対秒数で指定できる。
   * - opts.playLength : playLengthSecのフレーム数指定版。
   *
   * - opts.transitionMode : Bgm専用。 `"connectNever"` `"connectIfSame"` `"connectIfPossible"` のいずれかを指定する。デフォルト値は `"connectIfSame"` 。あるBgm再生中に同じ(もしくは近い)パラメータのBgmを再生しようとした時の挙動を指定する。 `connectNever` だった場合は常に一旦フェードアウト終了してから新たに再生し直す。 `connectIfSame` だった場合はボリューム以外のパラメータが同一の場合はボリューム適用のみ行う(pitch等が違っている場合はたとえ同じpathであってもconnectNeverの時と同様の処理になる)。 `connectIfPossible` は `volume` `pitch` `pan` 以外のパラメータが同一の時に限り `connectIfSame` の処理を行う(この3パラメータは新しい値が適用される)。
   * - opts.fadeinSec : Bgm/Voice専用。再生開始時にこの秒数かけてフェードインを行う。デフォルト値0秒。
   * - opts.channel : Bgm/Voice専用。指定したチャンネル名(任意の文字列)に対してBgm/Voice再生を予約する。チャンネル名を指定する事で、同時に複数のBgmの再生とその制御が行える。指定したチャンネルに古い再生がなければ即座に再生が開始される。古い再生がある場合はそれを規定の秒数かけてフェードアウト終了した後に再生を行う。省略時のチャンネル名は `"_bgm"` だが、Voiceの場合はこのチャンネル名指定は必須となり省略する事はできない(Voiceに対応する人名などを示す文字列を指定するとよい)。
   * - opts.isAlarm : Se専用。va5.getConfig("is-pause-on-background")が真値の時にバックグラウンド状態であってもSeを再生する(未実装)
   *
   * @name playOptions
   */
  // TODO: これらの配列を自動的に生成できるようにする必要がある(手で管理すると更新を忘れる為)。どうやればできるか考える事
  var validKeysCommon = [
    "path",
    "volume",
    "pitch",
    "pan",
    "loopStartSec",
    "loopEndSec",
    "loopLengthSec",
    "loopStart",
    "loopEnd",
    "loopLength",
    "playStartSec",
    "playEndSec",
    "playLengthSec",
    "playStart",
    "playEnd",
    "playLength"
  ];
  var validKeysBgm = validKeysCommon.concat([
    "transitionMode",
    "fadeinSec",
    "channel"
  ]);
  var validKeysSe = validKeysCommon.concat([
    "isAlarm",
    "channel"
  ]);

  // optsに未知の名前のエントリ(おそらくtypo)がないか調べる。
  // もしあった場合はそのkey名と、指定可能なkey一覧をログ出力する
  function checkUnknownOpts (validKeysMap, opts) {
    var unknownKey = null;
    for (var k in opts) {
      if (!validKeysMap[k]) {
        unknownKey = k;
        break;
      }
    }
    if (unknownKey != null) {
      va5._logError(["unknown key", unknownKey, "found. valid keys are", Object.keys(validKeysMap).sort()]);
    }
  }

  var validKeysBgmMap = {};
  validKeysBgm.forEach(function (k) { validKeysBgmMap[k] = true; });
  Util.checkUnknownOptsBgm = function (opts) {
    checkUnknownOpts(validKeysBgmMap, opts);
  };

  var validKeysSeMap = {};
  validKeysSe.forEach(function (k) { validKeysSeMap[k] = true; });
  Util.checkUnknownOptsSe = function (opts) {
    checkUnknownOpts(validKeysSeMap, opts);
  };


})(this);
