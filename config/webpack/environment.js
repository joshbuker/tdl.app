const { config, environment } = require('@rails/webpacker');
const { VueLoaderPlugin } = require('vue-loader');
const erb = require('./loaders/erb');
const vue = require('./loaders/vue');
// const sass = require('./loaders/sass');
const WebpackerPwa = require('webpacker-pwa');

environment.plugins.prepend('VueLoaderPlugin', new VueLoaderPlugin());
environment.loaders.prepend('vue', vue);
environment.loaders.prepend('erb', erb);
// environment.loaders.prepend('sass', sass);
environment.config.resolve.alias = { 'vue$': 'vue/dist/vue.esm.js' };
module.exports = environment;

new WebpackerPwa(config, environment);
