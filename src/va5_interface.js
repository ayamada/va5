(function(exports) {
  "use strict";
  var va5 = (function (k) {
    va5 = exports[k] || {}; exports[k] = va5; return va5;
  })(("[object Object]" !== exports.toString()) ? "va5" : "exports");

  // NB: このファイル中の「va5中の、小文字のa-zで始まるプロパティ」は
  //     Makefileによって、自動的にexternされる。
  //     externしたくないものは、_はじまりにするとよい。
  //     (大文字はじまりのパッケージもextern対象から除外される)


  va5._validateNumber = va5.Assert.validateNumber;
  va5._validateString = va5.Assert.validateString;
  va5._validatePath = va5.Assert.validatePath;
  va5._validateSeCh = va5.Assert.validateSeCh;
  va5._validateBgmCh = va5.Assert.validateBgmCh;
  va5._validateVoiceCh = va5.Assert.validateVoiceCh;
  va5._validateEnum = va5.Assert.validateEnum;

  va5._assertNumber = va5.Assert.assertNumber;
  va5._assertString = va5.Assert.assertString;
  va5._assertPath = va5.Assert.assertPath;
  va5._assertSeCh = va5.Assert.assertSeCh;
  va5._assertBgmCh = va5.Assert.assertBgmCh;
  va5._assertVoiceCh = va5.Assert.assertVoiceCh;
  va5._assertEnum = va5.Assert.assertEnum;


  /**
   * va5.getConfig(key)
   * configパラメータ内容の取得。
   * 詳細は別セクションを参照。
   */
  va5.getConfig = va5.Config.get;
  /**
   * va5.setConfig(key, val)
   * configパラメータ内容の設定。
   * 詳細は別セクションを参照。
   * 一部のパラメータは va5.init() よりも先に設定しておかないと効果がない。
   * 別の一部のパラメータは設定変更内容が即座に反映される。
   */
  va5.setConfig = va5.Config.set;


  va5._logError = va5.Log.error;
  va5._logDebug = va5.Log.debug;


  /**
   * va5.init()
   * システム全体の初期化。
   * 最初に一度だけ行えばよい。二回目以上実行しても何もしない。
   * 一部のconfigパラメータは va5.init() よりも先に設定しておく必要がある。
   * 実行しなくても機能のしますが(再生時に内部でinitを実行している)、
   * 「タッチ操作」等によるWebAudioのresumeのフックは
   * この va5.init() によって設定されるので、なるべく早い段階で
   * 実行しておく事をおすすめします。
   */
  va5.init = va5.Init.init;


  /**
   * va5.getDeviceName()
   * 内部で選択されたデバイスが文字列として返る。
   * "WebAudio" (再生可能)、もしくは "Dumb" (再生不可、何をやっても無音)。
   */
  va5.getDeviceName = function () {
    va5.init();
    return va5._device.name;
  };


  /**
   * va5.floatToPercent(f)
   * 小数値をパーセント整数値に変換するユーティリティ関数。
   */
  va5.floatToPercent = va5.Util.floatToPercent;
  /**
   * va5.percentToFloat(p)
   * パーセント整数値を小数値に変換するユーティリティ関数。
   */
  va5.percentToFloat = va5.Util.percentToFloat;
  /**
   * va5.getNowMsec()
   * WebAudio依存の、経過時間を測定する為の高精度のマイクロ秒数を取得する。
   * WebAudio依存の為、 va5.init() が実行される前はnullが返る。
   * また va5.init() が実行された後でも、タッチ操作等によるアンロックが
   * 必要な環境では、アンロック前は0から進まない。
   * この秒数は現実の日時との相関関係がない。
   */
  va5.getNowMsec = va5.Util.getNowMsec;


  /**
   * va5.isLoading(path)
   * 指定したpathがロード待ちもしくはロード中の時のみ真を返す。
   * もしpathがObjectだった場合は、path.pathがpathとして参照される。
   * (bgm/se/voiceの第一引数にObjectを渡す時と対称になる)
   */
  va5.isLoading = function (path) {
    va5.init();
    if (va5.Util.isObject(path)) { path = path.path; }
    return va5.Cache.isLoading(path);
  };
  //va5.isLoaded = va5.Cache.isLoaded; // これは外部には提供しない事になった
  /**
   * va5.isError(path)
   * 指定したpathのロードがエラー終了していた時のみ真を返す。
   * もしpathがObjectだった場合は、path.pathがpathとして参照される。
   * (bgm/se/voiceの第一引数にObjectを渡す時と対称になる)
   */
  va5.isError = function (path) {
    va5.init();
    if (va5.Util.isObject(path)) { path = path.path; }
    return va5.Cache.isError(path);
  };
  /**
   * va5.isCancelled(path)
   * 指定したpathのロードがキャンセル終了していた時か、
   * そもそもロード要求が何もされていない時に、真を返す。
   * (つまり、ロード中、ロード成功、ロードエラーの時は偽を返す)
   * もしpathがObjectだった場合は、path.pathがpathとして参照される。
   * (bgm/se/voiceの第一引数にObjectを渡す時と対称になる)
   */
  va5.isCancelled = function (path) {
    va5.init();
    if (va5.Util.isObject(path)) { path = path.path; }
    return va5.Cache.isCancelled(path);
  };

  /**
   * va5.load(path, handle)
   * 指定したpathの事前ロードを予約する。事前ロードはasyncに実行される。
   * handleが指定された場合、事前ロードが正常終了かエラー終了かキャンセル終了
   * した際にhandle()が実行される。
   * 正常終了かどうかはva5.isError()やva5.isCancelled()等で確認する事。
   * もしpathが既にロード済の場合は、何もせず即座にhandleを実行する。
   * もしpathがObjectだった場合は、path.pathがpathとして参照される。
   * (bgm/se/voiceの第一引数にObjectを渡す時と対称になる)
   * bgm/se/voiceの各再生関数は、pathが未load状態だった場合は内部で
   * このva5.load()を実行してくれる(ロード完了後に再生が開始される)。
   */
  va5.load = function (path, cont) {
    va5._logDebug(["called va5.load", path]);
    va5.init();
    if (va5.Util.isObject(path)) { path = path.path; }
    va5.Cache.load(path, cont);
  };

  /**
   * va5.loadBuf(buf)
   * 引数として渡されたオーディオバッファを即座にロードする。
   * 返り値としてpath相当の文字列を返すので、
   * これをva5.se()等に渡す事でbufを再生できる。
   * このpathはunload可能だが、unload後の再利用はできないので注意する事。
   */
  // こちらは即座にロードされるのでconfを取る必要はない。
  va5.loadBuf = function (buf) {
    va5._logDebug(["called va5.loadBuf", buf]);
    va5.init();
    return va5.Cache.loadBuf(buf);
  };

  /**
   * va5.unload(path)
   * ロード済のpathをメモリから解放する。
   * このpathの全ての再生中のbgm/se/voiceは即座に再生停止する。
   * pathがロード中だった場合はキャンセルされる。
   * pathがロードされていない/既にunload済の場合は何も起きない。安全。
   * 一度unloadしたpathを再度loadしたり再生しても問題ない。
   * もしpathがObjectだった場合は、path.pathがpathとして参照される。
   * (bgm/se/voiceの第一引数にObjectを渡す時と対称になる)
   */
  va5.unload = function (path) {
    va5._logDebug(["called va5.unload", path]);
    va5.init();
    if (va5.Util.isObject(path)) { path = path.path; }
    va5.Bgm.stopImmediatelyByPath(path); // voiceもここに含まれる
    va5.Se.stopImmediatelyByPath(path);
    va5.Cache.unload(path);
  };

  /**
   * va5.unloadIfUnused(path)
   * このpathがロード中でも再生中でもない場合にのみunloadする。
   * もしpathがObjectだった場合は、path.pathがpathとして参照される。
   * (bgm/se/voiceの第一引数にObjectを渡す時と対称になる)
   */
  va5.unloadIfUnused = function (path) {
    va5._logDebug(["called va5.unloadIfUnused", path]);
    va5.init();
    if (va5.Util.isObject(path)) { path = path.path; }
    va5.Cache.unloadIfUnused(path);
  };

  /**
   * va5.unloadAll()
   * 全てをunloadする。
   */
  va5.unloadAll = function () {
    va5._logDebug("called va5.unloadAll");
    va5.init();
    va5.Bgm.stopImmediatelyAll(); // voiceもここに含まれる
    va5.Se.stopImmediatelyAll();
    va5.Cache.getAllPaths().forEach(va5.Cache.unload);
  };

  /**
   * va5.unloadAllIfUnused()
   * 全てをunloadIfUnusedする。
   * ※現在の実装はかなり重いです。あまり頻繁に実行しないようにしてください。
   */
  // TODO: これは気軽に呼ばれる割にかなり重い、軽量化できるならしたいが…
  va5.unloadAllIfUnused = function () {
    va5._logDebug("called va5.unloadAllIfUnused");
    va5.init();
    va5.Cache.getAllPaths().forEach(va5.Cache.unloadIfUnused);
  };

  /**
   * va5.getDuration(path)
   * ロード済のpathの曲の長さを秒単位で取得する。
   * ロード済のpathのみ取得可能、未ロードの場合はnullが返る。
   * WebAudio非対応環境(Dumb)の場合は常に0が返る、注意。
   * もしpathがObjectだった場合は、path.pathがpathとして参照される。
   * (bgm/se/voiceの第一引数にObjectを渡す時と対称になる)
   * ※音源ファイルの形式によっては、不正確になる事があります。
   * (勝手に無音部分が追加される場合がある為。詳細は他セクションを参照)
   */
  va5.getDuration = function (path) {
    va5.init();
    if (va5.Util.isObject(path)) { path = path.path; }
    return va5.Cache.getDuration(path);
  };


  /**
   * va5.getSampleRate(path)
   * ロード済のpathのサンプリングレートの数値を取得する。
   * ロード済のpathのみ取得可能、未ロードの場合はnullが返る。
   * WebAudio非対応環境(Dumb)の場合は常に0が返る、注意。
   * 単位はHz。ほとんどのケースで44100, 48000, 22050, あたりの値が得られる。
   * もしpathがObjectだった場合は、path.pathがpathとして参照される。
   * (bgm/se/voiceの第一引数にObjectを渡す時と対称になる)
   */
  va5.getSampleRate = function (path) {
    va5.init();
    if (va5.Util.isObject(path)) { path = path.path; }
    return va5.Cache.getSampleRate(path);
  };


  /**
   * va5.getAudioContext()
   * WebAudioのAudioContextを取得する。Dumbの時はnullになる。
   * SEをon the flyに生成する時等に利用する。
   */
  va5.getAudioContext = function () {
    va5.init();
    return va5._device.getAudioContext();
  };


  /**
   * va5.se(path, opts) / va5.se(opts)
   * pathもしくはopts.pathをSEとして再生し、そのチャンネルidを返す。
   * チャンネルidはSEを途中で停止させる必要がなければそのまま捨てても問題ない。
   * pathがまだロードされていない場合はロードを行ってから再生する。
   * (内部でロード待ちが発生する)
   * optsの詳細は別セクションを参照。
   */
  va5.se = function (path, opts) {
    va5._logDebug(["called va5.se", path, opts]);
    va5.init();
    if ((opts == null) && va5.Util.isObject(path)) { opts = path; path = opts.path; }
    if (path == null) {
      var ch = (opts && opts["channel"]) || null;
      va5.stopSe(ch, null);
      return null;
    }
    else {
      return va5.Se.playSe(path, opts);
    }
  };

  /**
   * va5.playSe(path, opts)
   * va5.se()のalias。
   */
  va5.playSe = va5.se; // alias

  /**
   * va5.stopSe(ch, fadeSec)
   * 指定したチャンネルidのSEの再生をfadeSec秒かけてフェードアウト終了する。
   * fadeSecを指定しない場合はva5.getConfig("default-se-fade-sec")の秒数が
   * 適用される。デフォルト値は0秒。
   */
  va5.stopSe = function (ch, fadeSec) {
    va5._logDebug(["called va5.stopSe", ch, fadeSec]);
    va5.init();
    va5.Se.stopSe(ch, fadeSec);
  };

  /**
   * va5.statsSe()
   * 現在のSEの再生状況(再生中のchが何個あるか)の統計情報を取得する。
   * 通常は利用する必要はない。デバッグ用。
   */
  va5.statsSe = va5.Se.stats;


  /**
   * va5.makePlaySePeriodically(intervalSec, path, opts)
   * 毎フレーム連打されるSEを、実際の再生は一定間隔にしたいような時に使う
   * ユーティリティ関数。引数なし関数が返される。返された関数を実行すると
   * va5.se(path, opts)が実行される。ただし返された関数を毎フレーム実行しても
   * 実際の再生間隔はintervalSec毎に間引かれる。間引かれた時はnullが返る。
   * (間引かれない時は通常通りチャンネルidが返る)
   * もしpathがObjectだった場合は、path.pathがpathとして参照される。
   * (bgm/se/voiceの第一引数にObjectを渡す時と対称になる)
   */
  va5.makePlaySePeriodically = function (intervalSec, path, opts) {
    va5._logDebug(["called va5.makePlaySePeriodically", intervalSec, path, opts]);
    var lastPlaySec = 0;
    var f = function () {
      var now = va5.getNowMsec() / 1000;
      if ((now - lastPlaySec) < intervalSec) { return null; }
      lastPlaySec = now;
      var ch = va5.se(path, opts);
      return ch;
    };
    return f;
  };


  /**
   * va5.getBgmPos(ch)
   * BGMのチャンネルidを指定し、再生中の曲が先頭から何秒のところを現在
   * 再生しているのかの位置を秒単位で返す。
   * 途中から再生開始させた場合であっても、曲の先頭からが基準となる。
   * またpitchを変更している場合であっても、本来の曲の再生速度での位置となる。
   * 再生が終了している等の場合はnullが返る。
   */
  va5.getBgmPos = va5.Bgm.getBgmPos;

  /**
   * va5.isInBackground()
   * (ブラウザの)このタブがバックグラウンドかどうかを返す。
   */
  va5.isInBackground = va5.Bgm.isInBackground;

  /**
   * va5.bgm(path, opts) / va5.bgm(opts)
   * pathもしくはopts.pathをBGMとして再生する。
   * pathがまだロードされていない場合はロードを行ってから再生する。
   * (内部でロード待ちが発生する)
   * optsの詳細は別セクションを参照。
   * 既に別のBGMを再生中の場合は、まず再生中のBGMを
   * va5.getConfig("default-bgm-fade-sec") かけて(デフォルト1秒)
   * フェードアウト終了させてから、新しいBGMを再生する。
   * pathにnullが指定された場合は va5.stopBgm() と同じ挙動となる。
   */
  va5.bgm = function (path, opts) {
    va5._logDebug(["called va5.bgm", path, opts]);
    va5.init();
    if ((opts == null) && va5.Util.isObject(path)) { opts = path; path = opts.path; }
    return va5.Bgm.playBgm(path, opts);
  };
  /**
   * va5.playBgm(path, opts)
   * va5.bgm()のalias。
   */
  va5.playBgm = va5.bgm; // alias

  function copyObjShallowly (o) {
    if (o == null) { return null; }
    if (Object.assign) { return Object.assign({}, o); }
    var newObj = {};
    Object.keys(o).forEach(function (k) { newObj[k] = o[k]; });
    return newObj;
  }

  /**
   * va5.bgs(path, opts) / va5.bgs(opts)
   * pathもしくはopts.pathをBGSとして再生する。
   * 内部動作の実体は channel=__BGS として va5.bgm() を実行するだけ。
   */
  va5.bgs = function (path, opts) {
    va5._logDebug(["called va5.bgs", path, opts]);
    va5.init();
    if ((opts == null) && va5.Util.isObject(path)) { opts = path; path = opts.path; }
    var newOpts = copyObjShallowly(opts);
    if (opts != null) { newOpts["channel"] = "__BGS"; }
    return va5.Bgm.playBgm(path, newOpts);
  };
  /**
   * va5.playBgs(path, opts)
   * va5.bgs()のalias。
   */
  va5.playBgs = va5.bgs; // alias

  /**
   * va5.voice(path, opts) / va5.voice(opts)
   * pathもしくはopts.pathをVoiceとして再生する。
   * optsの詳細は別セクションを参照。
   */
  va5.voice = function (path, opts) {
    va5._logDebug(["called va5.voice", path, opts]);
    va5.init();
    if ((opts == null) && va5.Util.isObject(path)) { opts = path; path = opts.path; }
    return va5.Bgm.playVoice(path, opts);
  };
  /**
   * va5.playVoice(path, opts)
   * va5.voice()のalias。
   */
  va5.playVoice = va5.voice; // alias

  /**
   * va5.stopBgm(ch, fadeSec)
   * 指定したchのBGMの再生をfadeSec秒かけてフェードアウト終了する。
   * fadeSecを指定しない場合はva5.getConfig("default-bgm-fade-sec")の秒数が
   * 適用される。デフォルト値1秒。
   */
  va5.stopBgm = function (ch, fadeSec) {
    va5._logDebug(["called va5.stopBgm", ch, fadeSec]);
    va5.init();
    va5.Bgm.stopBgm(ch, fadeSec);
  };
  /**
   * va5.stopBgs(ch, fadeSec)
   * 指定したchのBGSの再生をfadeSec秒かけてフェードアウト終了する。
   * fadeSecを指定しない場合はva5.getConfig("default-bgm-fade-sec")の秒数が
   * 適用される。デフォルト値1秒。
   */
  va5.stopBgs = function (ch, fadeSec) {
    va5._logDebug(["called va5.stopBgs", ch, fadeSec]);
    va5.init();
    if (ch == null) { ch = "__BGS"; }
    va5.Bgm.stopBgs(ch, fadeSec);
  };
  /**
   * va5.stopVoice(ch, fadeSec)
   * 指定したchのVoiceの再生をfadeSec秒かけてフェードアウト終了する。
   * fadeSecを指定しない場合はva5.getConfig("default-voice-fade-sec")の秒数が
   * 適用される。デフォルト値0.1秒。
   */
  va5.stopVoice = function (ch, fadeSec) {
    va5._logDebug(["called va5.stopVoice", ch, fadeSec]);
    va5.init();
    va5.Bgm.stopVoice(ch, fadeSec);
  };


  /**
   * va5.version
   * va5のバージョン文字列が入っている。
   */
  va5.version = va5.version || "0.0.0-UNDEFINED";
})(this);
