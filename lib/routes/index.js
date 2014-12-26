var express = require('express');
var router = express.Router();
var pathHelper = require('../core/pathHelper');

var metaHolder = require('../core/metaHolder');
var componentLoader = require('../core/componentLoader');

router.get('/', function (req, res, next) {
    var components=componentLoader.getComponents();
    res.render('index', {
        components: components,
        layout: pathHelper.getLayoutPath('main')
    });
});

componentLoader.scan(router);
require('watch').watchTree(metaHolder.getConfig('modulePath'), function (f, curr, prev) {
    if (typeof f == "object" && prev === null && curr === null) {
        // Finished walking the tree
    } else if (prev === null) {
        // f is a new file
        componentLoader.scan(router);
    } else if (curr.nlink === 0) {
        // f was removed
        componentLoader.scan(router);
    } else {
        // f was changed
        componentLoader.scan(router);
    }
});

//var watcher = chokidar.watch(metaHolder.getConfig('modulePath'), {ignored: /[\/\\]\./, persistent: true});
//function reloadRouter(path) {
//    componentLoader.scan(router);
//}
//watcher
//    .on('add', reloadRouter)
//    //.on('addDir', function(path) {console.log('Directory', path, 'has been added');})
//    .on('change', reloadRouter)
//    .on('unlink', reloadRouter)
//    .on('unlinkDir', reloadRouter)
//    //.on('error', function(error) {console.error('Error happened', error);})
//    //.on('ready', function() {console.info('Initial scan complete. Ready for changes.')})
//    //.on('raw', function(event, path, details) {console.info('Raw event info:', event, path, details)})


module.exports = router;
