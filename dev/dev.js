(function(exports) {
  "use strict";

  var window = exports;
  var document = exports.document;

  var appRoot = document.getElementById("the-app");
  if (!appRoot) { throw new Error("the-app not found"); }

  function makeButton (label, fn) {
    var b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
    return b;
  }

  appRoot.style.margin = "1em";
  appRoot.style.padding = "1em";

  appRoot.appendChild(makeButton("foo", function () {
    console.log("foo");
    // TODO
  }));

  appRoot.appendChild(makeButton("bar", function () {
    console.log("bar");
    // TODO
  }));

  appRoot.appendChild(makeButton("zzz", function () {
    console.log("zzz");
    // TODO
  }));

  //console.log("TODO");

  // TODO

})(this);
