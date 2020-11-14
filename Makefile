.PHONY: all clean deps check-device-spec build dist deploy-demo


CC = closure-compiler
CC_OPTS = --charset UTF-8
# --language_out ECMASCRIPT5 もしくは ECMASCRIPT5_STRICT を指定してもよい
# (指定なしでもes5になっているように書いている筈だが…)


VA5_SRCS := src/va5_license.js src/polyfill.js $(wildcard src/va5/*.js) src/va5_version.js src/va5_interface.js src/va5_ccinfo.js
CC_OPTS_JS := $(addprefix --js=,$(VA5_SRCS))

VA5_VERSION = $(shell cat package.json|jq .version)




all: build ;


clean:
	-rm -f .*-ok build/* dist/va5/*
	-rmdir dist/va5/
	-rm -f dist/*
	-rm -f demo/va5.min.js
	-rm -f demo/va5.min.js.map
	-rm -f demo/index.html




.deps-ok:
	$(CC) --version
	jq --version
	node --version
	documentation --version
	touch .deps-ok


deps: .deps-ok ;


src/va5_version.js: .deps-ok package.json
	echo '(function(exports) { "use strict"; var va5 = exports.va5 || {}; exports.va5 = va5; va5.version =' `cat package.json|jq .version` '; })(this);' > src/va5_version.js


src/va5_license.js: .deps-ok LICENSE
	node -e 'var lineNo = 0; require("fs").readFileSync("LICENSE", "utf-8").split("\n").forEach(function (line) { process.stdout.write((lineNo++ ? " * " : "/** @license ") + line + "\n"); }); process.stdout.write(" */\n");' > src/va5_license.js


src/va5_ccinfo.js: .deps-ok
	echo '/** @preserve' `$(CC) --version` '*/' > src/va5_ccinfo.js


build/va5.js: src/*.js src/va5/*.js
	mkdir -p build
	$(CC) $(CC_OPTS) $(CC_OPTS_JS) --compilation_level WHITESPACE_ONLY --js_output_file build/va5.js --create_source_map build/va5.js.map


build/va5_externs.js: .deps-ok build/va5.js
	node -e 'var modules = require("./build/va5.js"); console.log("var va5 = {};"); Object.keys(modules.va5).filter(function (k) { return !!k.match(/^[a-z]/); }).sort().forEach(function (k) { console.log("va5."+k+";"); });' > build/va5_externs.js


build/va5.min.js: .deps-ok build/va5.js build/va5_externs.js src/internal_externs.js
	$(CC) $(CC_OPTS) $(CC_OPTS_JS) --compilation_level ADVANCED --js_output_file build/va5.min.js --create_source_map build/va5.min.js.map --externs build/va5_externs.js --externs src/internal_externs.js


.device-spec-ok: .deps-ok build/va5.js
	node -e 'var va5 = require("./build/va5.js").va5; var waKeys = Object.keys(va5.Devices.WebAudio).sort(); var dumbKeys = Object.keys(va5.Devices.Dumb).sort(); if (JSON.stringify(waKeys) !== JSON.stringify(dumbKeys)) { console.log("WebAudio", waKeys); console.log("Dumb", dumbKeys); console.log("mismatched device-spec"); process.exitCode = 1; }'
	touch .device-spec-ok


check-device-spec: .device-spec-ok ;


build: .device-spec-ok build/va5.js build/va5.min.js ;


REFERENCE.md: .deps-ok src/reference_header.md src/reference_footer.md src/va5_interface.js src/va5/*.js
	documentation build -f md --markdown-toc false --sort-order alpha -o build/reference_dump.md src/va5_interface.js src/va5/*.js
	head -n 2 build/reference_dump.md > build/reference_header.txt
	tail -n +3 build/reference_dump.md > build/reference_body.md
	node -e 'var mode = ""; require("fs").readFileSync("build/reference_body.md", "utf-8").split("\n").forEach(function (line) { var m = line.match(/^(\#\#\#?)/); if (m) { mode = m[0]; } else if (mode === "###") {} else if (mode === "##" && line.length) { process.stdout.write("## "+line+"\n\n"); mode = ""; } else { process.stdout.write(line+"\n"); } }); process.stdout.write("\n");' > build/reference_body2.md
	cat build/reference_header.txt src/reference_header.md build/reference_body2.md src/reference_footer.md > REFERENCE.md


dist: clean deps build REFERENCE.md
	mkdir -p dist/va5
	cp build/* dist/va5
	cp README.md dist/va5
	cp REFERENCE.md dist/va5
	cp LICENSE dist/va5
	(cd dist && zip -r va5-$(VA5_VERSION).zip va5)


demo/index.html: build
	cp build/va5.min.js demo/
	cp build/va5.min.js.map demo/
	node -e 'var html = require("fs").readFileSync("demo/dev.html", "utf-8"); process.stdout.write(html.replace(/VA5_SRCS(.*?)VA5_SRCS/s, "--><script type=\"text/javascript\" src=\"va5.min.js\"></script><!--"));' > demo/index.html


deploy-demo: demo/index.html
	@echo 'sorry, please login twice'
	ssh m 'drop htdocs.va5.tir.jp/demo/ || true'
	scp -r demo m:htdocs.va5.tir.jp/ || echo 'failed to upload demo'
	@echo 'succeeded to upload demo'





# TODO: npmにデプロイできるようにする
