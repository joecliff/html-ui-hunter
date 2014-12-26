var metaHolder = require('./lib/core/metaHolder.js');

exports.start = function (modulePath, port, devMode) {
    metaHolder.initConfig(modulePath, port, devMode);

    var app = require('./lib/app');
    app.set('port', metaHolder.getConfig('port'));

    var server = app.listen(port, function () {
        console.log('Hunter server listening on port ' + server.address().port);
    });
};