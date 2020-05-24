(function(exports) {
  "use strict";

  if (!Object.keys) {
    Object.keys = function (obj) {
      var r = [];
      var prop = null;
      for (prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) { r.push(prop); }
      }
      return r;
    };
  }

})(this);
