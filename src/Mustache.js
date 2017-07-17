"use strict";

const Mustache = require('mustache');

// module Mustache

function renderEff(template) {
    return function (view) {
        return function () {
            return Mustache.render(template, view);
        };
    };
}

exports.renderEff = renderEff;
