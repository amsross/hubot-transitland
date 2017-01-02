// Description:
//   patco.
//
// Dependencies:
//   fuse.js, highland, moment-timezone, ramda, request
//
// Configuration:
//   None
//
// Commands:
//   hubot next train on <operator> from <stop> - Find out the next train departure times
//   hubot forget all transit stops - Forget all the onestop ids for stops
//   hubot forget all transit operators - Forget all the onestop ids for operators
//
// Notes:
//  None
//
// Author:
//   Matt Ross <amsross@gmail.com>

const d = require("dotty");
const h = require("highland");
const m = require("moment-timezone");
const r = require("ramda");
const request = require("request");
const url = require("url");
const {findOperator, mutateOperatorsUrl} = require("./operators");
const {findStop, mutateStopsUrl} = require("./stops");
const {mutateSchedulesUrl} = require("./schedules");

const baseUrlOperators = url.parse("https://transit.land/api/v1/operators?offset=0&per_page=100&sort_key=id&sort_order=asc", true);
const baseUrlStops = url.parse("https://transit.land/api/v1/stops?offset=0&per_page=100&sort_key=id&sort_order=asc&served_by_vehicle_types=rail&served_by=foo", true);
const baseUrlSchedule = url.parse("https://transit.land/api/v1/schedule_stop_pairs?offset=0&per_page=100&sort_key=origin_arrival_time&sort_order=asc&origin_onestop_id=foo&origin_departure_between=foo&date=foo", true);

module.exports = function (robot) {

  robot.respond(/next train on (.*) from (.*)/i, function(msg) {
    var operator = msg.match[1].trim().toLowerCase();
    var stop = msg.match[2].trim().toLowerCase();

    if ( !operator || !stop ) {
      return msg.reply("You need to tell me the operator and the stop");
    }

    return findOperator(msg, operator, mutateOperatorsUrl(baseUrlOperators))
      .flatMap(operator => {

        const now = m().tz(r.prop("timezone", operator));

        return findStop(msg, stop, mutateStopsUrl(r.prop("onestop_id", operator), baseUrlStops))
          .flatMap(stop => {

            const schedulesUrl = mutateSchedulesUrl(r.prop("onestop_id", stop), now)(baseUrlSchedule);

            return h.wrapCallback(request.get, r.nthArg(1))(schedulesUrl)
              .compact()
              .map(JSON.parse)
              // if there aren't any operators, we can't do anything
              .filter(r.path(["schedule_stop_pairs"]))
              .otherwise(() => {throw new Error(`invalid response from ${schedulesUrl}`);})
              .pluck(["schedule_stop_pairs"])
              .flatten()
              .take(5)
              .pick(["origin_departure_time", "trip_headsign"])
              .map(r.evolve({
                "origin_departure_time": time => {
                  return m(now.format("YYYY-MM-DD ") + time).format("hh:mma");
                }
              }))
              .map(r.values)
              .invoke("join", [" to "])
              .collect()
              .map(trains => {
                return "The next train" + ((r.length(trains) > 1) ? "s" : "")+ " from " + stop.name + " " + ((r.length(trains) > 1) ? "are" : "is") + " " + trains.join(", ");
              });
          });
      })
      .errors(err => {
        // just swallow this
        h.log(err);
      })
      .otherwise([
        "For whatever reason, I couldn't find anything like that.",
        "Maybe you should work on your communication skills.",
      ])
      .ratelimit(1, 500)
      .each(msg.reply.bind(msg));
  });

  robot.respond(/forget all transit (stop|operator)s/i, function(msg) {
    var type = msg.match[1].trim().toLowerCase();

    d.put( robot, "brain.data.transitland." + type + "s", {} );
    return msg.reply("Oh shit! I forgot all the transit " + type + "s!");
  });
};

