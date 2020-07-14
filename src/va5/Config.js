(function(exports) {
  "use strict";
  var va5 = exports.va5 || {}; exports.va5 = va5;
  var Config = va5.Config || {}; va5.Config = Config;


  var definitionTable = {};
  var valueTable = {};


  // validatorはsetConfig()で渡ってきたvをチェック＆整形するもの。
  // updateHandleはsetConfig()で値が変更された時に呼び出される。
  function defineConfig (k, initialValue, validator, updateHandle) {
    var d = {};
    d.validator = validator
    d.updateHandle = updateHandle;
    definitionTable[k] = d;
    // 初期値のセットもここで行っておく
    valueTable[k] = initialValue;
  }


  defineConfig("is-output-error-log", true, function (newV, oldV) {
    return !!newV;
  }, null);

  defineConfig("is-output-debug-log", false, function (newV, oldV) {
    return !!newV;
  }, null);

  defineConfig("volume-master", 0.8, function (newV, oldV) {
    newV = va5._validateNumber("volume-master", 0, newV, 1, null);
    return (newV == null) ? oldV : newV;
  }, function (v) {
    if (!va5._device) { return; }
    va5._device.setVolumeMaster(v);
  });

  defineConfig("volume-bgm", 0.5, function (newV, oldV) {
    newV = va5._validateNumber("volume-bgm", 0, newV, 1, null);
    return (newV == null) ? oldV : newV;
  }, function (v) {
    va5.Bgm.setBaseVolume(v);
  });

  defineConfig("volume-se", 0.5, function (newV, oldV) {
    newV = va5._validateNumber("volume-se", 0, newV, 1, null);
    return (newV == null) ? oldV : newV;
  }, function (v) {
    va5.Se.setBaseVolume(v);
  });

  defineConfig("volume-voice", 0.5, function (newV, oldV) {
    newV = va5._validateNumber("volume-voice", 0, newV, 1, null);
    return (newV == null) ? oldV : newV;
  }, function (v) {
    va5.Bgm.setBaseVolumeVoice(v);
  });

  defineConfig("default-bgm-fade-sec", 1, function (newV, oldV) {
    newV = va5._validateNumber("default-bgm-fade-sec", 0, newV, null);
    return (newV == null) ? oldV : newV;
  }, null);

  defineConfig("default-se-fade-sec", 0, function (newV, oldV) {
    newV = va5._validateNumber("default-se-fade-sec", 0, newV, null);
    return (newV == null) ? oldV : newV;
  }, null);

  defineConfig("default-voice-fade-sec", 0.1, function (newV, oldV) {
    newV = va5._validateNumber("default-voice-fade-sec", 0, newV, null);
    return (newV == null) ? oldV : newV;
  }, null);

  defineConfig("is-pause-on-background", true, function (newV, oldV) {
    return !!newV;
  }, null);

  defineConfig("is-unload-automatically-when-finished-bgm", false, function (newV, oldV) {
    return !!newV;
  }, null);

  defineConfig("se-chattering-sec", 0.05, function (newV, oldV) {
    newV = va5._validateNumber("se-chattering-sec", 0, newV, null);
    return (newV == null) ? oldV : newV;
  }, null);

  defineConfig("is-use-dumb-mode-forcibly", false, function (newV, oldV) {
    return !!newV;
  }, null);

  defineConfig("additional-query-string", null, function (newV, oldV) {
    // 悩んだ結果、これはassertもstringifyも行わない事にした
    // (Date.now()のような、数値である事が重要なケースが稀にあるし、
    // nullにも「この機能を使わない」という意味がある為)
    // なお自動ではuriエスケープされないのでその点に注意する事
    return newV;
  }, null);


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
