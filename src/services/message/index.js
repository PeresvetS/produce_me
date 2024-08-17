// src/services/message/index.js

const messageService = require('./src/messageService');
const fileService = require('./src/fileService');
const conversationService = require('./src/conversationService');
const promptSelectionService = require('./src/promptSelectionService');

module.exports = {
  ...messageService,
  ...fileService,
  ...conversationService,
  ...promptSelectionService,
};