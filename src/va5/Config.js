(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Config = va5.Config || {}; va5.Config = Config;


  var definitionTable = {};
  var valueTable = {};


  // validatorはsetConfig()で渡ってきたvをチェック＆整形するもの。
  // updateHandleはsetConfig()で値が変更された時に呼び出される。
  function defineConfig (k, initialValue, validator, updateHandle) {
    definitionTable[k] = {
      validator: validator,
      updateHandle: updateHandle
    };
    // 初期値のセットもここで行っておく
    valueTable[k] = initialValue;
  }


  // ----------------------------------------------------------------


  /**
   * va5.getConfig("is-output-error-log")
   * 真なら、何らかのエラーがあった場合にその内容をコンソールに出力する。
   * デフォルト値true。
   * @name getConfigOption
   */
  defineConfig("is-output-error-log", true, function (newV, oldV) {
    return !!newV;
  }, null);

  /**
   * va5.getConfig("is-output-debug-log")
   * 真なら、非常に細かい動作情報ログをコンソールに出力する。
   * デフォルト値false。
   * @name getConfigOption
   */
  defineConfig("is-output-debug-log", false, function (newV, oldV) {
    return !!newV;
  }, null);

  /**
   * va5.getConfig("volume-master")
   * va5のあらゆる再生の音量倍率。変更すると即座に反映される。
   * デフォルト値0.8。
   * @name getConfigOption
   */
  defineConfig("volume-master", 0.8, function (newV, oldV) {
    newV = va5._validateNumber("volume-master", 0, newV, 1, null);
    return (newV == null) ? oldV : newV;
  }, function (v) {
    if (!va5._device) { return; }
    va5._device.setVolumeMaster(v);
  });

  /**
   * va5.getConfig("volume-bgm")
   * va5.bgm()全体の音量倍率。変更すると即座に反映される。
   * デフォルト値0.5。
   * @name getConfigOption
   */
  defineConfig("volume-bgm", 0.5, function (newV, oldV) {
    newV = va5._validateNumber("volume-bgm", 0, newV, 1, null);
    return (newV == null) ? oldV : newV;
  }, function (v) {
    va5.Bgm.setBaseVolume(v);
  });

  /**
   * va5.getConfig("volume-se")
   * va5.se()全体の音量倍率。変更すると即座に反映される。
   * デフォルト値0.5。
   * @name getConfigOption
   */
  defineConfig("volume-se", 0.5, function (newV, oldV) {
    newV = va5._validateNumber("volume-se", 0, newV, 1, null);
    return (newV == null) ? oldV : newV;
  }, function (v) {
    va5.Se.setBaseVolume(v);
  });

  /**
   * va5.getConfig("volume-voice")
   * va5.voice()全体の音量倍率。変更すると即座に反映される。
   * デフォルト値0.5。
   * @name getConfigOption
   */
  defineConfig("volume-voice", 0.5, function (newV, oldV) {
    newV = va5._validateNumber("volume-voice", 0, newV, 1, null);
    return (newV == null) ? oldV : newV;
  }, function (v) {
    va5.Bgm.setBaseVolumeVoice(v);
  });

  /**
   * va5.getConfig("default-bgm-fade-sec")
   * BGMをフェードアウト終了させる際のデフォルトのフェード秒数。
   * デフォルト値1。
   * @name getConfigOption
   */
  defineConfig("default-bgm-fade-sec", 1, function (newV, oldV) {
    newV = va5._validateNumber("default-bgm-fade-sec", 0, newV, null);
    return (newV == null) ? oldV : newV;
  }, null);

  /**
   * va5.getConfig("default-se-fade-sec")
   * SEをフェードアウト終了させる際のデフォルトのフェード秒数。
   * デフォルト値0。
   * @name getConfigOption
   */
  defineConfig("default-se-fade-sec", 0, function (newV, oldV) {
    newV = va5._validateNumber("default-se-fade-sec", 0, newV, null);
    return (newV == null) ? oldV : newV;
  }, null);

  /**
   * va5.getConfig("default-voice-fade-sec")
   * Voiceをフェードアウト終了させる際のデフォルトのフェード秒数。
   * デフォルト値0.1。
   * @name getConfigOption
   */
  defineConfig("default-voice-fade-sec", 0.1, function (newV, oldV) {
    newV = va5._validateNumber("default-voice-fade-sec", 0, newV, null);
    return (newV == null) ? oldV : newV;
  }, null);

  /**
   * va5.getConfig("is-pause-on-background")
   * これが真値ならタブがバックグラウンドになった際にBGMを停止します。
   * デフォルト値false。
   * @name getConfigOption
   */
  defineConfig("is-pause-on-background", false, function (newV, oldV) {
    return !!newV;
  }, null);

  /**
   * va5.getConfig("is-unload-automatically-when-finished-bgm")
   * これが真値ならbgm終了時に自動的に va5.unloadIfUnused() を実行します。
   * デフォルト値false。
   * @name getConfigOption
   */
  defineConfig("is-unload-automatically-when-finished-bgm", false, function (newV, oldV) {
    return !!newV;
  }, null);

  /**
   * va5.getConfig("se-chattering-sec")
   * 同一SEがこの秒数以内に連打された場合は再生を抑制する。
   * デフォルト値0.05。
   * @name getConfigOption
   */
  defineConfig("se-chattering-sec", 0.05, function (newV, oldV) {
    newV = va5._validateNumber("se-chattering-sec", 0, newV, null);
    return (newV == null) ? oldV : newV;
  }, null);

  /**
   * va5.getConfig("is-use-dumb-mode-forcibly")
   * 常にDumbモード(無音モード)で起動する。デバッグ用。
   * デフォルト値false。
   * @name getConfigOption
   */
  defineConfig("is-use-dumb-mode-forcibly", false, function (newV, oldV) {
    return !!newV;
  }, null);

  /**
   * va5.getConfig("additional-query-string")
   * pathをロードする際に自動的にこの文字列をQUERY_STRINGとして付与する。
   * なお自動ではuriエスケープされないのでその点に注意する事。
   * デフォルト値null。
   * @name getConfigOption
   */
  defineConfig("additional-query-string", null, function (newV, oldV) {
    // 悩んだ結果、これはassertもstringifyも行わない事にした
    // (Date.now()のような、数値である事が重要なケースが稀にあるし、
    // nullにも「この機能を使わない」という意味がある為)
    return newV;
  }, null);


  // ----------------------------------------------------------------


  function resolveDefinition (k) {
    var definition = definitionTable[k];
    if (!definition) {
      va5._logError(["found unknown config key", k, ". valid keys are", Object.keys(definitionTable)]);
    }
    return definition;
  }

  Config.get = function (k) {
    if (!resolveDefinition(k)) { return null; }
    return valueTable[k];
  };


  Config.set = function (k, v) {
    var definition = resolveDefinition(k);
    if (!definition) { return; }
    var oldValue = valueTable[k];
    var newValue = definition.validator(v, oldValue);
    if (oldValue == newValue) { return; }
    valueTable[k] = newValue;
    if (definition.updateHandle) {
      definition.updateHandle(newValue);
    }
    return;
  };


})(this);
