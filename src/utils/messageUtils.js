// src/utils/messageUtils.js

function cleanMessage(message) {
  // Удаляем маркеры вида 【74:6†source】
  return message.replace(/【\d+:\d+†[^】]+】/g, '').trim();
}

function escapeMarkdown(text) {
  // Список символов, которые нужно экранировать
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];

  // Экранируем все специальные символы, кроме двойных звездочек
  let escapedText = text.replace(/([_*[\]()~`>#\+\-=|{}.!])/g, '\\$1');

  // Преобразуем двойные звёздочки в одинарные
  escapedText = escapedText.replace(/\\\*\\\*/g, '*');

  // Оставляем одинарные звёздочки для выделения курсивом
  escapedText = escapedText.replace(/\\\*/g, '*');

  return escapedText;
}


module.exports = { cleanMessage, escapeMarkdown };