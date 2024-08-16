// src/services/goApi/index.js

const messageService = require('./src/messageService');
const fileService = require('./src/fileService');
const conversationService = require('./src/conversationService');

module.exports = {
  sendMessage: messageService.sendMessage,
  resetConversation: conversationService.resetConversation,
  getConversationLog: conversationService.getConversationLog,
  sendFile: fileService.sendFile,
  processVoiceMessage: fileService.processVoiceMessage
};