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

- Promise を返す、load() のラッパーを用意
    - Promiseを返すようにしたくはあるのだが、当初はなしにし、後で余裕のある時に実装する事に。以下がその理由
        - Promiseが存在しない環境(ieおよび古いiOS)がありえる事
        - 「非対応環境では音が出ない」は普通に許されるが「例外が投げられて動作に支障が出る」「thenが実行されない」というのはかなり許されない。具体的にはWebAudioを持たないie等の環境であっても「load()を実行したらthenが実行される」という部分は必須となってしまう(Promiseを返す仕様にするのであれば)
        - なるべく他のライブラリに頼らないようにしたいので既存のpolyfillを導入したくない
        - つまり、Promiseを返すようにしたいのであれば(ie等の環境専用の)自前のpolyfill実装が必要となる。面倒な割に報われない作業なので後回しにする
    - 名前は loadP() とかでいいと思う。また、これが必要なのはload()のみの想定


## オンラインデモのリリースビルド生成およびデプロイ手順

TODO


## 一時メモ

とりあえずdev.htmlが動くようにしていく。具体的にはどこから作っていく？

- m4aの音源ファイルを一個投入し、ボタンに割り当てる
    - これでiOSエミュの動作確認等をする
    - bgmとseのそれぞれ1個ずつを用意
    - va4から取ってきて最小化する？
        - 調べた。BGMは cntr 、SEは kick 。それぞれwavからm4aを生成する事

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


- インターフェース関数？
    - va5.getLength(path) NB: 単位はsec。ロード済でない場合はnullが返る
    - va5.getBgmPosition(bgmCh, isIncludeLoopAmount) TODO: 要検討
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


## 開発方針の考え直しについて

- やはりdevice層の抽象化は必須
    - va5.device.WebAudio と va5.device.dumb を分けたい
        - アクティブなデバイスを va5.device.current みたいなところに代入する形にしたい
        - もしくは va5._device.WebAudio 等を定義しておいてから、 va5.device = va5._device.WebAudio みたいにするか？
            - こっちの方が使う時に名前が短くてすむ反面、定義する方はちょっと混乱する気がする( _device と device で)
    - という事は、 va5.device.WebAudio と va5.device.dumb のファイルを分けたい
        - pixiみたいに、index.jsを用意してその中でrequireする、みたいなのが必要になるのでは？
            - という事はwebpackを使う必要があるのでは
                - でも使いたくない！
                - 開発時は全部scriptタグから読む、リリース時は全jsをcatしてgccで圧縮してmin化する、でも問題ないと思う
                    - 問題点は「開発時は全部scriptタグから読む」が案外大変な事。この為だけにrequireJSを導入するか？
                        - うーん…

- 一旦、 dev/dev.html とは別に dev/proto.html を作るべきでは？
    - この方向で始める
    - ファイルを分けたものは一旦全部ここにscriptタグを書く方向で。dev.htmlにback portする際に、結合するか、index.js的なものを用意するか等を決める


- とりあえず名前空間どうするか決める事(これを決めないとファイル名等に影響がある)
    - va5.device.WebAudio 等で定義、 va5.device.current = va5.device.WebAudio; して利用
        - 長い！
    - va5._device.WebAudio 等で定義、 va5.device = va5._device.WebAudio; して利用
        - わかりにくい。でもまあ許容範囲内か？
    - va5.device.WebAudio 等で定義、 va5.currentDevice = va5.device.WebAudio; して利用
        - これがベストか？もうちょい考えたい
    - va5.devices.WebAudio 等で定義、 va5.device = va5.devices.WebAudio; して利用
        - こっちの方がよいか？
    - 考えた結果こうなった
        - クラス名は大文字で始める(pixiに近い流儀)。ただしnewするものはなく全て関数(static method)
            - deviceの件はこうなる。「 va5.Devices.WebAudio が定義され、 va5.device = va5.Devices.WebAudio が実行される」
        - クラスに対応するファイルは深く掘らない。ドットをアンダースコアに置換したファイル名とする
            - va5.Devices.WebAudio なら va5_Devices_WebAudio.js とする
            - なんでかというと、最終的には cat src/va5/*.js とかで一つのファイルにする為
        - gccのoptimizationsに渡すextern対象は上記とは別の場所でまとめる。これについては va5.foo で統一する。そして衝突しないように、extern対象でないものは全て上記のクラス内に収める
            - これによって、va5直下は「小文字で始まるextern対象」と「大文字で始まる(extern対象でない)クラス名」だけになる。トップレベル汚染はva5キーのみですむ。




