const fs = require('fs');
const { promisify } = require('./utils');
const _ = require('lodash');
const yaml = require('js-yaml');

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
        }
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
