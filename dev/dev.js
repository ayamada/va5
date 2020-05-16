(function(exports) {
  "use strict";

  var window = exports;
  var document = exports.document;

  var appRoot = document.getElementById("the-app");
  if (!appRoot) { throw new Error("the-app not found"); }

  function makeButton (label, fn) {
    var b = document.createElement("button");
    b.textContent = label;
    b.style.margin = "1em";
    b.style.padding = "1em";
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      fn(label);
    });
    return b;
  }

  appRoot.style.margin = "1em";
  appRoot.style.padding = "1em";

  appRoot.appendChild(makeButton("va5.playProto('./kick.m4a')", function (label) {
    eval(label);
  }));

  appRoot.appendChild(document.createElement("br"));

  appRoot.appendChild(makeButton("va5.playSe('./kick.m4a')", function (label) {
    eval(label);
  }));

  appRoot.appendChild(document.createElement("br"));

  appRoot.appendChild(makeButton("va5.playBgm('./cntr.m4a')", function (label) {
    eval(label);
  }));

  appRoot.appendChild(document.createElement("br"));

  appRoot.appendChild(makeButton("va5.stopBgm()", function (label) {
    eval(label);
  }));

  va5.config["is-output-error-log"] = true;
  va5.config["is-output-debug-log"] = true;
  va5.init();


  //console.log("TODO");

  // TODO

})(this);
