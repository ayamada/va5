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

- 一番外側のビルドツールはMakefileにする
    - これについてはddiでやっているものをベースとする

(src/va5_version.jsの更新)
(最終的には cat src/va5/*.js とかで一つのファイルにする。これがva5.jsになる)
(gccのoptimizationsでmin化。externs対象は「va5直下の小文字で始まるエントリ」のみとなる。「_で始まるエントリ」はprivate(mungeしてok)、「大文字で始まるエントリ」はクラス名(mungeしてok)。トップレベル汚染はva5キーのみ)
(これでva5.min.jsとva5.min.js.mapができる)


## オンラインデモ兼リファレンスのリリースビルド生成およびデプロイ手順

TODO

そもそも、どういう奴にするのかから考える必要が…


## デバッグしづらい部分の動作確認について

- dumbモードでの動作確認
    - 例外が投げられたりコンソールに異常が表示されなければok。音はどうやっても出ない。
    - javascriptの仕様上、該当コードを走らせないと変なところがないか分からないので、走らせる必要がある

- ieでの動作確認
    - 同上。基本的にはdumbモードでの動作となり、音が出ないのは想定通りなのだが、意図せずに例外が投げられるのはとても困る(ieでのみ「新しいjavascript構文に対応していない」等の原因で例外が投げられる可能性があるので、個別チェックが必要)

- 古いandroid/iOSでの動作確認
    - 同上
    - WebAudio実装が中途半端な時期の端末での動作確認がとても厳しい(ていうかちょっと無理)


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
    - 古いiOS上でgetNowMsecが想定通り動くか確認を取る事
    - タッチのみで動作確認が取れるところまで実装を進める事
        - そうしないとandroidとiOSで動作確認が取れない…


## 一時メモ

実験的に、デプロイスクリプトのプロトタイプを作ってみる
内容は↑の「リリース手順」のところに仮配置する




- 非loop(playEndSecあり)のBGMの再生時にバックグラウンド消音してからresumeしたら再生再開されない(再生終了状態になっている)。直す事
    - ループありの場合はちゃんと動いている


- 非loop(playEndあり)のBGMの再生途中で別の非loopBGMを再生しようとしてフェードしたが、始まらなかった
    - ↑と同じ問題か？
    - 次の曲がloopBGMなら普通に始まった







- play系のoptsで指定できる引数をミスしやすいのをなんとかしたい
    - 具体的には、規定でないパラメータがあった場合は_logErrorを使って取れるパラメータの一覧を出力したい(その上で例外は投げずにfallback値での処理を続行する)
    - これはconfigもそう。どうするかちょっと考える事
        - configの方はおそらくva5.getConfig()/va5.setConfig()形式にするしかないと思う(getter/setterではfallback処理ができない)
            - この場合はconfigのエントリ毎にdefmacro的なdefentryを作って対応する方向にできると思う
        - play系optsの方も同じようにしたいのだけど、defentryを作るのがかなり難しい、ちょっと考える必要がある



- configで「強制dumbモード」とか設定できるようにする
    - これができたらdumbモードの動作確認を取る。_logDebug()が足りてないとdumbモードの動作確認ができないので、足りてない箇所に足していく



ドキュメントに「playEndが指定されている場合、loopEnd系パラメータは無視されます」と明記しておく事
ドキュメントに「se-chattering-secは動的に変更するのには向いていません」と明記しておく事

上記以外にも、play系のopts、deviceのstate、bgmのstate、seのstate、これらのkeyの名前をより分かりやすいものに変更したい(少なくとも公開前には何とかしたい)



そろそろビルドスクリプト等を用意する事






- https://qiita.com/zprodev/items/7fcd8335d7e8e613a01f にあるリーク対策等を組み込む事


- playBgmの新オプションとして「今流してるoneshotのbgmが終わったら次にこれを再生する」機能を追加
    - bgmNext() とか、別の関数にする？
    - ただこれ普通に設定すると、stop時にも流れてしまうのでは？
        - stop時にはnextStateも消すようにすればよい
            - TODO: 忘れずに実装する事！


getDuration()に「仕様上どうしても正確にならない」「ループに正確さが必要ならLOOP系パラメータをつけるしかない」とドキュメントに書いておく事



checkDeviceSpec(device) みたいな関数を作り、必要な関数が揃っているかチェックできるようにしたい
とりあえず関数としてのエントリが存在するかのチェックだけでよい
普段は実行しない、もしくはinit時のみチェックする感じで
実際のチェック内容としては、「DumbとWebAudioで比較」みたいな感じでよい？
これをマクロっぽい奴なしに行えるか？
(「別にチェックリストを用意する」だと結局チェックリストの更新を忘れて死ぬ)

Object.keys(va5).forEach(function (k) {
if (va5[k] == null) { throw Error("function not found: "+k); }
});
これだと駄目。何故なら大部分の提供関数が、va5.init()を暗黙の内に実行する為に、
functionでラッピングしているから。また _device のチェックにもならない。
マクロ的に、コメントからのusage抽出と同様に組むしかないのでは？



- usageはinterface.js内にコメントで書いて、それをスクリプトで抽出する？



## その他のメモ

- 設計方針メモ
    - jsでの実装とする
    - 単一jsファイルでのみの提供とする(パッケージャに頼らなくても手軽に試せる)
    - ビルドはMakefileかshスクリプトかなんかで行う。webpackは使わない
        - gccのoptimizationsで圧縮する
            - この為にexternsファイルも用意する必要がある。externsファイルはスクリプトか何かで抽出するようにしたい(手で管理したくない)
    - va4で行っていたHtmlAudio対応は廃止。WebAudioとDumbのみとする
    - ie非対応。無音で通す
        - WebAudioがないので当然なのだが、新し目のjs構文を使っていてロードエラーが起こったりという事がないようにする必要がある
    - 古いスマホ非対応。無音で通す
        - どう判定するかが問題。WebAudio非対応なら問題ないが、中途半端に対応している時期のものが問題になる
    - va4で実装していた「音源のfallback/wildcard指定」は廃止。音源ファイルは一個指定固定に
    - va4での各種バッドノウハウ対策を組み込む事
    - https://qiita.com/zprodev/items/7fcd8335d7e8e613a01f にあるリーク対策等を組み込む事
    - voice実装は、seではなく、「oneshotのみのbgm」的な扱いにする(各チャンネルでの同時発声数を1に抑える為)


- assertを仕込む際のルール
    - 可能な限り例外は投げない(assertは常用しない)
        - 通常はvalidateの方を使う
            - たとえ引数ミスのようなものであっても、コンソールにのみエラーを出す。例外は投げない
            - validateは不正な値が渡ってきた場合でも例外を投げない。内部で勝手に丸め込んで処理する
                - 一部、丸め込みのできないタイプの値(path等)があり、それはnullを返すが、そういうものの場合はnullかどうかをチェックし何も処理しないようにすればよい
        - 通常は絶対起こらないようなところにだけassertを仕込む(内部の異常を検知する)



## ファイル形式についての考察

- mp3
    - WebAudioがサポートされているほとんどの環境で再生可能
    - ABR/VBRだとedgeでdecodeAudioDataが例外を投げる事がある(正確な条件は不明)。CBR推奨
        - lameだと `-strictly-enforce-ISO` オプションをつけるべきかもしれない
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
    - edgeとモバイル系ブラウザで再生できない問題がある(古いfirefoxも)


# 古くなったメモ

- mp3/m4a/oggにタグを書き込む方法
    - https://mutagen.readthedocs.io/en/latest/ を使う

- oggを採用し、ogg非対応環境ではstbvorbis.jsを使ってデコードする方法
    - https://qiita.com/hajimehoshi/items/458b8f3fe92fbd5c6701
    - https://forum.tkool.jp/index.php?threads/%E9%9F%B3%E5%A3%B0%E3%82%92%E9%AB%98%E9%80%9F%E3%81%AB%E8%AA%AD%E3%81%BF%E8%BE%BC%E3%82%80%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3.3095/ での対応を見ていると、扱うのはどうにも大変そうだという感じが強い…
    - 配布形式が単一のjsファイルにできなくなるのが問題

- jsからmp3を生成する
    - https://github.com/zhuker/lamejs を使う

- jsからm4aを生成する
    - https://github.com/Kagami/ffmpeg.js を使う


ffmpegでm4aを生成する場合のオプション指定

```
ffmpeg -i input.wav -vn -ac 1 -ar 44100 -ab 64k -acodec aac output.m4a
```

- `-ac` 1で強制モノラル、2でステレオ
- `-ab` でビットレート指定。m4aは32k～64kでも実用範囲内(mp3だとボロボロになる)


