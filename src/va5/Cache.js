(function(exports) {
  "use strict";
  var va5 = (function (k) {
    va5 = exports[k] || {}; exports[k] = va5; return va5;
  })(("[object Object]" !== exports.toString()) ? "va5" : "exports");
  var Cache = va5.Cache || {}; va5.Cache = Cache;


  // deviceにurlを渡す直前でのみ、この処理を行う事
  // (device以外では、pathが汎用keyとして使われる為)
  function appendQueryString (path) {
    var aqs = va5.getConfig("additional-query-string");
    if (aqs == null) { return path; }
    var combinator = "?";
    if (0 <= path.indexOf("?")) { combinator = "&"; }
    return path + combinator + aqs;
  };


  // 直にbufを扱う為の情報
  var bufKeyPrefix = "localbuf://";


  // ロードが完了したpathとasのテーブル
  var loadedAudioSourceTable = {};
  // ロード待ちキュー。先頭が現在処理中のエントリ。
  // エントリはObjectで、様々な状態が入る(unloadによってキャンセルされた等)
  var preloadRequestQueue = [];


  // とてもややこしいローディング状態のライフサイクルメモ：
  // - A: 未ロードかつロード要求なし(初期状態)
  // - A2: キャンセル(unload)された。基本的にはAと同じ扱い
  //   ↓
  // - B: ロード要求がキューに入っている(ロード待ち)
  // - B2: ロード要求がキューに入っている(ロード待ち)、しかしキャンセルされた
  //   ↓
  // - C: ローディング処理中
  // - C2: ローディング処理中、しかしキャンセルされた
  //   ↓
  // - D: ロード完了かつ正常終了
  // - D2: ロード完了かつエラー終了
  // - D3: ロード完了したがキャンセルされた。A2へ
  //   ↓
  // - unloadされたらA2へ
  //
  // 大雑把には、
  // A(初期状態/unload)、B(ロード待ち)、C(ロード中)、D(ロード完了)
  // という区分になる。
  // - Cache.isLoading(path) => B/C系なら真
  // - Cache.isLoaded(path) => D/D2なら真(※D3はA2扱い、要注意！)
  // - Cache.isError(path) => D2の時のみ真
  // - Cache.isCancelled(path) => A系なら真


  Cache.isLoading = function (path) {
    // キュー内にあればローディング待ちもしくはローディング中
    for (var i = 0; i < preloadRequestQueue.length; i++) {
      var entry = preloadRequestQueue[i];
      if ((path === entry.path) && !entry.isCancelled) {
        return true;
      }
    }
    return false;
  };


  Cache.isLoaded = function (path) {
    // loadedAudioSourceTable内にエントリがあれば、ロードは完了している
    // (ただし成功か失敗かは分からない)
    return !!(path in loadedAudioSourceTable);
  };


  Cache.isError = function (path) {
    // ロード完了かつasなしなら、ロードはエラー終了した
    return !!(Cache.isLoaded(path) && !loadedAudioSourceTable[path]);
  };


  Cache.isCancelled = function (path) {
    // ローディング中でもロード完了でもないならキャンセルもしくはunloadされた。
    // この判定は実はAにも相当する。問題はない筈だが一応注意
    return !!(!Cache.isLoading(path) && !Cache.isLoaded(path));
  };


  // unload等によってローディングをキャンセルしたい時に呼ぶ
  function cancelLoading (path) {
    preloadRequestQueue.forEach(function (entry) {
      if (path === entry.path) {
        entry.isCancelled = true;
      }
      // NB: ここでは即座にキューを消化してはならない！
      //     キューは必ず順番に処理していく必要がある。
      //     contの実行もキューの順に行わなくてはならない。
      //     (キュー消化のタイミングでcontを実行しなくてはならない)
    });
  }


  // unloadAllの為に、ロード済/ローディング中/ロード待ちの全pathを取得
  Cache.getAllPaths = function () {
    var loadedPaths = Object.keys(loadedAudioSourceTable);
    var loadingPaths = preloadRequestQueue.filter(function (entry) {
      return !entry.isCancelled;
    }).map(function (entry) {
      return entry.path;
    }).filter(function (path) {
      return !(path in loadedAudioSourceTable);
    });
    return loadedPaths.concat(loadingPaths);
  };


  // NB: まだ鳴っている最中に呼ばないようにする事。
  //     必要なら、unloadを呼ぶ前にこのpathに対する全ての再生を
  //     完全停止させておく事！
  Cache.unload = function (path) {
    if (path == null) { return; }
    path = va5._validatePath(path);
    if (path == null) { return; }
    cancelLoading(path);
    if (Cache.isLoaded(path)) {
      var as = loadedAudioSourceTable[path];
      va5._device.disposeAudioSource(as);
      delete loadedAudioSourceTable[path];
    }
  };


  Cache.unloadIfUnused = function (path) {
    if ((typeof path) !== "string") { return; }
    if (Cache.isLoading(path)) { return; }
    if (va5.Se.hasReference(path)) { return; }
    if (va5.Bgm.hasReference(path)) { return; }
    // loadBufされたものならunloadしない事になった
    if (path.indexOf(bufKeyPrefix) === 0) { return; }
    Cache.unload(path);
  };


  var isRunningPreloadProcess = false;
  function preloadProcess () {
    isRunningPreloadProcess = true;
    while (true) {
      if (!preloadRequestQueue.length) {
        isRunningPreloadProcess = false;
        return;
      }
      var entry = preloadRequestQueue[0];
      var path = entry.path;
      var cont = entry.cont;
      if (entry.isCancelled) {
        preloadRequestQueue.shift();
        if (cont) { cont(null); }
        continue;
      }
      if (Cache.isLoaded(path)) {
        preloadRequestQueue.shift();
        if (cont) { cont(loadedAudioSourceTable[path]); }
        continue;
      }
      va5._device.loadAudioSource(appendQueryString(path), function (as) {
        preloadRequestQueue.shift();
        loadedAudioSourceTable[path] = as;
        if (cont) { cont(as); }
        window.setTimeout(preloadProcess, 33);
      });
      break;
    }
  }


  Cache.loadBuf = function (buf) {
    if (buf == null) { return; }
    while (true) {
      // NB: 現状だとdigestを取れないので乱数で生成するだけとした
      //var digest = ...
      //var path = bufKeyPrefix + digest;
      //if (Cache.isLoaded(path)) { return path; }
      var digest = Math.random().toString(32).slice(2);
      var path = bufKeyPrefix + digest;
      if (Cache.isLoaded(path)) { continue; } // 衝突したら作り直す
      var as = va5._device.bufToAudioSource(buf);
      loadedAudioSourceTable[path] = as;
      return path;
    }
  };

  // プリロードを行う。プリロード要求は一旦キューに収められ、
  // 直列に逐次ロードされる事が保証される。
  // (並列に同時ロードになってネットワーク帯域を圧迫しないようにしている)
  // ロードが完了するとcontが実行される。既にロード済なら即座に実行される。
  // 引数としてasが渡されるが、asではなくnullになるパターンが二通りある。
  // 一つは、ロードがエラーで終わった場合。
  // もう一つは、unloadによってキャンセルされた場合。
  // 通常loadはこの後にplayする為に実行するので、
  // どちらの場合であってもplayをスキップすればよい。
  Cache.load = function (path, cont) {
    if (path == null) { cont(null); return; }
    path = va5._validatePath(path);
    if (path == null) { cont(null); return; }
    if (path.indexOf(bufKeyPrefix) === 0) {
      // NB: 例外を投げるかはとても迷う
      //throw new Error("cannot load buf path: " + path);
      va5._logError(["cannot load buf path", path]);
      cont(null);
      return;
    }
    var entry = {
      path: path,
      cont: cont,
      isCancelled: false
    };
    // キャンセル要求が間に入る事があるので、ロード済であっても必ず
    // 一旦キューに入れてから処理する
    // (キューが空かつロード済ならpreloadProcess()で即座に実行される)
    preloadRequestQueue.push(entry);
    if (!isRunningPreloadProcess) { preloadProcess(); }
  };


  Cache.getDuration = function (path) {
    if (path == null) { return null; }
    var as = loadedAudioSourceTable[path];
    if (!as) { return null; }
    return va5._device.audioSourceToDuration(as);
  };


  Cache.getSampleRate = function (path) {
    if (path == null) { return null; }
    var as = loadedAudioSourceTable[path];
    if (!as) { return null; }
    return va5._device.audioSourceToSampleRate(as);
  };


})(this);
