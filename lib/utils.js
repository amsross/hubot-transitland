"use strict";
const r = require("ramda");

const matchOrRecurse = r.curry((matcher, recurser, msg, prop, term, result) => {

  return matcher(term, result)
    // if there were none, call the next endpoint
    .otherwise(() => {
      const nextEndpoint = r.path(["meta", "next"], result);
      if (nextEndpoint) return recurser(msg, term, nextEndpoint);
      throw new Error(`nothing found for "${term}"`);
    });
});

module.exports = {
  matchOrRecurse,
};

