"use strict";
const r = require("ramda");
const {findType, mutateUrl} = require("./utils");

// expects a one_schedule_id for the operator, and a Url object
const mutateSchedulesUrl = r.curry((stopOsid, now) => {
  const between = now.format("HH:mm:00") + "," + now.clone().endOf("d").format("HH:mm:00");
  return r.compose(
      mutateUrl,
      r.evolve({
        "query": {
          "origin_onestop_id": r.always(stopOsid),
          "origin_departure_between": r.always(between),
          "date": r.always(now.format("YYYY-MM-DD")),
        },
      }));
});

const findSchedule = findType("schedules");

module.exports = {
  mutateSchedulesUrl,
  findSchedule,
};

