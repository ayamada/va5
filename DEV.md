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


## オンラインデモのリリースビルド生成およびデプロイ手順

TODO


## 一時メモ

とりあえずdev.htmlが動くようにしていく。具体的にはどこから作っていく？

- m4aの音源ファイルを一個投入し、ボタンに割り当てる
    - これでiOSエミュの動作確認等をする
    - bgmとseのそれぞれ1個ずつを用意
    - va4から取ってきて最小化する？

- dev.htmlについて
    - ボタン不要で、consoleから直に関数実行するだけでよいのでは？
        - この場合、dev.htmlに書くべきはjsコード片という事になる

- configあたり？
    - まずここから始める事に
    - 一応できた

- 重要なインターフェースから？
    - とりあえずstubだけ置いた。中身は空

- init関数
    - va4がどういう風に呼んでるか確認する事
    - ???


- waインスタンス依存するにユーティリティ関数を次に移植する
    - va5.canPlayMime("audio/wav") TODO: 引数の形式を確認する事
    - va5.canPlayOgg()
    - va5.canPlayMp3()
    - va5.canPlayM4a()

- インターフェース関数？
    - va5.getLength(path) NB: 単位はsec。ロード済でない場合はnullが返る
    - va5.getBgmPosition(bgmCh, isIncludeLoopAmount) TODO: 要検討
    - va5.currentDeviceName() TODO: これ廃止する方向で考える。現状はWebAudioかdumbかの二択で、この情報自体は取れる意味はあるのだが…。もうちょっと考える
    - va5.makePlaySePeriodically(intervalSec, path, opts) TODO: 要検討。高階関数なので扱いが分かりづらい
    - va5.makePlaySePersonally(fadeSec) TODO: 要検討。高階関数なので扱いが分かりづらい

- ...
- ...
- ...
- ...



- 仕様について
    - jsのみ
    - WebAudioのみ対応。ただしdeviceレイヤの分離は行う(electron等対応がありえるので)
    - ie/edge非対応。無音で通す
        - edgeについては一応通してもよいのだが…
            - これはオプションで許可するかを選べるようにする。デフォルトは許可？
    - 以下のパターン全てで再生可能なフォーマットを選択
        - chrome in windows(9以降？)
        - chrome in mac
        - chrome in android
        - firefox in windows(9以降？)
        - firefox in mac
        - safari in mac
        - safari in iOS
        - しかし実は「どれか一つで全部いける」のであれば、こだわる必要はないのでは？
            - 「fallback指定をできるようにするかどうか」という問題にかかってくるのだけど…。もう「なし」でいいと思う。これが受け入れられない場合は他の音響エンジンライブラリを使ってねという事で
            - 推奨フォーマットを決めておく必要がある。現状だとm4aかmp3かのどちらかだが…
                - あとで↑の組み合わせに対して総当たりで確認する(windows以外)。m4aもmp3もどちらもokの場合はm4aを優先したい(mp3はedgeで可変bitrate不可の問題がある為)
    - その他の対応
        - va4の各種バッドノウハウ対策を組み込む
        - https://qiita.com/zprodev/items/7fcd8335d7e8e613a01f - にあるリーク対策等を組み込む
    - インターフェース案
        - va5 名前空間を使う(衝突がなさそうな事を確認済)
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
        - 本体設定関連
            - va5.config["foo"] = value
                - これをどうするかはもうちょっと考える
        - その他、ユーティリティ等
            - va5.version = "1.2.3-SNAPSHOT"
            - va5.??? (旧hasTerminalType) TODO: 名前を考える事
                - この判定はよくないのでは？
                - 今回判定して弾く必要があるのは「ie/edge」系のみなので、それだけ専用判定を持てばよいのでは？
                    - しかし他にも要求される部分があるかも…。ただ window.navigator.userAgent での判定は完全に正確にはならないので、そもそも頼るべきではない
                - 「古いモバイル環境だと強制オフにする」必要があるが、その判定をどうやるかも問題。これで判定するのはまずいのでは…
            - va5.canPlayMime("audio/wav") TODO: 引数の形式を確認する事
            - va5.canPlayOgg()
            - va5.canPlayMp3()
            - va5.canPlayM4a()
            - va5.floatToPercent(0.5) => 50
            - va5.percentToFloat(50) => 0.5
            - va5.currentDeviceName() TODO: これ廃止する方向で考える。現状はWebAudioかdumbかの二択で、この情報自体は取れる意味はあるのだが…。もうちょっと考える
            - va5.getLength(path) NB: 単位はsec。ロード済でない場合はnullが返る
            - va5.getBgmPosition(bgmCh, isIncludeLoopAmount) TODO: 要検討
            - va5.makePlaySePeriodically(intervalSec, path, opts) TODO: 要検討。高階関数なので扱いが分かりづらい
            - va5.makePlaySePersonally(fadeSec) TODO: 要検討。高階関数なので扱いが分かりづらい
    - va5.config["foo"] = value の設定項目について
        - volume-master マスターボリューム。[0.0-1.0]
        - volume-bgm bgm基本ボリューム。[0.0-1.0]
            - TODO: ch毎に個別指定できるべきでは？playBGM時に個別指定できる分だけあればよい？
        - volume-se seボリューム。[0.0-1.0]
        - isOutputLog 重要なログをconsoleに出す
            - keyをkebabにするかsnakeにするか決める事
        - isOutputDebugLog 微細なデバッグログをconsoleに出す
        - default-bgm-fade-sec
        - default-se-fade-sec
        - dont-stop-on-background?
        - se-chattering-sec
        - additional-query-string
        - path-prefix 初期値は "audio/" か？悩む。なしでいいのでは？
        - force-disable-old-mobile
        - force-disable-edge
        - ...
        - ...
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
        - ...
        - ...
        - ...
        - ...
        - ...



