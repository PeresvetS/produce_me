// src/services/management/index.js

const dataManagementService = require('./src/dataManagementService');
const adminService = require('./src/adminService');
const dialogService = require('./src/dialogService');

module.exports = {
    ...dataManagementService,
    ...adminService,
    ...dialogService,
};