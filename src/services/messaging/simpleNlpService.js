// src/services/memory/simpleNlpService.js

const natural = require('natural');
const logger = require('../../utils/logger');

class SimpleNlpService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.keywordsList = [
      'важно', 'ключевой', 'основной', 'главный', 'критический',
      'цель', 'задача', 'проблема', 'решение', 'результат',
      'изменение', 'улучшение', 'развитие', 'прогресс', 'успех'
    ];
    this.keywords = new Set(this.keywordsList.map(word => this.stemmer.stem(word)));
  }

  analyzeText(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
    
    const foundKeywords = stemmedTokens.filter(token => this.keywords.has(token));
    
    logger.info(`Found keywords: ${foundKeywords.join(', ')}`);
    
    return foundKeywords.length > 0;
  }
}

module.exports = new SimpleNlpService();