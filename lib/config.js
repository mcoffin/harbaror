const fs = require('fs');
const { promisify } = require('./utils');
const _ = require('lodash');
const yaml = require('js-yaml');
const Lazy = require('lazy.js');

function isDefined(x) {
    return !_.isUndefined(x);
}

function makeFilter(config) {
    if (config.header) {
        const exp = new RegExp(config.pattern);
        return (req) => {
            const value = req.header(config.header);
            return value && exp.test(value);
        };
    } else if (config.query) {
        const exp = new RegExp(config.pattern);
        return (req, view) => {
            const value = _.get(view, config.query);
            return value && exp.test(value);
        };
    } else if (config.not) {
        const g = makeFilter(config.not);
        return (req, view) => {
            return !g(req, view);
        };
    } else if (config.and) {
        const gs = Lazy(config.and).map(makeFilter);
        return (req, view) => {
            return gs.every(g => g(req, view));
        };
    } else if (config.or) {
        const gs = Lazy(config.or).map(makeFilter);
        return (req, view) => {
            const found = gs
                .map(g => g(req, view))
                .find(_.identity);
            return isDefined(found);
        };
    }
}

function readConfig(filename) {
    return promisify(fs.readFile)(filename, 'utf8').then(yaml.safeLoad).then(config => {
        // After reading the config and parsing it, we replace each body with the JSON stringified version of
        // itself if it's not already a string
        config.webhooks.forEach(webhook => {
            webhook.requests.forEach(request => {
                if (!_.isString(request.body)) {
                    request.body = JSON.stringify(request.body);
                }
            });
        });
        return config;
    });
}

exports.makeFilter = makeFilter;
exports.readConfig = readConfig;
