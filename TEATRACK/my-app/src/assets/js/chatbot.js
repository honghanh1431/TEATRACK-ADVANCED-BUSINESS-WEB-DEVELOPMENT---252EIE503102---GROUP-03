const CHATBOT_CONFIG = {
  maxHistoryLength: 50,
  language: 'auto',
};

function truncateHistory(messages, max = 50) {
  if (messages && messages.length > max) {
    return messages.slice(messages.length - max);
  }
  return messages || [];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CHATBOT_CONFIG, truncateHistory };
}
