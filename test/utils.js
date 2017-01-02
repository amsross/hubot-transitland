"use strict";
const d = require("dotty");
const h = require("highland");
const r = require("ramda");
const assert = require("assert");
const proxyquire = require("proxyquire").noPreserveCache();
const sinon = require("sinon");

describe("utils", () => {
  let msg, result, stubs;
  let matchOrRecurse, matchType, findType;

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
    stubs = {
      "request": {
        "get": sinon.stub()
      },
    };
    stubs.request.get.onFirstCall().callsArgWith(1, null, {}, JSON.stringify(r.evolve({
      "operators": r.init,
    }, result)));
    stubs.request.get.onSecondCall().callsArgWith(1, null, {}, JSON.stringify(r.evolve({
      "operators": r.tail,
    }, result)));
    stubs.request.get.callsArgWith(1, null, {}, "{}");

    ({matchOrRecurse, matchType, findType} = proxyquire("../lib/utils", stubs));
  });

  describe("matchOrRecurse", () => {
    const matcher = r.always(h([{"name": "from matcher"}]));
    const recurser = r.always(h([{"name": "from recurser"}]));
    const empty = r.always(h([]));

    it("expected methods should exist", () => {
      assert(matchOrRecurse, "matchOrRecurse method exists");
    });

    it("should return the matched value", (done) => {
      matchOrRecurse(matcher, empty, "operators", msg, "BART", result)
        .compact().otherwise([{}])
        .tap(match => assert.equal(match.name, "from matcher", "match from matcher function"))
        .done(done);
    });

    it("should return the matched value after recursing", done => {
      matchOrRecurse(empty, recurser, "operators", msg, "BART", result)
        .compact().otherwise([{}])
        .tap(match => assert.equal(match.name, "from recurser", "match from recursor function"))
        .done(done);
    });
  });

  describe("matchType", function() {

    it("expected method should exist", () => {
      assert(matchType, "matchType method exists");
    });

    it("should match the specified operator", done => {

      h([
        matchType("operators", "rapid transit", result)
          .compact().otherwise([{}])
          .tap(match => assert.equal(match.name, "Bay Area Rapid Transit", "match on partial name")),
        matchType("operators", "bart", result)
          .compact().otherwise([{}])
          .tap(match => assert.equal(match.short_name, "BART", "match on short_name")),
        matchType("operators", "caltrane", result)
          .compact().otherwise([{}])
          .tap(match => assert.equal(match.name, "Caltrain", "match on name")),
      ])
        .merge()
        .done(done);
    });
  });

  describe("findType", () => {

    it("expected method should exist", () => {
      assert(findType, "findType method exists");
    });

    it("should return the operator from the brain if possible", done => {

      d.put(msg.robot, ["brain", "data", "transitland", "operators", "Custom Term"], {
        "name": "Custom Term Name",
      });

      findType("operators", msg, "Custom Term", "http://example.com/api/operators")
        .compact().otherwise({})
        .tap(operator => assert.equal(operator.name, "Custom Term Name"))
        .done(done);
    });

    it("should try make a request to the provided endpoint", done => {

      d.put(msg.robot, ["brain", "data", "transitland", "operators", "Caltrain"], undefined);

      findType("operators", msg, "Caltrain", "http://example.com/api/operators")
        .compact().otherwise([{}])
        .tap(() => {
          assert.equal(r.path(["request", "get", "calledOnce"], stubs), true, "request.get was called");
          assert.equal(r.path(["request", "get", "firstCall", "args", 0], stubs), "http://example.com/api/operators");
        })
        .done(done);
    });

    it("should recurse if no match was found", done => {

      d.put(msg.robot, ["brain", "data", "transitland", "operators", "BART"], undefined);

      findType("operators", msg, "BART", "http://example.com/api/operators")
        .compact().otherwise([{}])
        .tap(() => {
          assert.equal(r.path(["request", "get", "calledTwice"], stubs), true, "matchOrRecurse was called");
          assert.equal(r.path(["request", "get", "firstCall", "args", 0], stubs), "http://example.com/api/operators");
          assert.equal(r.path(["request", "get", "secondCall", "args", 0], stubs), result.meta.next);
        })
        .done(done);
    });

    it("should store the result in the brain", done => {

      d.put(msg.robot, ["brain", "data", "transitland", "operators", "Caltrain"], undefined);

      findType("operators", msg, "Caltrain", "http://example.com/api/operators")
        .compact().otherwise({})
        .tap(operator => {
          assert.equal(operator.name, "Caltrain");
          assert.equal(d.get(msg.robot, ["brain", "data", "transitland", "operators", "Caltrain", "name"]), "Caltrain");
          assert.equal(r.path(["send", "calledOnce"], msg), true, "msg.send was called");
          assert.equal(r.path(["send", "firstCall", "args", 0], msg), "By \"Caltrain\", I assume you meant \"Caltrain\"");
        })
        .done(done);
    });
  });
});

