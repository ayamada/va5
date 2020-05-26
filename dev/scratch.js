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

  //appRoot.appendChild(makeButton("va5.playProto('./kick.m4a')", function (label) {
  //  eval(label);
  //}));
  //appRoot.appendChild(document.createElement("br"));

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
  //va5.config["volume-master"] = 1;

  va5.init();


  console.log("device type:", va5.getDeviceName());

  window.chch = function () {
    va5.se("./kick.m4a", {});
    va5.se("./kick.m4a", {pitch:0.5});
  };

  var ch = null;
  window.ppp = function () {
    ch = va5.se("./cntr.m4a", {channel: ch});
  };

  window.sss = function () {
    if (!ch) { return; }
    //va5.stopSe(ch);
    va5.stopSe(ch, 1);
  };



})(this);
