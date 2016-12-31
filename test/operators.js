"use strict";
const d = require("dotty");
const h = require("highland");
const r = require("ramda");
const assert = require("assert");
const proxyquire = require("proxyquire").noPreserveCache();
const sinon = require("sinon");

describe("operators", () => {
  let msg;
  let result;

  beforeEach(() => {
    msg = {
      "robot": {},
      "send": sinon.spy(r.T),
    };
    result = {
      "operators": [{
        "name": "Caltrain",
        "short_name": null,
        "onestop_id": "o-9q9-caltrain",
        "timezone": "America/Los_Angeles",
      }, {
        "name": "Bay Area Rapid Transit",
        "short_name": "BART",
        "onestop_id": "o-9q9-bart",
        "timezone": "America/Los_Angeles",
      }],
      "meta": {
        "sort_key": "id",
        "sort_order": "asc",
        "offset": 0,
        "per_page": 2,
        "next": "https://transit.land/api/v1/operators?offset=2&per_page=2&sort_key=id&sort_order=asc"
      }
    };
  });

  describe("matchOperator", function() {
    let operators = proxyquire("../lib/operators", {});

    it("expected method should exist", () => {
      assert(operators.matchOperator, "matchOperator method exists");
    });

    it("should match the specified operator", done => {

      h([
        operators.matchOperator("operators", "rapid transit", result)
          .compact().otherwise([{}])
          .tap(match => assert.equal(match.name, "Bay Area Rapid Transit", "match on partial name")),
        operators.matchOperator("operators", "bart", result)
          .compact().otherwise([{}])
          .tap(match => assert.equal(match.short_name, "BART", "match on short_name")),
        operators.matchOperator("operators", "caltrane", result)
          .compact().otherwise([{}])
          .tap(match => assert.equal(match.name, "Caltrain", "match on name")),
      ])
        .merge()
        .done(done);
    });
  });

  describe("findOperator", () => {
    let operators;
    let stubs;

    beforeEach(() => {
      stubs = {
        "request": {
          "get": sinon.spy((endpoint, cb) => cb(null, {}, JSON.stringify(result))),
        },
        "./utils": {
          "matchOrRecurse": sinon.spy(() => () => h([])),
        },
      };
      operators = proxyquire("../lib/operators", stubs);
    });

    it("expected method should exist", () => {
      assert(operators.findOperator, "findOperator method exists");
    });

    it("should return the operator from the brain if possible", done => {

      d.put(msg.robot, ["brain", "data", "transitland", "operators", "Custom Term"], {
        "name": "Custom Term Name",
      });

      operators.findOperator(msg, "operators", "Custom Term", "http://example.com/api/operators")
        .compact().otherwise({})
        .tap(operator => assert.equal(operator.name, "Custom Term Name"))
        .done(done);
    });

    it("should try make a request to the provided endpoint", done => {

      d.put(msg.robot, ["brain", "data", "transitland", "operators", "unmatched"], undefined);

      operators.findOperator(msg, "operators", "unmatched", "http://example.com/api/operators")
        .compact().otherwise([{}])
        .tap(() => {
          assert.equal(r.path(["request", "get", "calledOnce"], stubs), true, "request.get was called");
          assert.equal(r.path(["request", "get", "firstCall", "args", 0], stubs), "http://example.com/api/operators");
        })
        .done(done);
    });

    it("should try to match or recurse", done => {

      d.put(msg.robot, ["brain", "data", "transitland", "operators", "unmatched"], undefined);

      operators.findOperator(msg, "operators", "unmatched", "http://example.com/api/operators")
        .compact().otherwise([{}])
        .tap(() => {
          assert.equal(r.path(["./utils", "matchOrRecurse", "calledOnce"], stubs), true, "matchOrRecurse was called");
        })
        .done(done);
    });

    it("should store the result in the brain", done => {

      stubs["./utils"]["matchOrRecurse"] = sinon.spy(() => () => h([{
        "name": "Custom Term Name",
      }]));
      d.put(msg.robot, ["brain", "data", "transitland", "operators", "Custom Term"], undefined);

      operators.findOperator(msg, "operators", "Custom Term", "http://example.com/api/operators")
        .compact().otherwise({})
        .tap(operator => {
          assert.equal(operator.name, "Custom Term Name");
          assert.equal(d.get(msg.robot, ["brain", "data", "transitland", "operators", "Custom Term", "name"]), "Custom Term Name");
          assert.equal(r.path(["send", "calledOnce"], msg), true, "msg.send was called");
          assert.equal(r.path(["send", "firstCall", "args", 0], msg), "By \"Custom Term\", I assume you meant \"Custom Term Name\"");
        })
        .done(done);
    });
  });
});
