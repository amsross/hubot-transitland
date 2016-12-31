"use strict";
const h = require("highland");
const r = require("ramda");
const assert = require("assert");
const utils = require("../lib/utils");

describe("utils", () => {
  let msg;
  let result;

  beforeEach(() => {
    msg = {"robot": {}};
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

  it("expected methods should exist", () => {
    assert(utils.matchOrRecurse, "matchOrRecurse method exists");
  });

  describe("matchOrRecurse", () => {
    const matcher = r.always(h([{"name": "from matcher"}]));
    const recurser = r.always(h([{"name": "from recurser"}]));
    const empty = r.always(h([]));

    it("should return the matched value", (done) => {
      utils.matchOrRecurse(matcher, empty, msg, "operators", "BART", result)
        .compact().otherwise([{}])
        .tap(match => assert.equal(match.name, "from matcher", "match from matcher function"))
        .done(done);
    });

    it("should return the matched value after recursing", done => {
      utils.matchOrRecurse(empty, recurser, msg, "operators", "BART", result)
        .compact().otherwise([{}])
        .tap(match => assert.equal(match.name, "from recurser", "match from recursor function"))
        .done(done);
    });
  });
});

