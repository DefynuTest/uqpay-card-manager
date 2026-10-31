/**
 * Local development entry point.
 * Starts the Express app with app.listen().
 */
import { config } from './config';
import app from './server';

app.listen(config.port, () => {
  console.log(`[CardManager] API running on port ${config.port}`);
  console.log(`[CardManager] Webhook endpoint: POST /webhook/telegram`);
  if (config.anthropicApiKey) {
    console.log(`[CardManager] AI Agent enabled (${config.claudeModel})`);
  }
});
