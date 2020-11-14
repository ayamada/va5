# va5 開発メモ

## 開発手順

```
python -m http.server 8001
```

等でサーバ起動(他のstatic http server起動コマンドでもok)、
http://localhost:8001/demo/dev.html
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
    - つくった
    - m上のurlを決める
        - http://va5.tir.jp/demo/index.html
            - 適当にindex.htmlを置く事
    - 以下の手順で作業を行う
        - Makefileにdemo配下をva5.tir.jpにデプロイする手順を含める
            - 上記に伴い、このDEV.md内のデプロイ手順のところを記入
            - ssh越しにファイルのコピーと反映をできるようにMakefileに仕込みたい
                - 「sshでコマンド実行」は、sshの引数のホスト名以降に実行したいコマンドと引数をつけるだけでできるようだ
                    - stdin経由でも実行できるようだ
                        - `ssh hostname <<EOS ... EOS`
                        - `ssh hostname < run.sh > result.txt`
                - しかし、「sshでコマンド実行」「scpでファイル転送」の両方を一つのセッションで行う方法はないっぽい？
                    - `ssh hostname 'cat > foo.zip' < foo.zip` のように転送する事は可能なので、この後にコマンド実行できればまあなんとか…しかし可能か？
                - パスフレーズ入力が2回とかになっても別によいのでは？
                    - でももうちょっと考える
                    - 今はこれで。
        - 上記に伴い、このDEV.md内の開発手順も修正(make deploy-demoを追加)



- 一旦pushし、リファレンスのurlを確定させる
    - その後、オンラインデモやREADME内のurlを修正する




- npm登録できるようにする
    - dist/ 配下にビルドした配布物を入れる
        - 現在distはzip生成の用途に使っている、これはよくない。ちょっと考えて整理する必要がある
    - npm pack --dry-run で、publishせずに同梱対象のファイルを確認できる
        - これで、必要なjsファイル、externsファイル、mapファイル、README等が含まれ、不要なファイルは含まれない事を確認する
    - npm除外ファイル指定を行う
        - 必須ファイルについて
            - package.json
            - README.md
            - REFERENCE.md
            - LICENSE
            - build/va5.js
            - build/va5.js.map
            - build/va5.min.js
            - build/va5.min.js.map
            - build/va5_externs.js
        - 除外対象について
            - DEV.md
            - Makefile
            - va5_logo.png
            - demo/ 全て
            - build/reference_dump.md
            - build/reference_body.md
            - build/reference_body2.md
            - build/reference_header.txt
                - (これらは build/reference_* とまとめてもよい)
            - dist/ 配下のzip向けファイル関連
            - 他にある？
        - 迷うもの
            - src/ いらないと思うが…
        - 除外設定の方法を調べる事
            - 昔は .npmignore というファイルに記述していたらしいが今は違うらしい

http://liberty-technology.biz/PublicItems/npm/package.json.html より

~~~
"files" 項目はプロジェクトに含まれるファイルの配列です。 フォルダ名を指定した場合はフォルダの中のファイルも含まれます。 （他の設定により、そのファイルが無視されない場合です。）

".npmignore" というファイルをパッケージのルートレベルに 設置することが出来ます。指定されたファイルは "files" の配列で指定されていたとしても、 対象から除外されます。".npmignore" ファイルは ".gitignore" ファイルとちょうど同じです。

~~~

- どうやったら普通に(cl)js環境からrequireできるようになる？
    - pixiのpackage.jsonを見てみたら以下のようになっていた。この設定だけでいけるか？
        - "main": "lib/pixi.js",
        - "module": "lib/pixi.es.js",
        - "bundle": "dist/pixi.js",
        - ただ、package.json内にはmin版への参照が一切なかった。min版がないとサイズ的に困る気がするが…
            - node_modules/pixi.js/dist/pixi.min.js 自体は存在している
        - distはfull版、libは内部requireあり版、となっているようだ
    - あとで普通のnpmパッケージの作法を調べる事












- 公開準備は全て後回しにして、とりあえず「自分用に使える」ところまで優先して進める
    - https://qiita.com/zprodev/items/7fcd8335d7e8e613a01f にあるリーク対策等が組み込まれているか再確認
        - きちんと組み込まれてるかと実際の動作の確認を行う事
    - android実機およびiOSエミュでの動作確認を取る
        - 古いiOS上でgetNowMsecが想定通り動くか確認を取る事
        - タッチのみで動作確認が取れるところまで実装を進める事
            - そうしないとandroidとiOSで動作確認が取れない…
        - この為にはオンラインデモを用意する必要がある。どう実装するか考える事
    - 初回リリース作業
        - ChangeLogの場所の確保
        - タグ付けとか
    - ...
    - ...
    - ...


- npmの流儀に合わせて、documentationをnode_modulesにインストールするようにする





- itch.io上に置いてみて動作確認
    - アツマールはWebAudioのアクティベートの特別対応コードが組み込まれているので、itch.ioは個別に動作確認を取っておきたい
    - スマホでの動作確認が必要な為、banker3等に組み込んでちょっとしたミニゲームを実装する必要あり(Ｄ＆Ｄレベルでよい)
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



