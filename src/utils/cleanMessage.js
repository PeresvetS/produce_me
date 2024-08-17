function cleanMessage(message) {
    // Удаляем маркеры вида 【74:6†source】
    return message.replace(/【\d+:\d+†[^】]+】/g, '').trim();
  }

  module.exports = cleanMessage;