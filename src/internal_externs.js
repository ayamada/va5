// NB: このファイルには、表向きにはexternしないものの、
//     内部でfoo.bar形式のアクセスとfoo["bar"]形式のアクセスが
//     混在せざるをえないもの、およびそれに近い扱いのものをリストアップする

var va5 = {};

// device params
va5.as;
va5.volume;
va5.pitch;
va5.pan;
va5.loopStartSec;
va5.loopEndSec;
va5.playStartSec;
va5.playEndSec;
va5.sourceNode;
va5.gainNode;
va5.pannerNodeType;
va5.pannerNode;
va5.replayStartTimestamp;
va5.replayStartPos;
va5.playPausedPos;
va5.playStartedTimestamp;
va5.playEndedTimestamp;
va5.isSleepingStart;
va5.isNeedFinishImmediately;
// 以下はexternしなくても安全だが、将来更新時に危険になる可能性は常にあるので
// 念の為リストアップしておく
va5.disposed;
va5.buf;

// loop/play params
va5.loopStartSec;
va5.loopEndSec;
va5.loopLengthSec;
va5.loopStart;
va5.loopEnd;
va5.loopLength;
va5.playStartSec;
va5.playEndSec;
va5.playLengthSec;
va5.playStart;
va5.playEnd;
va5.playLength;

// other common params
va5.volume;
va5.pitch;
va5.pan;
va5.isAdoptLoopStartSec;
va5.isAdoptLoopEndSec;
va5.isAdoptLoopLengthSec;
va5.isAdoptPlayStartSec;
va5.isAdoptPlayEndSec;
va5.isAdoptPlayLengthSec;

// other common params (2)
va5.loopStartSecTrue;
va5.loopEndSecTrue;
va5.playStartSecTrue;
va5.playEndSecTrue;

// Se params
va5.channel;
va5.path;
va5.isAlarm;
va5.volumeTrue;
va5.as;
va5.playingState;
va5.loading;
va5.fading;
va5.cancelled;

// Bgm params
va5.disposed;
va5.path;
va5.volumeTrue;
va5.transitionMode;
va5.fadeinSec;
va5.fadeVolume;
va5.fadeEndVolume;
va5.fadeDeltaPerSec;
va5.as;
va5.playingState;
va5.isLoading;
va5.isSleep;
va5.isCancelled;


