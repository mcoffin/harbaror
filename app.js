const express = require('express');
const args = require('minimist')(process.argv.slice(2));
const bodyParser = require('body-parser');
const Lazy = require('lazy.js');
const _ = require('lodash');
const { readConfig, makeFilter } = require('./lib/config');
const { renderAll } = require('./lib/utils');
const { performRequest } = require('./lib/http');
const http = require('http');

var app = express();

function maybeRequest(req, res, view, requestConfig) {
    const filters = Lazy(requestConfig.filter || []).map(makeFilter);
    let views = Lazy([view]);
    if (requestConfig.split) {
        const splits = _.get(view, requestConfig.split.query);
        views = Lazy(splits).map(split => {
            return {
                split: split,
                root: view
            };
        });
    }
    const promises = views
        .filter(v => filters.every(f => f(req, v)))
        .map(v => renderAll(v, requestConfig))
        .map(performRequest);
    return Promise.all(promises.toArray());
}

readConfig(args['config']).then(config => {
    const webhooks = express();
    webhooks.use(bodyParser.json());
    Lazy(config.webhooks).each(webhook => {
        webhooks[webhook.hook.method.toLowerCase()](webhook.hook.path, (req, res) => {
            const view = _.merge(req.body, req.query);
            const responses = Lazy(webhook.requests)
                .map(_.curry(maybeRequest)(req, res, view))
                .toArray();
            Promise.all(responses)
                .then(() => res.status(200).json("{}"))
                .catch(e => res.status(503).json({error: e}));
        });
    });
    app.use('/webhooks', webhooks);

    const port = parseInt(config['port'] || '8080', 10);
    http.createServer(app).listen(port, config['bind-address']);
});
