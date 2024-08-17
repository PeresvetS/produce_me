// src/services/management/index.js

const dataManagementService = require('./src/dataManagementService');
const adminService = require('./src/adminService');

module.exports = {
    ...dataManagementService,
    ...adminService
};