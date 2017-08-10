const mustache = require('mustache');
const Lazy = require('lazy.js');
const _ = require('lodash');

function appendArgs(a) {
    return Array.prototype.slice.call(a, 0).concat(Array.prototype.slice.call(arguments, 1));
}

/**
 * Converts `f`, a callback-based asynchronous function, to a function that returns a promise
 */
function promisify(f) {
    return function () {
        let args = arguments;
        return new Promise((fulfill, reject) => {
            args = appendArgs(args, function (err, v) {
                if (err) {
                    reject(err);
                } else {
                    fulfill(v);
                }
            });
            f.apply(null, args);
        });
    };
}

function renderAll(view, obj) {
    if (_.isArray(obj)) {
        return Lazy(obj).map(v => renderAll(view, v)).toArray();
    } else if (_.isObject(obj)) {
        const result = {};
        Lazy(obj).pairs().each(([k, v]) => {
            const newKey = renderAll(view, k);
            const newValue = renderAll(view, v);
            result[newKey] = newValue;
        });
        return result;
    } else {
        if (_.isString(obj)) {
            return mustache.render(obj, view);
        } else {
            return obj;
        }
    }
}

exports.promisify = promisify;
exports.renderAll = renderAll;
