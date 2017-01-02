"use strict";
const F = require("fuse.js");
const d = require("dotty");
const h = require("highland");
const r = require("ramda");
const request = require("request");
const url = require("url");

const fuseConfig = {
  threshold: 0.3,
  keys: [
  { name: "short_name", weight: 0.7 },
  { name: "name", weight: 0.3 },
  ],
};

const mutateUrl = r.pipe(
    r.omit(["search"]),
    url.format);

const matchOrRecurse = r.curry((matcher, recurser, prop, msg, term, result) => {

  return matcher(term, result)
    // if there were none, call the next endpoint
    .otherwise(() => {
      const nextEndpoint = r.path(["meta", "next"], result);
      if (nextEndpoint) return recurser(msg, term, nextEndpoint);
      throw new Error(`nothing found for "${term}"`);
    });
});

const matchType = r.curry((prop, term, result) => {

  return h([result])
    // get the entities from the result
    .map(r.pipe(
          r.prop(prop),
          r.of, r.flatten))
    // look for a match based on the passed entity
    //  expect a stream back
    .flatMap(r.pipe(
          r.construct(F)(r.__, fuseConfig),
          r.invoker(1, "search")(term)))
    .take(1);
});

const findType = r.curry((type, msg, term, endpoint) => {

  // check the brain first
  return h([r.path(["brain", "data", "transitland", type, term], msg.robot)])
    .compact()
    // if there's nothing matching in the brain, hit the api
    .otherwise(() => {
      return h.wrapCallback(request.get, r.nthArg(1))(endpoint)
        .compact()
        .map(JSON.parse)
        // if there aren't any entities, we can't do anything
        .filter(r.path([type]))
        .otherwise(() => {throw new Error(`invalid response from ${endpoint}`);})
        // if there's no "next" url, we can't recurse
        .flatMap(matchOrRecurse(matchType(type), findType(type), type, msg, term))
        .pick(["name", "short_name", "onestop_id", "timezone"])
        .tap(result => {
          // store this in for later
          d.put(msg.robot, ["brain", "data", "transitland", type, term], result);
          msg.reply(`By "${term}", I assume you meant "${result.name}"`);
        });
    });
});

module.exports = {
  mutateUrl,
  matchOrRecurse,
  matchType,
  findType,
};

