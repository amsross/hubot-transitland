"use strict";
const F = require("fuse.js");
const d = require("dotty");
const h = require("highland");
const r = require("ramda");
const request = require("request");
const utils = require("./utils");

const fuseConfig = {
  threshold: 0.3,
  keys: [
  { name: "short_name", weight: 0.7 },
  { name: "name", weight: 0.3 },
  ],
};

const matchOperator = r.curry((prop, term, result) => {

  return h([result])
    // get the operators from the result
    .map(r.pipe(
          r.prop(prop),
          r.of, r.flatten))
    // look for a match based on the passed operator
    //  expect a stream back
    .flatMap(r.pipe(
          r.construct(F)(r.__, fuseConfig),
          r.invoker(1, "search")(term)))
    .take(1);
});

const findOperator = r.curry((msg, type, term, endpoint) => {

  // check the brain first
  return h([r.view(r.lensPath(["brain", "data", "transitland", type, term]), msg.robot)])
    .compact()
    // if there's nothing matching in the brain, hit the api
    .otherwise(() => {
      return h.wrapCallback(request.get, (res, body) => body)(endpoint)
        .compact()
        .map(JSON.parse)
        // if there aren't any operators, we can't do anything
        .filter(r.path([type]))
        .otherwise(() => {throw new Error(`invalid response from ${endpoint}`);})
        // if there's no "next" url, we can't recurse
        .flatMap(utils.matchOrRecurse(matchOperator, findOperator, type, term))
        .pick(["name", "short_name", "onestop_id", "timezone"])
        .tap(result => {
          // store this in for later
          d.put(msg.robot, ["brain", "data", "transitland", type, term], result);
          msg.send(`By "${term}", I assume you meant "${result.name}"`);
        });
    });
});

module.exports = {
  matchOperator,
  findOperator,
};
