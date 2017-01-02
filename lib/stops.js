"use strict";
const r = require("ramda");
const {findType, mutateUrl, matchOrRecurse} = require("./utils");

// expects a one_stop_id for the operator, and a Url object
const mutateStopsUrl = r.curry(r.binary(r.compose(
    mutateUrl,
    r.set(r.compose(r.lensProp("query"), r.lensProp("served_by"))))));

const findStop = findType("stops");

module.exports = {
  mutateStopsUrl,
  findStop,
};
