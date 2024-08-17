// src/services/goApi/index.js

const subscriptionService = require('./src/subscriptionService');
const subscriptionCacheService = require('./src/subscriptionCacheService');

module.exports = {
    ...subscriptionCacheService,
    ...subscriptionService
};