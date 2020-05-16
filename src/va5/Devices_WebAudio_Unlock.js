(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Devices = va5.Devices || {}; va5.Devices = Devices;
  var device = Devices.WebAudio || {}; Devices.WebAudio = device;
  var Unlock = device.unlock || {}; device.Unlock = Unlock;


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


  var isInstalled = false;


  Unlock.install = function (ctx) {
    if (isInstalled) { return; }
    isInstalled = true;
    var isResumeRunning = false;
    var tryCount = 0;
    var tryMax = 10;
    function playSilence () { ctx.createBufferSource().start(0); }
    function doResume () {
      if (!ctx.resume) {
        // resume機能を持っていない。念の為無音再生してから終了する
        va5._logDebug(["registerTouchUnlockFn", "resume not found"]);
        playSilence();
        return true;
      }
      if (ctx.state !== "suspended") {
        // 既にunlock済。念の為無音再生してから終了する
        va5._logDebug(["registerTouchUnlockFn", "done"]);
        playSilence();
        return true;
      }
      if (isResumeRunning) {
        // 既にresume実行中で終了を待っている場合は、次回またチェックする
        va5._logDebug(["registerTouchUnlockFn", "waiting"]);
        return false;
      }
      if (tryMax < tryCount) {
        // 一定回数リトライした。諦める。一応無音再生はしておく
        va5._logDebug(["registerTouchUnlockFn", "give up"]);
        playSilence();
        return true;
      }
      // resumeを実行する
      va5._logDebug(["registerTouchUnlockFn", "try to resume"]);
      tryCount++;
      isResumeRunning = true;
      ctx.resume().then(
        function () {
          va5._logDebug(["registerTouchUnlockFn", "succeeded to resume"]);
          isResumeRunning = false;
          // NB: これが効くかは分からない(thenによりイベント外扱いになる為)。
          //     なのでこの後にも再度playSilence()する。
          //     ただアンロックは可能な限り早く行いたいので、
          //     ここでもplaySilence()は行っておく
          playSilence();
        },
        function () {
          va5._logDebug(["registerTouchUnlockFn", "failed to resume"]);
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
