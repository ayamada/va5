(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;

  // ここにはexport対象のみを定義する

  va5.init = va5.Init.init;

  va5.isAvailable = function () {
    va5.init();
    return va5.device.isAvailable();
  }

//  va5.playProto = function (path, opts) {
//    va5._outputDebugLog(["called va5.playProto", path, opts]);
//    init();
//    // TODO: まずここに最小構成実装を行う。これはbgmでもseでもない奴になる…
//    va5._cache.load(path);
//    if (va5._cache.isError(path)) {
//      va5._outputDebugLog(["failed to load", path]);
//      return;
//    }
//    if (va5._cache.isLoaded(path) {
//      va5._outputDebugLog(["play", path]);
//      va5.device.playProto(path);
//      return;
//    }
//    // TODO: 本当はもう少し小さい単位でリトライしたい(無駄にログがたくさん出ないようにしたい)。でも今はテストなのでこれで
//    window.setTimeout(va5.playProto, 33);
//  };
//
//  va5.stopBgm = function (fadeSec, bgmCh) {
//    va5._outputDebugLog(["called va5.stopBgm", fadeSec, bgmCh]);
//    init();
//    //引数の形式を変更した方がよいかもしれない
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.playBgm = function (path, opts) {
//    va5._outputDebugLog(["called va5.playBgm", path, opts]);
//    init();
//    // TODO: 「今流してるoneshotのが終わったら次にこれを再生する」新オプションを追加する事
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.stopSe = function (fadeSec, seCh) {
//    va5._outputDebugLog(["called va5.stopSe", fadeSec, seCh]);
//    init();
//    //引数の形式を変更した方がよいかもしれない
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.playSe = function (path, opts) {
//    va5._outputDebugLog(["called va5.playSe", path, opts]);
//    init();
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.stopVoice = function (fadeSec, voiceCh) {
//    va5._outputDebugLog(["called va5.stopVoice", fadeSec, voiceCh]);
//    init();
//    //引数の形式を変更した方がよいかもしれない
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.playVoice = function (path, opts) {
//    va5._outputDebugLog(["called va5.playVoice", path, opts]);
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
//  va5.load = function (path) {
//    va5._outputDebugLog(["called va5.load", path]);
//    init();
//    if (!va5.device.isAvailable()) {
//      // TODO: ここで isLoaded() か isError() が真になるよう細工した方がよい(そうしないと、将来にPromiseを実装した時に問題になる)
//      return;
//    }
//    va5._cache.load(path);
//  };
//  va5.unload = function (path) {
//    va5._outputDebugLog(["called va5.unload", path]);
//    init();
//    va5._outputErrorLog("not implemented yet"); // TODO
////  (when-not (empty-path? path)
////    ;; NB: まだ鳴っている最中に呼ばないように、このタイミングでBGM/SEで
////    ;;     これを鳴らしているチャンネルがないかどうか調べ、
////    ;;     もしあれば即座に停止させる必要がある。
////    ;;     またrace condition注意だが、「対象が現在再生中のBGM」かつ
////    ;;     「フェードアウト中」かつ「次のBGMが予約済」かつ
////    ;;     「unload-all!からの呼び出しでない」全てを満たすのであれば、
////    ;;     BGMの停止後に「次のBGM」を再生する。
////    ;;     (可能ならこの処理は他のところと共通化したいが…)
////    (let [path (util/path-key->path path)
////          next-bgm-options (when-not dont-process-next-bgm?
////                             (doall
////                               (filter identity
////                                       (map (fn [[ch m]]
////                                              (and
////                                                @m
////                                                (= path (:path (:current-param @m)))
////                                                (neg? (:fade-delta @m))
////                                                (when-let [np (:next-param @m)]
////                                                  (assoc np :channel ch))))
////                                            @bgm/channel-state-table))))]
////      (bgm/stop-for-unload! path)
////      (se/unload! path)
////      (cache/unload! path)
////      (doseq [o next-bgm-options]
////        ;; TODO: 一瞬再生された後ですぐ止まってしまった。どうすればよい？
////        (bgm/play! (:path o) o))
////      true)))
//  };
//  va5.unloadAll = function () {
//    va5._outputDebugLog("called va5.unloadAll");
//    init();
//    va5._outputErrorLog("not implemented yet"); // TODO
//    // NB: こちらはunloadとは違い、全てのbgmとseを完全停止させる必要がある。
//    //     完全停止させた後でまとめてunloadすればよい。
//    // TODO: 上記の通り、まず先に全てのbgmとseを予約分含めて即座に完全停止
//    va5._cache.getAllPaths().forEach(va5.unload);
//  };
//  // NB: これは「ロード完了したがエラーだった」時もtrueを返す事に注意
//  //     (つまり「正常にロードが完了した」事を確認するにはisErrorも確認する事)
//  // NB: unloadされるとfalseに戻る事にも注意
//  va5.isLoaded = function (path) {
//    return va5._cache.isLoaded(path);
//  };
//  va5.isError = function (path) {
//    return va5._cache.isError(path);
//  };
//
//
//
//  // configのvolume系を変更し、現在鳴っているものにも即座に反映したい場合は
//  // これを実行する事(実行しない場合は新しく鳴らしたものにのみ影響する)
//  // TODO: bgmとse(とvoice)を分けるべき？
//  va5.syncVolume = function () {
//    va5._outputDebugLog("called va5.syncVolume");
//    va5._outputErrorLog("not implemented yet"); // TODO
//  };
})(this);
