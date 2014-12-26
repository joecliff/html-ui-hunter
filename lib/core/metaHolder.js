var config = null;

module.exports = {
    initConfig: function (modulePath, port, devMode) {
        config = {
            modulePath:modulePath,
            port:port || 3000,
            devMode:devMode||false
        };
    },
    getConfig: function (key) {
        if (!config) {
            throw new Error('Meta data need to be initialized!')
        }
        return config[key];
    }

};
