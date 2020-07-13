.PHONY: all clean deps dist


all: dist


clean:
	-rm -f .deps_ok dist/*


.deps_ok:
	closure-compiler --version
	jq --version
	touch .deps_ok


deps: .deps_ok


src/va5_version.js: deps package.json
	echo '(function(exports) { "use strict"; var va5 = exports.va5 || {}; exports.va5 = va5; va5.version =' `cat package.json|jq .version` '; })(this);' > src/va5_version.js


dist/va5.js: src/*.js src/va5/*.js
	mkdir -p dist
	cat src/polyfill.js src/va5/*.js src/va5_version.js src/va5_interface.js > dist/va5.js


dist/va5_externs.js: src/externs.js
	mkdir -p dist
	# TODO: なるべく自動生成したい
	# externs対象は「va5直下の小文字で始まるエントリ」のみとなる。「_で始まるエントリ」はprivate(mungeしてok)、「大文字で始まるエントリ」はクラス名(mungeしてok)。トップレベル汚染はva5キーのみ
	# 何で自動生成するか考える
	# - node？va5を正確に見るならこれ一択だが…(それ以外でも、インデントで判断する事は一応可能)
	cp src/externs.js dist/va5_externs.js


dist/va5.min.js: deps dist/va5.js dist/va5_externs.js
	mkdir -p dist
	closure-compiler --charset UTF-8 --compilation_level ADVANCED --externs dist/va5_externs.js --js dist/va5.js --js_output_file dist/va5.min.js --create_source_map dist/va5.min.js.map

# --externs および --js は複数指定可能
# --language_out ECMASCRIPT5 もしくは ECMASCRIPT5_STRICT を指定してもよい
# 末尾とかに `closure-compiler --version` を埋め込みたい
# (コメントアウトとかversionのみ抽出とかの問題があるので、余裕があれば)


dist: clean deps dist/va5.min.js
	# TODO: zipとかに固めたりする


# TODO: npmにデプロイしたりできるようにする
