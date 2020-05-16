# va5 開発メモ

## 開発手順

TODO

```
python -m http.server 8001
```

でサーバ起動、
http://localhost:8001/dev/dev.html
を開いて動作確認


## リリース手順

TODO


## TODO

- android実機およびiOSエミュでの動作確認を取る
    - タッチのみで動作確認が取れるところまで実装を進める事

- Promise を返す、load() のラッパーを用意
    - Promiseを返すようにしたくはあるのだが、当初はなしにし、後で余裕のある時に実装する事に。以下がその理由
        - Promiseが存在しない環境(ieおよび古いiOS)がありえる事
        - 「非対応環境では音が出ない」は普通に許されるが「例外が投げられて動作に支障が出る」「thenが実行されない」というのはかなり許されない。具体的にはWebAudioを持たないie等の環境であっても「load()を実行したらthenが実行される」という部分は必須となってしまう(Promiseを返す仕様にするのであれば)
        - なるべく他のライブラリに頼らないようにしたいので既存のpolyfillを導入したくない
        - つまり、Promiseを返すようにしたいのであれば(ie等の環境専用の)自前のpolyfill実装が必要となる。面倒な割に報われない作業なので後回しにする
    - 名前は loadP() とかでいいと思う。また、これが必要なのはload()のみの想定
        - 他に「完了を待ちたい」処理としてplay系があるものの、これはdumb環境だと一瞬で終わらせる以外になく、それは望ましい挙動ではないが他にどうしようもない(durationが取れないので「音源の長さだけ待つ」事すらできない)ので、最初からPromise版は提供しない方向とするしかない。loadについては一瞬で終わっても何の問題もないのでPromise版を提供したい


## オンラインデモのリリースビルド生成およびデプロイ手順

TODO

(src/va5_version.jsの更新)

(最終的には cat src/va5/*.js とかで一つのファイルにする)

(gccのoptimizationsでmin化。externs対象は「va5直下の小文字で始まるエントリ」のみとなる。「大文字で始まるエントリ」は(extern対象でない)クラス名なので注意。トップレベル汚染はva5キーのみ)


## 仕様メモ

- va5での新仕様
    - jsのみ
    - ビルドはMakefileかshスクリプトかなんかで行う。webpackは使わない
        - gccのoptimizationsで圧縮する。externsファイルも用意する
    - deviceレイヤの分離はva4同様に行うが、HtmlAudio対応はしない。WebAudioとdumbのみ用意する
        - 将来にelectron対応等しやすいようにしておく
    - ie非対応。無音で通す
        - edgeについては一応通す
            - edgeでdecodeに失敗する可能性のある可変ビットレートmp3は諦める。m4a推奨とする
    - 古いスマホ非対応。無音で通す
        - どう判定するかが問題。WebAudio非対応なら問題ないが、中途半端に対応している時期のものが問題になる
    - 音源のfallback(wildcard)指定は廃止。指定した音源が再生できないものだった場合は無音で通す
        - 推奨形式はm4a。次点で固定ビットレートのmp3。ogg等は再生できない環境があるという事が分かっているなら指定できる(electron実行のみ等で)

- va4から引き継ぐべき仕様について
    - va4の各種バッドノウハウ対策を組み込む
    - https://qiita.com/zprodev/items/7fcd8335d7e8e613a01f - にあるリーク対策等を組み込む


## 一時メモ




とりあえずdev.htmlが動くようにしていく。具体的にはどこから作っていく？


- pathからasを生成するところ
    - asの形式は？
        - 生buf？
            - 基本これだけでよいのだけど、デバッグ時に不便になりそうな気がするので、薄いObjectでラッピングする事に
    - ここはロードが絡むので非同期にせざるをえない。形式を考える事
        - 引数としてcontを渡すしかない(Promiseは使えない可能性がある)
    - インターフェースは？
        - ...
- asから再生stateを生成して再生するところ
    - インターフェースは？
        - ...






インターフェース関数メモ

- 所属不明
    - va5.getLength(path) NB: 単位はsec。ロード済でない場合はnullが返る
    - va5.getBgmPosition(bgmCh, isIncludeLoopAmount) TODO: 要検討
    - va5.makePlaySePeriodically(intervalSec, path, opts) TODO: 要検討。高階関数なので扱いが分かりづらい
    - va5.makePlaySePersonally(fadeSec) TODO: 要検討。高階関数なので扱いが分かりづらい

- 再生/停止
    - va5.stopBgm(fadeSec, bgmCh)
        - 引数の形式を変更した方がよいかもしれない
    - va5.playBgm(path, opts)
        - va4にあった bgmOneshot bgmFadein は廃止(optsで指定可能なので)
        - va4にあった me bgs は廃止(chを明示的に指定すればすむ話なので)
        - 新オプションとして「今流してるoneshotのが終わったら次にこれを再生する」オプションを追加
        - 新オプションとして「ループポイント指定」オプションを追加する？しない？
    - va5.stopSe(fadeSec, seCh)
        - 引数の形式を変更した方がよいかもしれない
    - va5.playSe(path, opts)
    - va5.alarm(path, opts)
        - これも廃止してよいかも(optsで指定可能にする方向で)
- プリロード関連
    - va5.load(path)
    - va5.unload(path)
    - va5.unloadAll()
    - va5.isLoaded(path)
    - va5.isError(path)
- その他、ユーティリティ等
    - va5.??? (旧hasTerminalType) TODO: 名前を考える事
        - この判定はよくないのでは？
        - 今回判定して弾く必要があるのは「ie/edge」系のみなので、それだけ専用判定を持てばよいのでは？
            - しかし他にも要求される部分があるかも…。ただ window.navigator.userAgent での判定は完全に正確にはならないので、そもそも頼るべきではない
        - 「古いモバイル環境だと強制オフにする」必要があるが、その判定をどうやるかも問題。これで判定するのはまずいのでは…
    - va5.device.name => "WebAudio"
    - va5.getLength(path) NB: 単位はsec。ロード済でない場合はnullが返る
    - va5.getBgmPosition(bgmCh, isIncludeLoopAmount) TODO: 要検討
    - va5.makePlaySePeriodically(intervalSec, path, opts) TODO: 要検討。高階関数なので扱いが分かりづらい
    - va5.makePlaySePersonally(fadeSec) TODO: 要検討。高階関数なので扱いが分かりづらい



- BGM再生コマンドのオプション指定について
    - volume 基準ボリューム。基本は[0.0-1.0]だが1以上を指定してもよい(マスターボリューム等が小さい時にのみ意味がある)
    - pitch
    - pan
    - oneshot?
        - keyをどうするか考える必要あり
    - fadein
        - keyをどうするか考える必要あり
    - start-position
    - loop-start, loop-end
        - 実装するか悩む
    - channel

- SE再生コマンドのオプション指定について
    - volume
    - pitch
    - pan
    - channel TODO: これは元々はなかった。でも「古いSEを即座に停止して新しいSEを鳴らす」用途はmakePlaySePersonallyよりもこっちの方が筋が良いのでは？
    - isAlarm TODO: alarm()関数廃止に伴い新設予定






