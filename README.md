#Html UI Hunter

  A handy tool for collecting html ui fragments based on [node](http://nodejs.org).

```js
var server = require('html-ui-hunter');
var path = require('path');

server.start(path.resolve('./public'), 3000, true);
```

### Installation

```bash
$ npm install html-ui-hunter
```