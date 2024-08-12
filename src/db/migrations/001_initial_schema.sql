-- src/db/migrations/001_initial_schema.sql

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица данных пользователей
CREATE TABLE IF NOT EXISTS user_data (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  key VARCHAR(255) NOT NULL,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, key)
);

-- Таблица диалогов
CREATE TABLE IF NOT EXISTS dialogs (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE,
  context JSONB
);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  dialog_id INTEGER REFERENCES dialogs(id),
  user_id BIGINT REFERENCES users(user_id),
  content TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для хранения результатов опроса
CREATE TABLE IF NOT EXISTS survey_results (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE INDEX idx_dialogs_user_id ON dialogs(user_id);
CREATE INDEX idx_messages_dialog_id ON messages(dialog_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_survey_results_user_id ON survey_results(user_id);

-- Триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_data_modtime
    BEFORE UPDATE ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();