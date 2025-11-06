-- Create telegram_links table
CREATE TABLE IF NOT EXISTS telegram_links (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT UNIQUE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_links_chat_id ON telegram_links(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_links_phone_number ON telegram_links(phone_number);
