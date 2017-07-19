# harbaror

`harbaror` is a simple utility for transforming webhooks to easily build webhook-style integrations between services.

# Examples

## Pivotal tracker -> hipchat

```json
{
    "webhooks": [
        {
            "requestMethod": "POST",
            "requestUrl": "https://api.hipchat.com/v2/room/1234/notification?auth_token=foobar",
            "requestHeaders": {
                "Content-Type": "application/json"
            },
            "request": "{\"color\":\"green\",\"message_format\":\"html\",\"message\":\"{{message}}: {{#primary_resources}}(<a href=\\\"{{url}}\\\">{{id}}</a>) <b>{{name}}</b>{{/primary_resources}}\"}",
            "incomingPath": "/pivotal-to-hipchat",
            "incomingMethod": "post",
            "exclude": {
                "message": ".*edited this \\w+$"
            }
        },
    ],
    "port": 8080
}
```
