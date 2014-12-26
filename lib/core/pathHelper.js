var _ = require('lodash');
var path = require('path');

exports.getLayoutPath = function (name) {
    return path.join(__dirname,'../views/layouts/',name);
};