var Q = require('q');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var Handlebars = require('handlebars');

var pathHelper = require('./pathHelper');

var metaFileName = 'meta.json';
var components = [];
var rootPath = require('./metaHolder').getConfig('modulePath');

function loadBowerFiles(metaData, lessFiles, jsFiles) {
    var requireFiles = metaData.requireFiles;
    if (!!requireFiles && !!requireFiles.length) {
        var bowerCss = [];
        var bowerJs = [];
        requireFiles.forEach(function (file) {
            var relativePath = path.join('/', file);
            var extension = path.extname(file);
            switch (extension) {
                case '.css':
                case '.less':
                    bowerCss.push({
                        servePath: relativePath,
                        fromBower: true
                    });
                    break;
                case '.js':
                    bowerJs.push({
                        servePath: relativePath,
                        fromBower: true
                    });
                    break;
                default :
                    console.error('ignore not register bower file: ', relativePath);
            }
        });
        return {
            lessFiles: bowerCss.concat(lessFiles),
            jsFiles: bowerJs.concat(jsFiles)
        }
    }
}

function loadMoreFileInfo(resourceInfo) {
    var name = path.basename(resourceInfo.servePath);
    resourceInfo.name = name;

    if (!!resourceInfo.fromBower) {
        return Q(resourceInfo);
    }

    return Q.nfcall(fs.readFile, resourceInfo.fullPath, "utf-8")
        .then(function (content) {
            resourceInfo.content = content;
            return resourceInfo;
        })

}


function serveModule(router, relativePath, lessFiles, jsFiles, jsonData, mainTpl, metaData) {
    var layoutPath = pathHelper.getLayoutPath('module.hbs');
    console.info('serve module: ', relativePath);

    var renderPath = path.join(relativePath, '/render');

    function serveOnlyRender() {
        router.get(renderPath, function (req, res, next) {
            var lessFiles2 = _.clone(lessFiles);
            var jsFiles2 = _.clone(jsFiles);
            var config = _.assign({
                lessFiles: lessFiles2,
                jsFiles: jsFiles2,
                layout: layoutPath
            }, jsonData);
            Q.all([
                Q.nfcall(fs.readFile, layoutPath, "utf-8"),
                Q.nfcall(fs.readFile, mainTpl.fullPath, "utf-8")
            ]).spread(function (layoutSource, content) {
                Handlebars.registerPartial('body', content);
                var template = Handlebars.compile(layoutSource);
                var html = template(config);
                res.set('Content-Type', 'text/html');
                res.send(html);
            }).catch(function (err) {
                res.status(500).send(e.stack);
            });
        });
    }

    function serveDetail() {
        router.get(relativePath, function (req, res, next) {
            var config = {
                meta: metaData,
                data: jsonData,
                layout: pathHelper.getLayoutPath('main'),
                renderServePath: renderPath
            };
            Q.all([
                Q.all(_.map(lessFiles, function (item) {
                    return loadMoreFileInfo(item);
                })),
                Q.all(_.map(jsFiles, function (item) {
                    return loadMoreFileInfo(item);
                })),
                loadMoreFileInfo(mainTpl)
            ]).spread(function (lessFiles, jsFiles, mainTpl) {
                config.lessFiles = _.filter(lessFiles, function (item) {
                    return !item.fromBower;
                });
                config.jsFiles = _.filter(jsFiles, function (item) {
                    return !item.fromBower;
                });
                ;
                config.mainTpl = mainTpl;
                res.render('detail', config);
            }).catch(function (err) {
                res.status(500).send(e.stack);
            });
        });
    }

    serveOnlyRender();
    serveDetail();
}

function loadModuleInfo(modulePath, router) {
    var mainTpl;
    var lessFiles = [];
    var jsFiles = [];
    var jsonData = {};

    var dirs = fs.readdirSync(modulePath);
    dirs.forEach(function (fileName) {
        var fullPath = path.join(modulePath, fileName);
        var relativeFilePath = '/' + path.relative(rootPath, fullPath);
        var extension = path.extname(fileName);

        switch (extension) {
            //case '.html':
            case '.hbs':
                if (mainTpl != null) {
                    throw  new Error('[' + modulePath + '] should only have one template file!');
                }
                mainTpl = {
                    servePath: fullPath,
                    fullPath: fullPath
                };
                break;
            case '.less':
                lessFiles.push({
                    servePath: relativeFilePath,
                    fullPath: fullPath
                });
                break;
            case '.js':
                jsFiles.push({
                    servePath: relativeFilePath,
                    fullPath: fullPath
                });
                break;
            case '.json':
                if (fileName !== metaFileName) {
                    var name = path.basename(fileName, extension);
                    var data = require(fullPath);
                    jsonData[name] = data;
                }
                break;
        }
    });

    if (!mainTpl) {
        console.error('[' + modulePath + '] does not include a template file, ignore ..');
        return;
    }
    var metaData = require(path.join(modulePath, metaFileName));
    //bower files
    var requireFiles = loadBowerFiles(metaData, lessFiles, jsFiles);
    lessFiles = requireFiles.lessFiles;
    jsFiles = requireFiles.jsFiles;

    var relativePath = '/' + path.relative(rootPath, modulePath);

    function getFileNameNoExt() {
        return path.basename(mainTpl.servePath, path.extname(mainTpl.servePath));
    }

    metaData.serveName = metaData.name || getFileNameNoExt();
    serveModule(router, relativePath, lessFiles, jsFiles, jsonData, mainTpl, metaData);

    components.push({
        relativePath: relativePath,
        name: metaData.serveName
    });
}

function iterateDir(currentDir, router) {
    var dirs = fs.readdirSync(currentDir);
    dirs.forEach(function (fileName) {
        var fullPath = path.join(currentDir, fileName);
        if (fs.lstatSync(fullPath).isFile()) {
            return;
        }
        if (fs.existsSync(path.join(fullPath, metaFileName))) {
            loadModuleInfo(fullPath, router);
        } else {
            iterateDir(fullPath, router);
        }
    });
}

function init(routes){
    components=[];
    //TODO remove not used router
    //for (k in routes.get) {
    //    console.log('output old router:');
    //    console.log(routes.get[k].path);
    //    //if (routes.get[k].path + "" === route + "") {
    //    //    routes.get.splice(k,1);
    //    //    break;
    //    //}
    //}
}

function scan(router) {
    init(router);
    iterateDir(rootPath, router);
}

function getComponents() {
    return components;
}

exports.scan = scan;
exports.getComponents = getComponents;