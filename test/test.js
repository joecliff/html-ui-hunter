var path = require('path');

var server = require('../index.js');
server.start(path.resolve('./public'), 3000, true);