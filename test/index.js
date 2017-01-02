"use strict";
const assert = require("assert");
const d = require("dotty");
const h = require("highland");
const proxyquire = require("proxyquire").noPreserveCache();
const r = require("ramda");
const sinon = require("sinon");

describe("transitland", () => {
  let msg, robot, stubs, transitland;

  beforeEach(function() {
    msg = {
      "robot": robot,
      "reply": sinon.spy(),
    };
    robot = {
      "commands": [],
      "respond": (expression, fn) => {
        robot.commands.push([expression, fn]);
      },
      "tell": sinon.spy((string, msg) => {
        const out = r.find(r.compose(
              r.flip(r.test)(string),
              r.head), robot.commands);
        return r.last(out)(msg);
      }),
    };
    stubs = {
      "request": {
        "get": (endpoint, cb) => {
          cb(null, {}, JSON.stringify({
            "schedule_stop_pairs": [{
              "trip_headsign": "Lindenwold",
              "origin_departure_time": "22:22:00",
            }, {
              "trip_headsign": "Lindenwold",
              "origin_departure_time": "22:42:00",
            }, {
              "trip_headsign": "Lindenwold",
              "origin_departure_time": "23:02:00",
            }]
          }));
        },
      },
      "./operators": {
        "findOperator": sinon.spy(r.always(h([{
          "name": "Port Authority Transit Corporation",
          "short_name": "PATCO",
          "onestop_id": "o-dr4e-portauthoritytransitcorporation",
          "timezone": "America/New_York",
        }]))),
      },
      "./stops": {
        "findStop": sinon.spy(r.always(h([{
          "onestop_id": "s-dr4e382mxm-15~16thandlocust",
          "name": "15-16th and Locust",
        }]))),
      },
    };
    transitland = proxyquire("../lib/index", stubs);
    transitland(robot);
  });

  describe( "find next times for requested stop", () => {

    it( "should respond with the upcoming times until EOD", done => {
      msg = r.merge(msg, {
        "reply": sinon.spy(message => {
          assert.equal(r.path(["reply", "calledOnce"], msg), true);
          assert.equal("The next trains from 15-16th and Locust are 10:22pm to Lindenwold, 10:42pm to Lindenwold, 11:02pm to Lindenwold", message);
          done();
        }),
        "match": [
          "next train on patco from 15-16th and Locust",
          "patco",
          "15-16th and Locust",
        ],
      });

      robot.tell("next train on patco from 15-16th and Locust", msg);
    });
  });

  describe("forget transit stops and lines", () => {

    beforeEach(() => {
      d.put(robot, "brain.data.transitland.operators.patco", "o-dr4e-portauthoritytransitcorporation");
      d.put(robot, "brain.data.transitland.stops.15th 16th and locust", "s-dr4e382mxm-15~16thandlocust");
    });

    it("should remove any remembered operators", done => {
      msg = r.merge(msg, {
        "reply": sinon.spy(message => {
          assert.equal(r.path(["reply", "calledOnce"], msg), true);
          assert.equal("Oh shit! I forgot all the transit operators!", message);
          assert.equal(r.path(["brain", "data", "transitland", "operators", "patco"], robot), undefined);
          done();
        }),
        "match": [
          "forget all transit operators",
          "operator",
        ],
      });

      robot.tell("forget all transit operators", msg);
    });

    it("should remove any remembered stops", done => {
      msg = r.merge(msg, {
        "reply": sinon.spy(message => {
          assert.equal(r.path(["reply", "calledOnce"], msg), true);
          assert.equal("Oh shit! I forgot all the transit stops!", message);
          assert.equal(r.path(["brain", "data", "transitland", "stops", "15th 16th and locust"], robot), undefined);
          done();
        }),
        "match": [
          "forget all transit stops",
          "stop",
        ],
      });

      robot.tell("forget all transit stops", msg);
    });
  });
});

