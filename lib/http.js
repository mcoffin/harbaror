class HttpResponse {
    constructor(response, body) {
        this.response = response;
        this.body = body;
    }

    get isSuccess() {
        return this.response.statusCode >= 200 && this.response.statusCode < 300;
    }

    get summary() {
        return {
            statusCode: this.response.statusCode,
            statusMessage: this.response.statusMessage,
            headers: this.response.headers,
            body: this.body
        };
    }
}

function performRequest(requestOptions) {
    const proto = requestOptions.protocol;
    const http = require(proto.replace(':', ''));

    return new Promise((resolve, reject) => {
        const req = http.request(requestOptions, (res) => {
            let chunks = [];
            res.on('error', reject);
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(new HttpResponse(res, chunks.join())));
        });
        req.on('error', reject);
        req.write(requestOptions.body, 'utf8');
        req.end();
    });
}

exports.HttpResponse = HttpResponse;
exports.performRequest = performRequest;
