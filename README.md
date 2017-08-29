# harbaror

`harbaror` is a simple utility for transforming webhooks to easily build webhook-style integrations between services.

# License

[![GPLv3](https://www.gnu.org/graphics/gplv3-127x51.png)](https://www.gnu.org/licenses/gpl-3.0.en.html)

```
Copyright (C) 2017  Matt Coffin <mcoffin13@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
```

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

## Filter regex dereferencing

```yaml
webhooks:
  - requests:
      - method: POST
        host: someorganization.hipchat.com
        port: 443
        protocol: "https:"
        headers:
          'Content-Type': application/json
        path: /v2/room/1234/notification?auth_token=foobar-token
        body:
          color: green
          message_format: html
          message: "A {{filter.0.matches.1}} was edited"
        filter:
          - query: body.message
            pattern: ".*edited this (\\w+)$"
```
