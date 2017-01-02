"use strict";
const assert = require("assert");
const proxyquire = require("proxyquire").noPreserveCache();
const r = require("ramda");
const sinon = require("sinon");
const url = require("url");

describe("operators", () => {

  describe("mutateOperatorsUrl", () => {
    const {mutateOperatorsUrl} = require("../lib/operators");

    it("should mutate the url as expected", () => {

      const input = url.parse("https://transit.land/api/v1/operators?offset=0&per_page=100&sort_key=id&sort_order=asc", true);
      const output = url.parse(mutateOperatorsUrl(input), true);

      assert.deepEqual(output.query, {
        offset: "0",
        per_page: "100",
        sort_key: "id",
        sort_order: "asc",
      });
    });
  });

  describe("findOperators", () => {
    let stubs, findOperator;

    beforeEach(() => {
      stubs = {
        "./utils": {
          "findType": sinon.spy(() => () => {}),
        }
      };
      ({findOperator} = proxyquire("../lib/operators", stubs));
    });

    it("should use findType with type set to \"operators\"", () => {
      findOperator();
      assert.equal(r.path(["./utils", "findType", "calledOnce"], stubs), true);
      assert.equal(r.path(["./utils", "findType", "args", "0"], stubs), "operators");
    });
  });
});
