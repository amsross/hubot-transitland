"use strict";
const assert = require("assert");
const proxyquire = require("proxyquire").noPreserveCache();
const r = require("ramda");
const sinon = require("sinon");
const url = require("url");

describe("stops", () => {

  describe("mutateStopsUrl", () => {
    const {mutateStopsUrl} = require("../lib/stops");

    it("should mutate the url as expected", () => {

      const input = url.parse("https://transit.land/api/v1/stops?offset=0&per_page=100&sort_key=id&sort_order=asc&served_by_vehicle_types=rail&served_by=foo", true);
      const output = url.parse(mutateStopsUrl("sample_one_stop_id", input), true);

      assert.deepEqual(output.query, {
        offset: "0",
        per_page: "100",
        served_by: "sample_one_stop_id",
        served_by_vehicle_types: "rail",
        sort_key: "id",
        sort_order: "asc",
      });
    });
  });

  describe("findStops", () => {
    let stubs, findType, findStop;

    beforeEach(() => {
      stubs = {
        "./utils": {
          "findType": sinon.spy(() => () => {}),
        }
      };
      ({findStop} = proxyquire("../lib/stops", stubs));
    });

    it("should use findType with type set to \"stops\"", () => {
      findStop();
      assert.equal(r.path(["./utils", "findType", "calledOnce"], stubs), true);
      assert.equal(r.path(["./utils", "findType", "args", "0"], stubs), "stops");
    });
  });
});
