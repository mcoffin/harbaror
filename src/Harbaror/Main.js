"use strict";

// module Harbaror.Main

var _ = require('lodash');

function testExclusion(query) {
    return function (regex) {
        return function (obj) {
            return regex.test(_.get(obj, query));
        };
    };
}

exports.testExclusion = testExclusion
