// src/services/diagramService.js

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const logger = require('../utils/logger');

const execPromise = util.promisify(exec);

class DiagramService {
  async createMindMapImage(jsonData) {
    try {
      const mermaidDefinition = this.convertJsonToMermaid(jsonData);
      const inputFile = path.join(__dirname, '../../temp', `mindmap_input_${Date.now()}.mmd`);
      const outputFile = path.join(__dirname, '../../temp', `mindmap_${Date.now()}.svg`);

      await fs.writeFile(inputFile, mermaidDefinition);

      const mmdc = path.join(__dirname, '../../node_modules/.bin/mmdc');
      const command = `${mmdc} -i ${inputFile} -o ${outputFile}`;

      await execPromise(command);

      const svgContent = await fs.readFile(outputFile);

      // Удаляем временные файлы
      await fs.unlink(inputFile);
      await fs.unlink(outputFile);

      return svgContent;
    } catch (error) {
      logger.error('Error creating mindmap image:', error);
      throw error;
    }
  }

  convertJsonToMermaid(jsonData) {
    let mermaidContent = 'mindmap\n';
    const rootNode = jsonData.nodeDataArray.find(node => node.key === 0);
    
    mermaidContent += this.addNode(rootNode, jsonData.nodeDataArray, 0);

    return mermaidContent;
  }

  addNode(node, allNodes, depth) {
    let content = '  '.repeat(depth) + `${node.text}\n`;
    const children = allNodes.filter(n => n.parent === node.key);
    
    children.forEach(child => {
      content += this.addNode(child, allNodes, depth + 1);
    });

    return content;
  }
}

module.exports = new DiagramService();