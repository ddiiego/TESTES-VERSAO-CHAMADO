const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: __dirname + '/../../.env' });

const config = {
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
};

// Validação de variáveis obrigatórias
const required = ['jwtSecret', 'supabaseUrl', 'supabaseKey'];
for (const key of required) {
  if (!config[key]) {
    console.error(`[CONFIG] Variável obrigatória ausente: ${key}`);
  }
}

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

module.exports = { config, supabase };
