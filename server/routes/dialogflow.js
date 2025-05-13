const express = require('express');
const router = express.Router();
const dialogflow = require('dialogflow');
const config = require('../config/keys');

const sessionClient = new dialogflow.SessionsClient();
const sessionPath = sessionClient.sessionPath(
  config.googleProjectID,
  config.dialogFlowSessionID
);

// 텍스트 쿼리
router.post('/textQuery', async (req, res) => {
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: req.body.text,
        languageCode: config.dialogFlowSessionLanguageCode
      }
    }
  };
  try {
    const responses = await sessionClient.detectIntent(request);
    console.log('DialogFlow 응답:', responses);
    const result = responses[0].queryResult;
    res.send(result);
  } catch (error) {
    console.error('DialogFlow 오류:', error);
    res.status(500).send({ error: error.message });
  };
});

// 이벤트 쿼리
router.post('/eventQuery', async (req, res) => {
  const request = {
    session: sessionPath,
    queryInput: {
      event: {
        name: req.body.event,
        languageCode: config.dialogFlowSessionLanguageCode
      }
    }
  };
  try {
    const responses = await sessionClient.detectIntent(request);
    console.log('DialogFlow 응답:', responses);
    const result = responses[0].queryResult;
    res.send(result);
  } catch (error) {
    console.error('DialogFlow 오류:', error);
    res.status(500).send({ error: error.message });
  };
});

module.exports = router;