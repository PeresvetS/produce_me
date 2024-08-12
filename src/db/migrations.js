// src/db/migrations.js

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrationDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Создаем таблицу для отслеживания миграций, если она еще не существует
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Получаем список выполненных миграций
    const { rows } = await client.query('SELECT name FROM migrations');
    const executedMigrations = new Set(rows.map(row => row.name));

    // Читаем файлы миграций из директории
    const files = await fs.readdir(migrationDir);
    const migrationFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of migrationFiles) {
      if (!executedMigrations.has(file)) {
        const filePath = path.join(migrationDir, file);
        const sql = await fs.readFile(filePath, 'utf-8');

        logger.info(`Выполняется миграция: ${file}`);
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          logger.info(`Миграция ${file} успешно выполнена`);
        } catch (error) {
          await client.query('ROLLBACK');
          logger.error(`Ошибка при выполнении миграции ${file}:`, error);
          throw error;
        }
      }
    }
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };