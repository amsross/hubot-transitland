"use strict";
const assert = require("assert");
const m = require("moment-timezone");
const proxyquire = require("proxyquire").noPreserveCache();
const r = require("ramda");
const sinon = require("sinon");
const url = require("url");

describe("schedules", () => {

  describe("mutateSchedulesUrl", () => {
    const {mutateSchedulesUrl} = require("../lib/schedules");

    it("should mutate the url as expected", () => {

      const input = url.parse("https://transit.land/api/v1/schedule_stop_pairs?offset=0&per_page=100&sort_key=origin_arrival_time&sort_order=asc&origin_onestop_id=foo&origin_departure_between=foo&date=foo", true);
      const output = url.parse(mutateSchedulesUrl("sample_one_stop_id", m(1483377338000).tz("America/New_York"))(input), true);

      assert.deepEqual(output.query, {
        offset: "0",
        per_page: "100",
        origin_onestop_id: "sample_one_stop_id",
        origin_departure_between: "12:15:00,23:59:00",
        date: "2017-01-02",
        sort_key: "origin_arrival_time",
        sort_order: "asc",
      });
    });
  });

  describe("findSchedules", () => {
    let stubs, findSchedule;

    beforeEach(() => {
      stubs = {
        "./utils": {
          "findType": sinon.spy(() => () => {}),
        }
      };
      ({findSchedule} = proxyquire("../lib/schedules", stubs));
    });

    it("should use findType with type set to \"schedules\"", () => {
      findSchedule();
      assert.equal(r.path(["./utils", "findType", "calledOnce"], stubs), true);
      assert.equal(r.path(["./utils", "findType", "args", "0"], stubs), "schedules");
    });
  });
});

