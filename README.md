# harbaror

`harbaror` is a simple utility for transforming webhooks to easily build webhook-style integrations between services.

# Examples

## Pivotal tracker -> hipchat

```yaml
webhooks:
  - requests:
      - method: POST
        host: charterdev.hipchat.com
        port: 443
        protocol: "https:"
        headers:
          'Content-Type': application/json
        path: /v2/room/1234/notification?auth_token=foobar
        body: "{\"color\":\"green\",\"message_format\":\"html\",\"message\":\"{{body.message}}: {{#body.primary_resources}}(<a href=\\\"{{url}}\\\">{{id}}</a>) <b>{{name}}</b>{{/body.primary_resources}}\"}"
        filter:
          - not:
              query: body.message
              pattern: ".*edited this \\w+$"
    hook:
      path: /pivotal-to-hipchat
      method: POST
```

## Gitlab -> Pivotal tracker

```yaml
webhooks:
  - hook:
      path: /gitlab-to-pivotal
      method: POST
    requests:
      - method: POST
        host: www.pivotaltracker.com
        path: https://www.pivotaltracker.com/services/v5/source_commits
        protocol: "https:"
        port: 443
        headers:
          'Content-Type': application/json
          'X-TrackerToken': "{{root.body.tracker_token}}"
        body:
          source_commit:
            commit_id: "{{split.id}}"
            message: "{{split.message}}"
            author: "{{split.author.name}}"
            url: "{{split.url}}"
        filter:
          - header: X-Gitlab-Event
            pattern: Push Hook
          - query: body.object_kind
            pattern: ^push$
          - query: body.ref
            pattern: master$
        split:
          query: body.commits
```
