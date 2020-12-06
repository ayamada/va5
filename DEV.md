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

1. `npm version major|minor|patch` 相当を行う
2. README.md内ChangeLogセクションに内容を記入
3. `make deploy-demo` もしくは `make dist` で自動更新コンテンツを更新
4. `git commit ...`
5. `git tag -a vX.Y.Z -m '...'` でタグを打つ
6. `git push && git push origin --tags`
7. (以下は、将来的にはgithub actionsに全部やらせたい)
8. (optional) `npm login`
9. (optional) `make deploy-npm-dry-run`
10. `make deploy-npm`
11. githubのtagsページにてリリース処理


## オンラインデモ兼リファレンスのリリースビルド生成およびデプロイ手順

山田専用

`make deploy-demo`



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




- 以下の動作確認を取る事
    - https://qiita.com/zprodev/items/7fcd8335d7e8e613a01f にあるリーク対策等が組み込まれているか再確認
        - きちんと組み込まれてるかと実際の動作の確認を行う事
    - android実機およびiOSエミュでの動作確認を取る
        - 古いiOS上でgetNowMsecが想定通り動くか確認を取る事
        - タッチのみで動作確認が取れるところまで実装を進める事
            - そうしないとandroidとiOSで動作確認が取れない…
        - この為にはオンラインデモを用意する必要がある。どう実装するか考える事



- リファレンスが読みづらいので、jsdocの説明文の各行の末尾に半角スペース2個を入れて、きちんと改行されるようにする
    - めんどいので後で…



- `make deploy-npm` の中で `npm publish` する前にconfirmを入れたい
    - `are you ok? (y/N)` に `y` と入力するぐらいの奴でいいので





- npmの流儀に合わせて、以下をnode_modulesにインストールして使うようにする
    - closure-compiler
    - jq
    - documentation

- github actions登録する
    - ビルド
        - リリースの為に必須。その為には上記コマンド群が必要なので先に対応する事
    - テスト
        - これ無理では…
    - リリース(zip生成)
        - もしzipコマンドが使えない場合は、npmのarchiverを使うしかない








- itch.io上に置いてみて動作確認
    - アツマールはWebAudioのアクティベートの特別対応コードが組み込まれているので、itch.ioは個別に動作確認を取っておきたい
        - itch.ioも同様では？その場合は自サーバで動作確認を取る必要が…
    - スマホでの動作確認が必要な為、banker3等に組み込んでちょっとしたミニゲームを実装する必要あり(Ｄ＆Ｄレベルでよい)
    - androidでの動作確認
    - safariでの動作確認
    - iOS simulatorでの動作確認
    - ieでの動作確認


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




- `npm publish` は、github actionsからのみ実行できるようにすべき！(手元で `npm login` して `npm publish` するのは色々と危険すぎる)
    - npm側でアクセス制限できるらしい？




- 十分にバグが取れたら、package.jsonのmainをmin版に変更する




- playBgmの新オプションとして「今流してるoneshotのbgmが終わったら次にこれを再生する」機能を追加
    - bgmNext() とか、別の関数にする方向で実装
    - 実装について
        - 非再生状態ならそのままplayBgmに流す
        - まだ再生状態ならnextBgmという名前の専用スロットに入れる
            - フェードアウト待ち用スロットとはまた別に用意する必要がある
        - oneshotのbgmの再生終了の際に、nextBgmが存在するなら、それを再生開始する(nextBgmは消す)
        - stop時には忘れずにnextBgmも消すように手を入れる事
    - がんばって実装しても普段は使わなさそうなので、リリース後のTODOとする事に


- ドキュメント等の英語対応


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



