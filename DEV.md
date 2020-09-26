# va5 開発メモ

## 開発手順

```
python -m http.server 8001
```

等でサーバ起動(他のstatic http server起動コマンドでもok)、
http://localhost:8001/dev/dev.html
をブラウザから開いて動作確認


## ビルド手順

1. `package.json` 内のversion値を更新(必要なら)
2. `make clean all` を実行


## リリース手順

TODO

(タグ付けとか、その辺の手順まで書く事)


## オンラインデモ兼リファレンスのリリースビルド生成およびデプロイ手順

TODO



## デバッグしづらい部分の動作確認について

- dumbモードでの動作確認
    - 例外が投げられたりコンソールに異常が表示されなければok。音はどうやっても出ない。
    - javascriptの仕様上、該当コードを走らせないと変なところがないか分からないので、走らせる必要がある
    - configの `is-use-dumb-mode-forcibly` をオンにすれば簡単に確認できる

- ieでの動作確認
    - 同上。基本的にはdumbモードでの動作となり、音が出ないのは想定通りなのだが、意図せずに例外が投げられるのはとても困る(ieでのみ「新しいjavascript構文に対応していない」等の原因で例外が投げられる可能性があるので、個別チェックが必要)

- 古いandroid/iOSでの動作確認
    - 同上
    - WebAudio実装が中途半端な時期の端末での動作確認がとても厳しい(ていうかちょっと無理)。どうする？


## TODO







- オンラインデモの作成および設置
    - これどうする？？？？
    - 「コピペ可能なサンプルコードを置いてます。コンソール開いてコピペ入力してみてください」でよいと思う
    - 今ある dev/dev.html を demo.html とかにrenameして、この方針で書き直す
        - dev.html自体は残すべきでは？min版を使うかどうかだけ差をつけて。
    - 結局どうするの？
        - dev/ を demo/ にrename
        - demo/dev.html に上記通りのサンプルコードを書く
        - demo/demo.html をdev.htmlからコピーしてmin版を読むようにする
            - できればsedとかで対応したいが…
        - Makefileにdemo配下のデプロイ手順を含める
            - ...


- 「バックグラウンドでもBGMの再生を一時停止しない」設定の上で、フェードアウト/インを行い、(ゆっくりになってもよいので)なめらかにフェードアウト/インされるかの確認を取る事



- アツマール上での動作確認
    - androidでの動作確認
    - safariでの動作確認
    - iOS simulatorでの動作確認
    - ieでの動作確認


- github actionsでビルドテスト実行するように設定する

- READMEに各種バッヂを入れる
    - buildバッヂ
    - npmバッヂ
    - releaseバッヂ
    - licenseバッヂ

以下はva4のバッヂ(travisとclojarsは抜いて交換)

~~~
[![Build Status](https://travis-ci.org/ayamada/vnctst-audio4.svg?branch=master)](https://travis-ci.org/ayamada/vnctst-audio4)
[![Clojars Project](https://img.shields.io/clojars/v/jp.ne.tir/vnctst-audio4.svg)](https://clojars.org/jp.ne.tir/vnctst-audio4)
[![npm](https://img.shields.io/npm/v/vnctst-audio4.svg)](https://www.npmjs.com/package/vnctst-audio4)
[![release version](https://img.shields.io/github/release/ayamada/vnctst-audio4.svg)](https://github.com/ayamada/vnctst-audio4/releases)
[![license](https://img.shields.io/github/license/ayamada/vnctst-audio4.svg)](LICENSE)
~~~


- android実機およびiOSエミュでの動作確認を取る
    - 古いiOS上でgetNowMsecが想定通り動くか確認を取る事
    - タッチのみで動作確認が取れるところまで実装を進める事
        - そうしないとandroidとiOSで動作確認が取れない…
    - この為にはオンラインデモを用意する必要がある。どう実装するか考える事



- npm登録できるようにする
    - dist/ 配下にビルドした配布物を入れる？
    - npm pack --dry-run で、publishせずに同梱対象のファイルを確認できるようだ
        - 以下を除外したい
            - dev/ 全て
            - build/reference_dump.md
            - build/reference_body.md
            - build/reference_body2.md
            - build/reference_header.txt
                - (これらは build/reference_* とまとめてもよい)
            - *.zip (正確なファイル名は未定)
            - dist/
                - この中に必要なファイルをコピーしたディレクトリを作ってからzipに固める？
                    - zipに固める際のディレクトリ名を指定したいなら、そうする必要があるのでは…
    - これで、必要なjsファイル、externsファイル、mapファイル、README等が含まれ、不要なファイルは含まれない事を確認する
        - 不要なファイルについても別に含まれてもよいのでは？
            - ソース関連については含まれてもよいが、dev配下のテスト用音源ファイルとかは含めたくない
            - 個別の除外設定ができればよい。やり方を調べる事
                - 昔は .npmignore というファイルに記述していたらしいが今は違うらしい

http://liberty-technology.biz/PublicItems/npm/package.json.html より

~~~
"files" 項目はプロジェクトに含まれるファイルの配列です。 フォルダ名を指定した場合はフォルダの中のファイルも含まれます。 （他の設定により、そのファイルが無視されない場合です。）

".npmignore" というファイルをパッケージのルートレベルに 設置することが出来ます。指定されたファイルは "files" の配列で指定されていたとしても、 対象から除外されます。".npmignore" ファイルは ".gitignore" ファイルとちょうど同じです。



~~~

- https://qiita.com/zprodev/items/7fcd8335d7e8e613a01f にあるリーク対策等を組み込む
    - きちんと組み込まれてるかと実際の動作の確認を行う事



- 初回リリース作業
    - タグ付けとか




- playBgmの新オプションとして「今流してるoneshotのbgmが終わったら次にこれを再生する」機能を追加
    - bgmNext() とか、別の関数にする方向で実装
    - 実装について
        - 非再生状態ならそのままplayBgmに流す
        - まだ再生状態ならnextBgmという名前の専用スロットに入れる
            - フェードアウト待ち用スロットとはまた別に用意する必要がある
        - oneshotのbgmの再生終了の際に、nextBgmが存在するなら、それを再生開始する(nextBgmは消す)
        - stop時には忘れずにnextBgmも消すように手を入れる事
    - がんばって実装しても普段は使わなさそうなので、リリース後のTODOとする事に



## その他のメモ

- ffmpegでm4aを生成する場合のオプション指定
    - `ffmpeg -i input.wav -vn -ac 1 -ar 44100 -ab 64k -acodec aac output.m4a`
        - `-ac` 1で強制モノラル、2でステレオ
        - `-ab` でビットレート指定。m4aは32k～64kでも実用範囲内(mp3だとボロボロになる)


## ファイル形式についての考察

- mp3
    - WebAudioがサポートされているほとんどの環境で再生可能
    - ABR/VBRだと古いedge(chromium移行前の奴)でdecodeAudioDataが例外を投げる事がある(正確な条件は不明)。CBR推奨
        - lameだと `-strictly-enforce-ISO` オプションをつければ問題ないか？
    - mp3の仕様上、勝手に無音部分が曲頭および曲末尾に追加されてしまう。とても問題になる
        - LAME INFO tagに対応したデコーダではこの無音部分を適切に除去できる。が、対応状況はブラウザによってまちまち、これを前提にする事はできない
        - この辺の詳細は https://lame.sourceforge.io/tech-FAQ.txt に書いてある

- m4a
    - WebAudioがサポートされているほとんどの環境で再生可能
    - デコーダによっては勝手に無音部分が曲末尾に追加されてしまう。SEでは問題ないがループBGMで問題になる
        - safari等のapple系デコーダは0、chromeおよびffmpeg系デコーダは少し、firefoxだとたくさん
    - mp3とは違い、曲頭に無音部分がつく事はないので、mp3よりは扱いやすい

- ogg
    - mp3やm4aにある無音部分追加の問題はない
    - モバイル系ブラウザで再生できない問題がある(古いedgeと古いfirefoxも)



# 古いメモ

- wav形式エクスポートについて
    - https://github.com/grumdrig/jsfxr や https://github.com/loov/jsfx でwav形式エクスポートをやっているようなので、どういう形式で出力すればよいのか確認する

- mp3/m4a/oggにタグを書き込む方法
    - https://mutagen.readthedocs.io/en/latest/ を使う

- oggを採用し、ogg非対応環境ではstbvorbis.jsを使ってデコードする方法
    - https://qiita.com/hajimehoshi/items/458b8f3fe92fbd5c6701
    - 配布形式を単一のjsファイルにできなくなる問題がある。今回はパスする

- jsでmp3を生成する
    - https://github.com/zhuker/lamejs を使う

- jsでm4aを生成する
    - https://github.com/Kagami/ffmpeg.js を使う(ライセンス要確認)



