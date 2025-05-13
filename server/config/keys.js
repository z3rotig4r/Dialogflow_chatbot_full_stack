require('dotenv').config();

module.exports = {
  googleProjectID: process.env.GOOGLE_PROJECT_ID,
  dialogFlowSessionID: 'react-chatbot-session',
  dialogFlowSessionLanguageCode: 'ko-KR'
};