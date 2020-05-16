// base
(function(exports) {
  "use strict";
  var va5 = exports.va5 || {};
  exports.va5 = va5;

  // 内部用
  va5._outputErrorLog = function (logObj) {
    if (!va5.config["is-output-error-log"]) { return; }
    var c = window.console;
    if (c) { c.error("va5:", logObj); }
  };
  va5._outputDebugLog = function (logObj) {
    if (!va5.config["is-output-debug-log"]) { return; }
    var c = window.console;
    if (c) { c.info("va5:", logObj); }
  };

  // 以下、export対象
  va5.version = "(TODO)"; // reserved(将来に更新しやすい機構を導入したら対応)

  // NB: percentは小数を持たない扱いである事に注意
  va5.floatToPercent = function (f) { return Math.round(f * 100); };
  va5.percentToFloat = function (p) { return p * 0.01; };
})(this);




// config
(function(exports) {
  "use strict";
  var va5 = exports.va5;

  // 考えた結果、va4互換のkebab-caseのkeyにする事に
  var initialConfig = {
    "volume-master": 0.6,
    "volume-bgm": 0.6,
    "volume-se": 0.6,
    "volume-voice": 0.6, // TODO: 将来拡張予約
    "default-bgm-fade-sec": 1,
    "default-se-fade-sec": 0,
    "is-pause-on-background": true,
    "se-chattering-sec": 0.05,
    "additional-query-string": null,
    "is-output-error-log": true,
    "is-output-debug-log": false
  };
  // NB: これらのconfig値の変更は現在再生中のものには影響を与えない。
  //     (変更したその後の再生/停止リクエストから影響を与える)
  //     現在再生中のものに影響を与えたい volume- 系の項目は、変更後に
  //     明示的に va5.syncVolume(); を実行する事。

  function deepCopy (obj) { return JSON.parse(JSON.stringify(obj)); }

  if (!va5.config) { va5.config = deepCopy(initialConfig); }
})(this);




// _setupWebAudioUnlock
(function(exports) {
  "use strict";
  var va5 = exports.va5;

  // See http://ch.nicovideo.jp/indies-game/blomaga/ar1410968
  // See http://ch.nicovideo.jp/indies-game/blomaga/ar1470959
  // モバイルデバイスおよび最近のブラウザでは、インタラクションイベントを
  // トリガーにして再生を行う事によるアンロック処理が必要となる。
  // 具体的なアンロック処理は二つあり、一つはAudioContextインスタンスの
  // stateが自動的にsuspendedになっているのをresumeする事と、もう一つは
  // AudioContextインスタンスで無音でよいから音を再生しようとする事。
  // この二つはそれぞれトリガーとすべきイベントが異なっている。

  // NB: AudioContextをsuspendする場合、この処理が誤判定を起こすケースがある。
  //     よってバックグラウンド化等で一時停止したい場合であっても、
  //     AudioContextをsuspendするのは避けた方がよい。
  //     (そうではなく各sourceを一時停止させた方がよい)

  va5._setupWebAudioUnlock = function (ctx) {
    var isResumeRunning = false;
    var tryCount = 0;
    var tryMax = 10;
    function playSilence () { ctx.createBufferSource().start(0); }
    function doResume () {
      if (!ctx.resume) {
        // resume機能を持っていない。念の為無音再生してから終了する
        va5._outputDebugLog(["registerTouchUnlockFn", "resume not found"]);
        playSilence();
        return true;
      }
      if (ctx.state !== "suspended") {
        // 既にunlock済。念の為無音再生してから終了する
        va5._outputDebugLog(["registerTouchUnlockFn", "done"]);
        playSilence();
        return true;
      }
      if (isResumeRunning) {
        // 既にresume実行中で終了を待っている場合は、次回またチェックする
        va5._outputDebugLog(["registerTouchUnlockFn", "waiting"]);
        return false;
      }
      if (tryMax < tryCount) {
        // 一定回数リトライした。諦める。一応無音再生はしておく
        va5._outputDebugLog(["registerTouchUnlockFn", "give up"]);
        playSilence();
        return true;
      }
      // resumeを実行する
      va5._outputDebugLog(["registerTouchUnlockFn", "try to resume"]);
      tryCount++;
      isResumeRunning = true;
      ctx.resume().then(
        function () {
          va5._outputDebugLog(["registerTouchUnlockFn", "succeeded to resume"]);
          isResumeRunning = false;
          // NB: これが効くかは分からない(thenによりイベント外扱いになる為)。
          //     なのでこの後にも再度playSilence()する。
          //     ただアンロックは可能な限り早く行いたいので、
          //     ここでもplaySilence()は行っておく
          playSilence();
        },
        function () {
          va5._outputDebugLog(["registerTouchUnlockFn", "failed to resume"]);
          isResumeRunning = false;
        });
      // まだ成功したかは分からないのでtrueは返せない
      return false;
    }
    function makeHandleResume (k) {
      function handle (e) {
        // NB: こっちのunlockは何度か行う必要がある
        //     (doResume()が偽値を返したら次のイベントでまたリトライする)
        if (!doResume()) { return; }
        document.removeEventListener(k, handle, false);
      }
      return handle;
    }
    var resumeKeys = ["touchend", "mousedown", "keydown"];
    resumeKeys.forEach(function (k) {
      document.addEventListener(k, makeHandleResume(k), false);
    });

    function handlePlay (e) {
      playSilence();
      document.removeEventListener("touchstart", handlePlay, false);
    }
    document.addEventListener("touchstart", handlePlay, false);
  };
})(this);




// device
// NB: これを差し替えればWebAudio以外の音源にも対応できる、という建前
//     (実際にはかなり大変なので、そこまでやらないと思うが…)
(function(exports) {
  "use strict";
  var va5 = exports.va5;

  if (!va5.device) { va5.device = {}; }

  va5.device.name = "WebAudio"; // 差し替え後に判定可能なように

  // NB: initしてもこれがnullのままならWebAudio非対応。
  //     init以外の各関数は必ず最初にこれをチェックする事
  var ac = null;
  var masterGainNode = null;

  var isInitialized = false;
  va5.device.init = function () {
    if (isInitialized) {
      va5._outputErrorLog("already called va5.device.init");
      return;
    }
    va5._outputDebugLog("called va5.device.init");

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      va5._outputErrorLog("neither AudioContext nor webkitAudioContext");
      return;
    }
    // かつて、モバイル系の音割れ対策として「acを一個生成してcloseすればよい」
    // というバッドノウハウがあった。
    // 今も必要なのか分からないが一応行っておく。
    // ただし、これが例外を投げてしまう場合があるのでtryで囲む必要がある。
    try { (new AudioContext()).close(); } catch (e) {}
    // 今度は正式にacを生成する
    try {
      ac = new AudioContext();
    }
    catch (e) {
      ac = null;
      va5._outputErrorLog("could not create AudioContext");
      return;
    }

    // TODO: このタイミングで「あまりに古すぎるモバイル端末」を除外したい。どう判定する？できればuseragentに頼らない判定をしたいが…
    //       - (chromeでない)android標準ブラウザはWebAudio非対応なので自動的に除外されるので問題ない
    //       - 問題は、WebAudioに中途半端にしか対応していない環境。これをどうにかして検出する必要がある…
    if (false) {
      try { ac.close(); } catch (e) {}
      ac = null;
      va5._outputDebugLog("too old WebAudio, disable forcibly");
      return;
    }

    masterGainNode = ac.createGain();
    masterGainNode.gain.value = 1;
    masterGainNode.connect(ac.destination);
    va5._setupWebAudioUnlock(ac);
    return;
  };

  va5.device.isAvailable = function () {
    return !!ac;
  };

  va5.device.disposeAudioSource = function (as) {
    if (as === null) { return; }
    // WebAudio では、全てが自動でGC可能な筈。
    // ただブラウザ側の不具合でGCできない可能性もあり、
    // その場合はここで何らかの処理を行う必要があるかもしれない
    // TODO
  };

  va5.device.audioSourceToDuration = function (as) {
    return as.duration;
  }

  // ロードに成功しても失敗してもcontが実行される。
  // 成功していれば引数にasが渡され、失敗ならnullが渡される。
  // NB: ここに渡すpathは va5._cache.appendQueryString() 処理済である事！
  // va5ではasはbufそのものとして扱う。bufの長さは buf.duration で取れる。
  va5.device.loadAudioSource = function (path, cont) {
    function errorEnd1 (e) {
      va5._outputErrorLog(["failed to load", path]);
      cont(null);
      return;
    }
    function errorEnd2 (e) {
      va5._outputErrorLog(["cannot decode", path]);
      cont(null);
      return;
    }
    if (path === null) { errorEnd1(); return; }
    if (ac === null) {
      va5._outputDebugLog(["disabled WebAudio", path]);
      cont(null); // TODO: 可能ならダミーのasを返して成功扱いにしたい
      return;
    }
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
          cont(buf);
          return;
        }, errorEnd2);
      }
      catch (e) {
        errorEnd2();
        return;
      }
    };
    xhr.send();
  };

  function disconnectSafely (node) {
    if (node === null) { return; }
    try {
      node.disconnect();
    }
    catch (e) {
    }
  }

  // これは音が鳴るところまでを実装した最小構成。これをベースに分解していき、間にキャッシュを入れたりしていく
  va5.device.playProto = function (path, opts) {
    if (ac === null) { return null; }

    var pitch = opts["pitch"] || 1;
    var volume = opts["volume"] || 1;
    var pan = opts["pan"] || 0;
    var isLoop = !!opts["isLoop"];
    var loopStart = opts["loopStart"] || 0;
    var loopEnd = opts["loopEnd"]; // 偽値の場合は as.duration が採用される
    var startPos = opts["startPos"] || 0;

    var playState = {};
    playState.phase = "loading";

    // TODO: asは _cache を通じて取得するようにする(毎回ロードしたくない)
    //       ただしdevice自体は_cacheに依存しないようにする必要がある。
    //       (この事を考えると、playProtoの引数はpathではなくasになるべき)
    va5.device.loadAudioSource(path, function (as) {
      playState.phase = "loaded";
      if (!as) { return; }
      if (as["dummy"]) { return; }

      var sourceNode = ac.createBufferSource();
      var gainNode = ac.createGain();
      sourceNode.buffer = as;
      sourceNode.playbackRate.value = pitch;
      gainNode.gain.value = volume;
      sourceNode.connect(gainNode);
      var pannerNodeType;
      var pannerNode;
      if (ac.createStereoPanner) {
        pannerNodeType = "stereoPannerNode";
        pannerNode = ac.createStereoPanner();
        pannerNode.pan.value = pan;
        gainNode.connect(pannerNode);
        pannerNode.connect(masterGainNode);
      }
      else if (ac.createPanner) {
        pannerNodeType = "pannerNode";
        pannerNode = ac.createPanner();
        pannerNode.panningModel = "equalpower";
        pannerNode.setPosition(pan, 0, 1-Math.abs(pan));
        gainNode.connect(pannerNode);
        pannerNode.connect(masterGainNode);
      }
      else {
        pannerNodeType = "none";
        pannerNode = null;
        gainNode.connect(masterGainNode);
      }

      if (isLoop) {
        sourceNode.loop = true;
        sourceNode.loopStart = loopStart;
        sourceNode.loopEnd = loopEnd || as.duration;
      }
      else {
        sourceNode.onended(function () {
          var now = ac.currentTime;
          disconnectSafely(sourceNode);
          disconnectSafely(gainNode);
          disconnectSafely(pannerNode);
          playState.sourceNode = null;
          playState.gainNode = null;
          playState.pannerNode = null;
          playState.playEndTIme = now;
        });
      }

      var now = ac.currentTime;
      playState.sourceNode = sourceNode;
      playState.gainNode = gainNode;
      playState.pannerNodeType = pannerNodeType;
      playState.pannerNode = pannerNode;
      playState.volume = volume;
      playState.pitch = pitch;
      playState.pan = pan;
//                       :loop loop?
//                       :started-pos start-pos
//                       :play-start-time now
      playState.playEndTIme = null;
      playState.phase = "playing";
      sourceNode.start(now startPos);
    });
    return playState; // TODO: playStateではなくch(id値)を返すべき？
  };

  // TODO: もっと機能を追加する必要あり

})(this);




// background
(function(exports) {
  "use strict";
  var va5 = exports.va5;

  va5._background = {};

  var isInstalled = false;
  var isInactiveNow = false;

  va5._background.startSupervise = function (h) {
    if (isInstalled) { return; }
    isInstalled = true;
    function changedVisibility (e) {
      isInactiveNow = (document.visibilityState === "hidden");
      if (h) { h(isInactiveNow); }
    }
    document.addEventListener("visibilitychange", changedVisibility);
    changedVisibility(null);
  };
  va5._background.isInBackground = function () {
    return isInactiveNow;
  };
})(this);




// bgm
(function(exports) {
  "use strict";
  var va5 = exports.va5;

  va5._bgm = {};

  va5._bgm.syncBackground = function (isInBackground) {
    // isInBackground が真なら一時停止、偽なら復帰処理を行う。
    // ただし停止中→停止要求や再生中→再生要求もありえる事に注意。
    // また va5.config["is-pause-on-background"] が偽値なら
    // 決して停止しない事
//(defn sync-background! [now-background? &[force?]]
//  (when (or
//          force?
//          (not (state/get :dont-stop-on-background?)))
//    (doseq [bgm-ch (keys @channel-state-table)]
//      (let [state (resolve-state! bgm-ch)
//            pos (get @resume-pos-table bgm-ch)]
//        (if now-background?
//          (background-on! bgm-ch state)
//          (background-off! bgm-ch state pos))))))
    // TODO
  };

})(this);



// se
(function(exports) {
  "use strict";
  var va5 = exports.va5;

  va5._se = {};
  va5._se.bootstrapPlayingAudioChannelPoolWatcher = function () {
    // TODO
    //  (se/run-playing-audiochannel-pool-watcher!)
  };

})(this);









// cache
(function(exports) {
  "use strict";
  var va5 = exports.va5;

  va5._cache = {};

  var loadedAudioSourceTable = {};
  var preloadRequestQueue = [];
  var loadingState = {};

  // deviceにurlを渡す直前でのみ、この処理を行う事
  // (device以外では、pathが汎用keyとして使われる為)
  va5._cache.appendQueryString = function (path) {
    if (path === null) { return path; }
    var aqs = va5.config["additional-query-string"];
    if (aqs === null) { return path; }
    var combinator = "?";
    if (0 <= path.indexOf("?")) { combinator = "&"; }
    return path + combinator + aqs;
  };

  // NB: まだ鳴っている最中に呼ばないようにする事
  //     (必要なら、unload!を呼ぶ前に再生を停止させておく事。
  //     この停止処理はcacheモジュール内では困難)
  va5._cache.unload = function (path) {
    // TODO
//(defn unload! [path]
//  (if (loaded? path)
//    ;; ロード済(ロードエラー含む)
//    (do
//      (when-let [as (get @loaded-audiosource-table path)]
//        (device/call! :dispose-audio-source! as)
//        (util/logging-verbose :unloaded path))
//      (swap! loaded-audiosource-table dissoc path))
//    ;; 未ロードもしくはロードキュー待ち
//    (do
//      ;; ロード待ち各種から消しておく
//      (when-let [info (get @loading-info-table path)]
//        (util/logging-verbose :unloaded path)
//        ;; ロード完了ハンドルを消す
//        ;; NB: 完了時にunload!してはいけない。
//        ;;     遅延実行なので次のload!とrace conditionを起こす可能性がある
//        (swap! loading-info-table
//               assoc path (assoc info :done-fn nil)))
//      (swap! preload-request-queue
//             #(remove (fn [p] (= path p)) %))))
//  true)
  };

  va5._cache.getAllPaths = function () {
    // TODO
  };

  va5._cache.isLoading = function (path) {
    if (loadingState["path"] === path) { return true; }
    for (var i = 0; i < preloadRequestQueue.length; i++) {
      if (path === preloadRequestQueue[i]) { return true; }
    }
    return false;
  };

  va5._cache.isLoaded = function (path) {
    return !!(path in loadedAudioSourceTable);
  };

  va5._cache.isError = function (path) {
    return !!(va5._cache.isLoaded(path) && !loadedAudioSourceTable[path]);
  };

  function makeDummyAs () {
    // TODO
    return {dummy:true};
  }

  // TODO: va4では実再生からも直で呼ばれる仕様となっていた。もう少し考える必要あり
  // TODO: unload等によってキャンセルできる必要がある。どうやってキャンセル可能にする？
  // - 正しく処理するには、キャンセル要求をキューに入れるしかないのでは…。つまりキューはpath保持だけでは駄目という事になる
  // - しかし…ローディングがキャンセルされた場合の扱いに問題があると思う
  function loadInternal (path, cont) {
    // TODO
  }

  // TODO: 可能なら、このロード回りは名前空間を分けたい(loading判定回りがcache側にあるので難しいかもしれないが)
  var isReservedExecutePreloadProcess = false;
  function executePreloadProcess () {
    if (!preloadRequestQueue.length) {
      isReservedExecutePreloadProcess = false;
      return;
    }
    isReservedExecutePreloadProcess = true;
    var path = preloadRequestQueue[0];
    loadInternal(path, function (as) {
      loadedAudioSourceTable[path] = as;
      // TODO: 本当にこのリクエストなのか確認してからshiftしないとまずい(cancel等でずれるケースがある)
      preloadRequestQueue.shift();
      window.setTimeout(function () {
        executePreloadProcess();
      }, 33);
    });
  }

  // プリロードを行う。プリロード要求は一旦キューに収められ、
  // 直列に逐次ロードされる事が保証される。
  // (並列に同時ロードになってネットワーク帯域を圧迫しないようにしている)
  va5._cache.load = function (path) {
    if (va5._cache.isLoaded(path)) { return; }
    if (!va5.device.isAvailable()) {
      // TODO: ロード済扱いにする必要がある！！！！！！
      loadedAudioSourceTable[path] = makeDummyAs();
      return;
    }
    if (va5._cache.isLoading(path)) { return; }
    preloadRequestQueue.push(path);
    if (!isReservedExecutePreloadProcess) { executePreloadProcess(); }
  };

  // unload等によって
  va5._cache.cancel = function (path) {
    // TODO
  };

})(this);




(function(exports) {
  "use strict";
  var va5 = exports.va5;

  var isInstalled = false;
  function init () {
    if (isInstalled) { return; }
    isInstalled = true;
    // NB: initする前に va5.device を差し替える事で、WebAudio以外の音源
    //     (例えばelectron等)にも対応できる。必要ならここでdeviceの差し替えを
    //     行えるようにしてもよい
    va5.device.init();
    va5._background.startSupervise(va5._bgm.syncBackground);
    va5._se.bootstrapPlayingAudioChannelPoolWatcher();
  }









  // 以下、export対象
  va5.init = init;

  va5.isAvailable = function () {
    init();
    return va5.device.isAvailable();
  }

  // NB: va4ではHtmlAudioを使って判定していたが、これだとiOSで問題がある
  //     http://qiita.com/gonshi_com/items/e41dbb80f5eb4c176108
  //     これを避けるにはHtmlAudioに頼らずに判定する必要があるが…どうする？
  //     dataurl等で最小のogg/mp3/m4aデータを保持してデコードできるか
  //     見るぐらいしかないが…。それならそもそもこの機能は不要では？
  //va5.canPlayMime = function (mime) {
  //  init();
  //  va5._outputErrorLog("not implemented yet"); // TODO
  //};
  //va5.canPlayOgg = function () { return va5.canPlayMime("audio/ogg"); };
  //va5.canPlayMp3 = function () { return va5.canPlayMime("audio/mpeg"); };
  //va5.canPlayM4a = function () { return va5.canPlayMime("audio/mp4"); };

  va5.playProto = function (path, opts) {
    va5._outputDebugLog(["called va5.playProto", path, opts]);
    init();
    // TODO: まずここに最小構成実装を行う。これはbgmでもseでもない奴になる…
    va5._cache.load(path);
    if (va5._cache.isError(path)) {
      va5._outputDebugLog(["failed to load", path]);
      return;
    }
    if (va5._cache.isLoaded(path) {
      va5._outputDebugLog(["play", path]);
      va5.device.playProto(path);
      return;
    }
    // TODO: 本当はもう少し小さい単位でリトライしたい(無駄にログがたくさん出ないようにしたい)。でも今はテストなのでこれで
    window.setTimeout(va5.playProto, 33);
  };

  va5.stopBgm = function (fadeSec, bgmCh) {
    va5._outputDebugLog(["called va5.stopBgm", fadeSec, bgmCh]);
    init();
    //引数の形式を変更した方がよいかもしれない
    va5._outputErrorLog("not implemented yet"); // TODO
  };
  va5.playBgm = function (path, opts) {
    va5._outputDebugLog(["called va5.playBgm", path, opts]);
    init();
    // TODO: 「今流してるoneshotのが終わったら次にこれを再生する」新オプションを追加する事
    va5._outputErrorLog("not implemented yet"); // TODO
  };
  va5.stopSe = function (fadeSec, seCh) {
    va5._outputDebugLog(["called va5.stopSe", fadeSec, seCh]);
    init();
    //引数の形式を変更した方がよいかもしれない
    va5._outputErrorLog("not implemented yet"); // TODO
  };
  va5.playSe = function (path, opts) {
    va5._outputDebugLog(["called va5.playSe", path, opts]);
    init();
    va5._outputErrorLog("not implemented yet"); // TODO
  };
  va5.stopVoice = function (fadeSec, voiceCh) {
    va5._outputDebugLog(["called va5.stopVoice", fadeSec, voiceCh]);
    init();
    //引数の形式を変更した方がよいかもしれない
    va5._outputErrorLog("not implemented yet"); // TODO
  };
  va5.playVoice = function (path, opts) {
    va5._outputDebugLog(["called va5.playVoice", path, opts]);
    va5._outputErrorLog("not implemented yet"); // TODO
  };
  va5.load = function (path) {
    va5._outputDebugLog(["called va5.load", path]);
    init();
    if (!va5.device.isAvailable()) {
      // TODO: ここで isLoaded() か isError() が真になるよう細工した方がよい(そうしないと、将来にPromiseを実装した時に問題になる)
      return;
    }
    va5._cache.load(path);
  };
  va5.unload = function (path) {
    va5._outputDebugLog(["called va5.unload", path]);
    init();
    va5._outputErrorLog("not implemented yet"); // TODO
//  (when-not (empty-path? path)
//    ;; NB: まだ鳴っている最中に呼ばないように、このタイミングでBGM/SEで
//    ;;     これを鳴らしているチャンネルがないかどうか調べ、
//    ;;     もしあれば即座に停止させる必要がある。
//    ;;     またrace condition注意だが、「対象が現在再生中のBGM」かつ
//    ;;     「フェードアウト中」かつ「次のBGMが予約済」かつ
//    ;;     「unload-all!からの呼び出しでない」全てを満たすのであれば、
//    ;;     BGMの停止後に「次のBGM」を再生する。
//    ;;     (可能ならこの処理は他のところと共通化したいが…)
//    (let [path (util/path-key->path path)
//          next-bgm-options (when-not dont-process-next-bgm?
//                             (doall
//                               (filter identity
//                                       (map (fn [[ch m]]
//                                              (and
//                                                @m
//                                                (= path (:path (:current-param @m)))
//                                                (neg? (:fade-delta @m))
//                                                (when-let [np (:next-param @m)]
//                                                  (assoc np :channel ch))))
//                                            @bgm/channel-state-table))))]
//      (bgm/stop-for-unload! path)
//      (se/unload! path)
//      (cache/unload! path)
//      (doseq [o next-bgm-options]
//        ;; TODO: 一瞬再生された後ですぐ止まってしまった。どうすればよい？
//        (bgm/play! (:path o) o))
//      true)))
  };
  va5.unloadAll = function () {
    va5._outputDebugLog("called va5.unloadAll");
    init();
    va5._outputErrorLog("not implemented yet"); // TODO
    // NB: こちらはunloadとは違い、全てのbgmとseを完全停止させる必要がある。
    //     完全停止させた後でまとめてunloadすればよい。
    // TODO: 上記の通り、まず先に全てのbgmとseを予約分含めて即座に完全停止
    va5._cache.getAllPaths().forEach(va5.unload);
  };
  // NB: これは「ロード完了したがエラーだった」時もtrueを返す事に注意
  //     (つまり「正常にロードが完了した」事を確認するにはisErrorも確認する事)
  // NB: unloadされるとfalseに戻る事にも注意
  va5.isLoaded = function (path) {
    return va5._cache.isLoaded(path);
  };
  va5.isError = function (path) {
    return va5._cache.isError(path);
  };



  // configのvolume系を変更し、現在鳴っているものにも即座に反映したい場合は
  // これを実行する事(実行しない場合は新しく鳴らしたものにのみ影響する)
  // TODO: bgmとse(とvoice)を分けるべき？
  va5.syncVolume = function () {
    va5._outputDebugLog("called va5.syncVolume");
    va5._outputErrorLog("not implemented yet"); // TODO
  };

  exports.va5 = va5;
})(this);
