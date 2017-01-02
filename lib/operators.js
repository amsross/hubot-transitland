"use strict";
const {findType, mutateUrl} = require("./utils");

const mutateOperatorsUrl = mutateUrl;

const findOperator = findType("operators");

module.exports = {
  findOperator,
  mutateOperatorsUrl,
};
