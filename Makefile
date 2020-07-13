.PHONY: all clean deps dist


all: dist


clean:
	-rm -f .deps_ok dist/*


.deps_ok:
	closure-compiler --version
	jq --version
	node --version
	touch .deps_ok


deps: .deps_ok


src/va5_version.js: deps package.json
	echo '(function(exports) { "use strict"; var va5 = exports.va5 || {}; exports.va5 = va5; va5.version =' `cat package.json|jq .version` '; })(this);' > src/va5_version.js


dist/va5.js: src/*.js src/va5/*.js
	mkdir -p dist
	cat src/polyfill.js src/va5/*.js src/va5_version.js src/va5_interface.js > dist/va5.js


dist/va5_externs.js: dist/va5.js
	node -e 'var modules = require("./dist/va5.js"); console.log("var va5 = {};"); Object.keys(modules.va5).filter(function (k) { return !!k.match(/^[a-z]/); }).sort().forEach(function (k) { console.log("va5."+k+";"); });' > dist/va5_externs.js


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
