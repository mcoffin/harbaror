const fs = require('fs');
const { promisify } = require('./utils');
const _ = require('lodash');
const yaml = require('js-yaml');
const Lazy = require('lazy.js');

function isDefined(x) {
    return !_.isUndefined(x);
}

function blankView() {
    return {};
}

function makeFilter(config) {
    if (config.header) {
        const exp = new RegExp(config.pattern);
        return (req, view, filterView) => {
            const value = req.header(config.header);
            if (value) {
                filterView.matches = value.match(exp);
                if (filterView.matches) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        };
    } else if (config.query) {
        const exp = new RegExp(config.pattern);
        return (req, view, filterView) => {
            const value = _.get(view, config.query);
            if (value) {
                filterView.matches = value.match(exp);
                if (filterView.matches) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        };
    } else if (config.not) {
        const g = makeFilter(config.not);
        return (req, view, filterView) => {
            return !g(req, view, filterView);
        };
    } else if (config.and) {
        const gs = Lazy(config.and).map(makeFilter);
        return (req, view, filterView) => {
            filterView.branches = Lazy.range(0, gs.length()).map(blankView).toArray();
            return gs
                .zip(filterView.branches)
                .every(([g, fv]) => g(req, view, fv));
        };
    } else if (config.or) {
        const gs = Lazy(config.or).map(makeFilter);
        return (req, view, filterView) => {
            filterView.branches = Lazy.range(0, gs.length()).map(blankView).toArray();
            const found = gs
                .zip(filterView.branches)
                .map(([g, fv]) => g(req, view, fv))
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
