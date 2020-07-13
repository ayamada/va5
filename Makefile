.PHONY: all clean closure-compiler dist


all: dist

clean:
	-rm -f dist/*


closure-compiler:
	closure-compiler --version


dist/va5.js: src/*.js src/va5/*.js
	mkdir -p dist
	cat src/polyfill.js src/va5/*.js src/va5_version.js src/va5_interface.js > dist/va5.js


dist/va5_externs.js: src/externs.js
	mkdir -p dist
	# TODO: なるべく自動生成したい
	cp src/externs.js dist/va5_externs.js


dist/va5.min.js: closure-compiler dist/va5.js dist/va5_externs.js
	mkdir -p dist
	closure-compiler --charset UTF-8 --compilation_level ADVANCED --externs dist/va5_externs.js --js dist/va5.js --js_output_file dist/va5.min.js --create_source_map dist/va5.min.js.map

# --externs および --js は複数指定可能
# --language_out ECMASCRIPT5 もしくは ECMASCRIPT5_STRICT を指定してもよい
# 末尾とかに `closure-compiler --version` を埋め込みたい
# (コメントアウトとかversionのみ抽出とかの問題があるので、余裕があれば)


dist: dist/va5.min.js
	# TODO: zipとかに固めたりする


# TODO: npmにデプロイしたりできるようにする
