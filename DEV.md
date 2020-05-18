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

以下、リリースビルドの為の処理の一時メモ

(src/va5_version.jsの更新)
(最終的には cat src/va5/*.js とかで一つのファイルにする)
(gccのoptimizationsでmin化。externs対象は「va5直下の小文字で始まるエントリ」のみとなる。「_で始まるエントリ」はprivate(mungeしてok)、「大文字で始まるエントリ」はクラス名(mungeしてok)。トップレベル汚染はva5キーのみ)


## オンラインデモ兼リファレンスのリリースビルド生成およびデプロイ手順

TODO

そもそも、どういう奴にするのかから考える必要が…


## TODO

- dev/prod.html と dev/prod.js の作成
    - min版を生成したら、ここで動作確認を取る
    - これ dev/ というディレクトリ名をやめるべきでは？
        - devとprodの同居はした方がよい(同じ音源ファイルを参照したい)
        - いい名前を考える事
            - resources/public/
            - public_html/
            - ...
            - ...
            - ...


- android実機およびiOSエミュでの動作確認を取る
    - タッチのみで動作確認が取れるところまで実装を進める事


## 一時メモ

- Seの実装







    - va5.makePlaySePeriodically(intervalSec, path, opts) TODO: 要検討。高階関数なので扱いが分かりづらい
        - interface側でのみ提供






- 再生キューおよびマネージャの構造を考える必要がある
    - BGMはch毎にキューと状態を持つ必要がある
        - 「再生中BGM」を全て管理する必要がある(unloadの事を考えると、そうせざるをえない)




- BGM専用
    - va5.getBgmPosition(bgmCh, isIncludeLoopAmount) TODO: 要検討
        - これは音ゲー実装時に必要になる。
        - また内部でバックグラウンド時の一時停止時にも使う

    - va5.playBgm(path, opts)
    - va5.bgm(path, opts)
        - va4にあった bgmOneshot bgmFadein は廃止(optsで指定可能なので)
        - va4にあった me bgs は廃止(chを明示的に指定すればすむ話なので)
        - 新オプションとして「今流してるoneshotのが終わったら次にこれを再生する」オプションを追加
        - 新オプションとして「ループポイント指定」オプションを追加する？しない？

    - va5.stopBgm(bgmCh, fadeSec)
    - va5.stopBgm(fadeSec)
        - 引数の形式を変更した方がよいかもしれない



- va4のBGM再生コマンドのオプション指定について
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




## 仕様一時メモ

あとで消すか、「その他のメモ」に移動させる事

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

- voice実装メモ(未実装)
    - 扱いとしてはseではなく、「oneshotのみのbgm」的な扱いにする
        - 各チャンネルでの同時発声数を1に抑える為




## その他のメモ

- assertを仕込む際のルール
    - play, stop, load等の「副作用を伴う処理」に型違いの引数が渡された場合は例外を投げる
        - 引数の数値に範囲外の値が指定された場合は例外を投げない。内部で勝手に丸め込んで処理する
        - config値の変更もこの「副作用を伴う処理」の一種とする
    - get等の「副作用を伴わない情報取得」に型違いの引数が渡された場合は例外は投げない。適当な失敗値を返す
        - config値の参照もこの「副作用を伴わない情報取得」の一種とする





