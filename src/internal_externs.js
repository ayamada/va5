// NB: このファイルには、表向きにはexternしないものの、
//     内部でfoo.bar形式のアクセスとfoo["bar"]形式のアクセスが
//     混在せざるをえないもの、およびそれに近い扱いのものをリストアップする

var tmp = {};

// device params
tmp.as;
tmp.volume;
tmp.pitch;
tmp.pan;
tmp.loopStartSec;
tmp.loopEndSec;
tmp.playStartSec;
tmp.playEndSec;
tmp.sourceNode;
tmp.gainNode;
tmp.pannerNodeType;
tmp.pannerNode;
tmp.replayStartTimestamp;
tmp.replayStartPos;
tmp.playPausedPos;
tmp.playStartedTimestamp;
tmp.playEndedTimestamp;
tmp.isSleepingStart;
tmp.isNeedFinishImmediately;
// 以下はexternしなくても安全だが、将来更新時に危険になる可能性は常にあるので
// リストアップしておく
tmp.disposed;
tmp.buf;

// loop/play params
tmp.loopStartSec;
tmp.loopEndSec;
tmp.loopLengthSec;
tmp.loopStart;
tmp.loopEnd;
tmp.loopLength;
tmp.playStartSec;
tmp.playEndSec;
tmp.playLengthSec;
tmp.playStart;
tmp.playEnd;
tmp.playLength;

// other common params
tmp.volume;
tmp.pitch;
tmp.pan;
tmp.isAdoptLoopStartSec;
tmp.isAdoptLoopEndSec;
tmp.isAdoptLoopLengthSec;
tmp.isAdoptPlayStartSec;
tmp.isAdoptPlayEndSec;
tmp.isAdoptPlayLengthSec;

// other common params (2)
tmp.loopStartSecTrue;
tmp.loopEndSecTrue;
tmp.playStartSecTrue;
tmp.playEndSecTrue;

// Se params
tmp.channel;
tmp.path;
tmp.isAlarm;
tmp.volumeTrue;
tmp.as;
tmp.playingState;
tmp.loading;
tmp.fading;
tmp.cancelled;

// Bgm params
tmp.disposed;
tmp.path;
tmp.volumeTrue;
tmp.transitionMode;
tmp.fadeinSec;
tmp.fadeVolume;
tmp.fadeEndVolume;
tmp.fadeDeltaPerSec;
tmp.as;
tmp.playingState;
tmp.isLoading;
tmp.isSleep;
tmp.isCancelled;


