// src/services/message/index.js

const messageService = require('./src/messageService');
const fileService = require('./src/fileService');
const conversationService = require('./src/conversationService');
const promptSelectionService = require('./src/promptSelectionService');
const documentReaderService = require('./src/documentReaderService');

module.exports = {
  ...messageService,
  ...fileService,
  ...conversationService,
  ...promptSelectionService,
  ...documentReaderService,
};