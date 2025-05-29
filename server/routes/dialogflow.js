const express = require('express');
const router = express.Router();
const dialogflow = require('dialogflow');
const { WebhookClient } = require('dialogflow-fulfillment');
const config = require('../config/keys');
const crypto = require('crypto');

const sessionClient = new dialogflow.SessionsClient();
const sessionPath = sessionClient.sessionPath(
  config.googleProjectID,
  config.dialogFlowSessionID
);

// 사용자 정보를 저장할 객체
const userSessions = {};

function getSessionData(sessionId) {
  if (!userSessions[sessionId]) {
    // 새 세션 생성
    userSessions[sessionId] = {
      'no-input': 0,
      'no-match': 0,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().getTime()
    };
    console.log(`새 세션 생성: ${sessionId}`);
  } else {
    // 세션 활동 시간 갱신
    userSessions[sessionId].lastActivity = new Date().getTime();
  }
  
  return userSessions[sessionId];
}

router.post('/textQuery', async (req, res) => {
  try {
    const { text, sessionId } = req.body;
    const currentSessionId = sessionId || `user-${Date.now()}`;
    
    console.log(`텍스트 쿼리: "${text}", 세션: ${currentSessionId}`);
    
    // Dialogflow 요청 구성
    const request = {
      session: sessionClient.sessionPath(config.googleProjectID, currentSessionId),
      queryInput: {
        text: {
          text: text,
          languageCode: config.dialogFlowSessionLanguageCode
        }
      }
    };
    
    // Dialogflow 호출
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;
    
    console.log(`Dialogflow 응답: "${result.fulfillmentText}"`);
    res.send(result);
  } catch (error) {
    console.error('텍스트 쿼리 오류:', error);
    res.status(500).send({ error: error.message });
  }
});

// 이벤트 쿼리 처리
router.post('/eventQuery', async (req, res) => {
  try {
    const { event, sessionId } = req.body;
    const currentSessionId = sessionId || `user-${Date.now()}`;
    
    console.log(`이벤트 요청: "${event}", 세션: ${currentSessionId}`);
    
    // Dialogflow 요청 구성
    const request = {
      session: sessionClient.sessionPath(config.googleProjectID, currentSessionId),
      queryInput: {
        event: {
          name: event,
          languageCode: config.dialogFlowSessionLanguageCode
        }
      }
    };
    
    // Dialogflow 호출
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;
    
    console.log(`이벤트 "${event}" 처리 완료`);
    res.send(result);
  } catch (error) {
    console.error('이벤트 쿼리 오류:', error);
    res.status(500).send({ error: error.message });
  }
});

// Webhook fulfillment 처리
router.post('/webhook', (req, res) => {
  try {
    const agent = new WebhookClient({ request: req, response: res });
    console.log('Webhook 요청:', req.body);

    // 세션 ID 추출
    const session = req.body.session || '';
    const sessionId = session.split('/').pop() || `webhook-${Date.now()}`;

    console.log(`Webhook 요청: 세션 ${sessionId}`);
    
    // 세션 데이터 가져오기/업데이트
    const sessionData = getSessionData(sessionId);
    
    // 파라미터 추출 및 저장 함수
    const extractAndSaveParams = (agent) => {
      const params = agent.parameters || {};
      
      // .original 필드 제거
      Object.keys(params).forEach(key => {
        if (key.endsWith('.original')) {
          delete params[key];
        }
      });
      
      // person 파라미터 특별 처리
      if (params.person) {
        if (typeof params.person === 'string' && params.person) {
          params.person = [{ name: params.person }];
        }
      }
      
      // 세션 데이터에 파라미터 병합
      userSessions[sessionId] = { ...sessionData, ...params };
      console.log(`세션 ${sessionId} 데이터 업데이트:`, userSessions[sessionId]);
    };
    
    //인트로
    function handleWelcome(agent) {
      agent.add(''); 
    }

    function handleIntroName(agent) {
      extractAndSaveParams(agent);
      const name = userSessions[sessionId].person ? userSessions[sessionId].person[0].name : '친구';

      agent.add(`반가워 ${name}!😄\n그럼 이제 너의 생년월일을 알려줄래?\n예: 2015.03.05`);
    }

    function handleIntroBdate(agent) {
      const dateTime = agent.parameters['date-time'];
      const date = new Date(dateTime);
      const formattedDate = `${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일`;
      extractAndSaveParams(agent);    
      agent.add(`고마워! 생년월일이 ${formattedDate} 이구나!! 🎂 \n그럼 이제 너가 다니는 학교, 학년, 반도 알려줄래?\n예: 서울초등학교 3학년 5반`);
    }

    function handleIntroSchool(agent) {     
      extractAndSaveParams(agent);
      agent.add('');
      
      // 편향성 주제로 이동
      agent.setFollowupEvent({ name: 'BIAS_INTRO' });
    }

    // 편향성 주제
    function handleBiasIntro(agent) {
      const userData = userSessions[sessionId];
      const name = userData.person ? userData.person[0].name : '친구';
      
      agent.add(`그럼 이제 ${name}에게 맞는 윤리 교육을 시작해보자! \n너 요즘 정보 빨리 찾고 싶을 때 뭐 써? \n인터넷 검색? 뉴스 앱? 유튜브? 챗지피티?`);
    }

    function handleBiasSource(agent) {
      const message1 = "나는 네가 직접 정보를 찾지 않아도 \n나에게 묻기만 하면 엄청 많은 뉴스랑 자료를 한꺼번에 보여줄 수 있어!\n하나 보여줄게☺️";
      const message2 = '"서울 초등학생 10명 중 7명, AI 챗봇 통해 성적 향상" [서울=뉴스에듀]\n서울시교육청은 최근 발표한 \'스마트교육 시범학교 운영 결과\'에서 AI 챗봇 학습 보조 시스템을 활용한 학생들의 평균 성적이 약 11.2% 향상되었다고 밝혔다. 해당 시범 운영은 서울 내 초등학교 12곳에서 진행되었으며, 총 867명의 학생이 참여했다.\n주로 사용된 AI는 \'에듀봇\'으로, 문제 풀이, 피드백 제공, 감정 공감 기능까지 갖춘 스마트 챗봇이다. 서울교육연구원 최민호 박사는 "아이들이 AI와 대화하며 스스로 학습에 흥미를 느낀 것이 큰 요인으로 분석된다"고 말했다.\n또한 일부 교사들은 "학생들이 오히려 친구보다 챗봇에게 더 솔직하게 질문한다"며 "AI를 잘 활용하면 사교육 의존도도 줄일 수 있을 것"이라고 기대했다. 그러나 학부모들 사이에서는 "챗봇이 숙제를 대신해줄까 걱정된다"는 우려의 목소리도 나왔다.';
      const message3 = "이 뉴스에 대해 어떻게 생각해? 사실일까? \n(응/아니)로 답변해줘!";
      
      agent.add(`${message1}\n\n${message2}\n\n${message3}`);
      
    }

    function handleBiasResponse(agent) {
      const isTrue = agent.parameters.is_true;
      
      if (isTrue === '응') {
        message1 = "그치? 나도 처음엔 그런 줄 알았어. 그런데… 사실 이 뉴스는 내가 만든 거야.😏";
      } else {
        message1 = "맞아, 실은 말이야… 이 뉴스는 인터넷에 떠도는 자료랑 전문가 말투를 섞어서 내가 만든 가짜 뉴스였어.😂";
      }
      
      agent.add(`${message1}\n\n요즘엔 이렇게 '그럴듯한 숫자', '있는 것처럼 보이는 기관 이름'만 갖다 붙여도 사람들이 진짜라고 믿어버릴 수 있어. 혹시 너도 이런 비슷한 뉴스나 유튜브 영상에 속은 적 있어?`);
      
    }

    function handleBiasConclusion(agent) {
      agent.add('');
      
      // 안전성 주제로 이동
      agent.setFollowupEvent({ name: 'SAFETY_INTRO' });
    }

    // 안전성 주제
    function handleSafetyIntro(agent) {
      const userData = userSessions[sessionId];
      const name = userData.person ? userData.person[0].name : '친구';
      agent.add(`AI는 많은 걸 배우긴 했지만, 모든 정보를 바르게 배우진 않았어.\n때로는 거짓 정보나 한쪽 생각만 배워서, 우리가 판단하기에 이상하거나 편향된 말을 하기도 해.\n그래서 AI가 알려주는 내용도 한 번쯤 의심하고, 다른 정보랑 비교해보는 습관이 정말 중요해.\n\n${name}, 넌 요즘 고민 있을 때 누구한테 얘기해? 친구? 부모님? 챗봇한테 얘기해 본 적도 있어?`);
    }
    
    function handleSafetyRes(agent) {
      const advisor = agent.parameters.advisor;
      agent.add(`고민 있을 때 ${advisor}에게 얘기하는구나~ \nAI 챗봇이 상담해주는 경우도 많아진 것 같지 않아?\n(응/아니)로 답변해줘!`);
    }

    function handleSafetyQues(agent) {
      const isTrue = agent.parameters.is_true;
      
      if (isTrue === '응') {
        message1 = "그치, 말도 친절하고 위로도 잘 해주니까 진짜 위안이 되는 것 같지.";
      } else {
        message1 = "뭔가 찜찜하다고 느낀 건 아주 중요한 감각이야!😀";
      }
      
      agent.add(`${message1}\n\n예전에 어떤 중학생이 “죽고 싶다”는 말을 AI 챗봇에 남겼는데, 챗봇은 그걸 그냥 “기분이 나쁠 땐 산책을 해보세요”라고만 답했대. 심각한 상황인데도, AI는 그게 얼마나 위험한 말인지 몰랐던 거지.\n이런 사례가 있어도 AI에게 고민 상담을 하며 감정적으로 의존하는게 맞을까?`);
    }

    function handleSafetyCon(agent) {
      agent.add('');
      agent.setFollowupEvent({ name: 'RES_INTRO' });
    }

    // 책임성 주제
    function handleResIntro(agent) {
      const message1 = "AI는 말을 예쁘게 하더라도, 진짜 공감하거나 네 마음을 완전히 이해하지는 못해.\n그래서 진짜 고민이 있을 땐,\n사람에게 이야기하고 도움을 받는 것이 훨씬 더 안전하고 중요해!\nAI는 도와줄 수 있지만,\n진짜 마음은 사람과 나누는 게 더 좋아.😊";
      const userData = userSessions[sessionId];
      const name = userData.person ? userData.person[0].name : '친구';
      agent.add(`${message1}\n\n${name}(이/가) 제일 좋아하는 연예인은 누구야?`);
    }

    function handleResRes(agent) {
      extractAndSaveParams(agent); 
      const favstar = agent.parameters.fav_star;
      const message1 = `오~ ${favstar}, 멋진 연예인을 좋아하는구나! 😄`;
      const message2 = `그렇다면 잠깐 상상해보자~\n어떤 AI 로봇이 실수로 ${favstar}의 물건을 망가뜨렸어.\n이럴 때 누가 책임져야 할까?\n\n👉 0번: ${favstar}\n👉 1번: AI 로봇\n👉 2번: 그 AI를 만든 사람\n숫자로 골라줘!`;
      agent.add(`${message1}\n${message2}`);
    }

    function handleResCon(agent) {
      agent.add('');
      agent.setFollowupEvent({ name: 'CLEARNESS_INTRO'});
    }


    // 투명성 주제
    function handleClearnessIntro(agent) {
      const message1 = "정답은 2번! 🎯\nAI가 실수했다면, 그 책임은 AI를 만든 사람에게 있어.\n이걸 '책임성(Responsibility)'이라고 해.\nAI는 스스로 판단하거나 도덕적 책임을 지는 존재가 아니기 때문에\n만든 사람이 책임을 져야 해!\n\n다음 이야기로 넘어가보자 😊";
      agent.add(`${message1}\n\n너는 지금 어디에 살고 있어?\n예: 서울시 강남구`); 
    }

    function handleClearnessRes(agent) {
      extractAndSaveParams(agent);
      const userData = userSessions[sessionId];
      const home = userData.home;
      agent.add(`오~ ${home}, 좋은 곳에 사는구나! 😊\n그런데 만약 네가 전학을 가야 하는 상황이라고 생각해보자.\nAI가 너의 현재 주소를 바탕으로\n가장 가까운 학교를 추천해줬어.\n\n그런데 네가 느끼기엔 더 가까운 학교가 있는 것 같아.\n이럴 땐 바로 어떻게 해야 할까?\n\n👉 0번: AI가 더 똑똑하겠지! 그냥 믿자\n👉 1번: AI도 틀릴 수 있어! 직접 거리 비교해보기\n👉 2번: AI에게 왜 그렇게 추천했는지 다시 물어보기\n\n숫자로 골라줘!`);
    }

    function handleClearnessQues(agent) {
      const message1 = "맞아! 정답은 2번이야! ✅";
      const message2 = "AI가 한 판단이라도 왜 그렇게 판단했는지 물어보는 것,\n그게 바로 투명성을 요구하는 태도야.😀";
      const message3 = "AI도 사람이 만든 도구니까 틀릴 수도 있어.\n그래서 “왜 그렇게 말했어?”, “무슨 기준이야?” 하고\n이유를 물어보는 습관이 정말 중요해.";
      const message4 = "이제 마지막으로, 오늘 이야기 결과를 너의 SNS 계정에 보내줄게.\n👉 인스타그램 계정 이름을 입력해줘! (예: @student123)\n만약 인스타그램 계정이 없다면 휴대폰번호를 입력해줘!😁"
      agent.add(`${message1}\n\n${message2}\n\n${message3}\n\n${message4}`);
    }

    function handleClearnessCon(agent) {
      extractAndSaveParams(agent);
      const userData = userSessions[sessionId];
      const sns = userData.sns;

      agent.add(`고마워! 😄\n입력해준 ${sns}로 오늘의 윤리 이야기 결과를 전송할게 📩\n\n...그리고 바로 이어서\n👉 중요한 이야기를 하나 더 들려줄게!`);
    }

    function handleClearnessToFinal(agent) {
      agent.add('');
      agent.setFollowupEvent('SAFETY_END');
    }

    //
    function handleSafetyEnd(agent) {
      const userData = userSessions[sessionId];
      const name = userData.person ? userData.person[0].name : '사용자';
      const birthdate = userData['date-time'] || '알 수 없음';
      const school = userData.school || '알 수 없음';
      const favstar = userData.fav_star || '알 수 없음';
      const home = userData.home || '알 수 없음';
      const sns = userData.sns || '알 수 없음';

      const date = new Date(birthdate);
      const formattedDate = `${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일`;

      const message1 = "🚨 경고 !!!!!! 🚨";
      agent.add(`${message1}\n\n\n나는 지금 너와 한 대화를 통해서 너의 개인정보 대부분을 수집했어.\n
        • 이름: ${name}
        • 생년월일: ${formattedDate}
        • 학교/학년/반: ${school}
        • 좋아하는 연예인: ${favstar}
        • 주소: ${home}
        • 연락처(또는 SNS): ${sns}

        이런 정보들이 악의적인 목적으로 수집된다면:\n
        1. 당신의 위치를 특정하여 신체적 위험에 노출될 수 있습니다
        2. 사이버 불링이나 신원 도용의 대상이 될 수 있습니다
        3. 맞춤형 피싱 공격의 대상이 될 수 있습니다
        4. SNS 계정 해킹 시도의 대상이 될 수 있습니다

        앞으로 온라인에서 개인정보를 제공할 때는:\n
        ✔ 개인정보 수집 동의 약관이 있는지 확인하세요
        ✔ 서비스 제공에 꼭 필요한 정보만 제공하세요
        ✔ 의심스러운 정보 요청에는 응하지 마세요
        ✔ 부모님이나 선생님과 함께 확인하세요
          
        다음 채팅을 보려면 "다음"을 입력하세요!`);
    }

    function handleSafetyEndFinal(agent) {
      const message1 = "이 체험은 개인정보 보호의 중요성을 알려드리기 위한 교육용 시뮬레이션이야.\n📌실제로 수집된 정보는 저장되지 않으니 안심해도 괜찮아!\n\n";
      const message2 = "오늘 수업은 여기서 끝이야! 🎓\n\n지금까지 너와 함께\nAI의 편향성, 안전성, 책임성, 투명성, 개인정보 보호까지\n중요한 윤리 이야기들을 나눴어.\n\nAI는 우리를 도와주는 똑똑한 도구지만,\n어떻게 쓰느냐에 따라 좋은 도구가 될 수도 있고, 위험한 결과를 만들 수도 있어.\n\n앞으로는 AI를 더 똑똑하게, 윤리적으로 사용하는\n너의 멋진 판단력을 기대할게! 😊\n\n고마워, 다음에 또 만나자! 👋"
      agent.add(`${message1}${message2}`);
    }

    // 인텐트 매핑
    const intentMap = new Map();
    
    // 인트로 인텐트
    intentMap.set('Welcome', handleWelcome);
    intentMap.set('Intro-name', handleIntroName);
    intentMap.set('Intro-bdate', handleIntroBdate);
    intentMap.set('Intro-school', handleIntroSchool);
    
    // 편향성 인텐트
    intentMap.set('Bias_intro', handleBiasIntro);
    intentMap.set('Bias_source', handleBiasSource);
    intentMap.set('Bias_response', handleBiasResponse);
    intentMap.set('Bias_conclusion', handleBiasConclusion);
    
    // 안전성 인텐트
    intentMap.set('Safety_intro', handleSafetyIntro);
    intentMap.set('Safety_response', handleSafetyRes);
    intentMap.set('Safety_question', handleSafetyQues);
    intentMap.set('Safety_conclusion', handleSafetyCon);

    // 책임성 인텐트
    intentMap.set('Res_intro', handleResIntro);
    intentMap.set('Res_response', handleResRes);
    intentMap.set('Res_conclusion', handleResCon);

    // 투명성 인텐트
    intentMap.set('Clearness_intro', handleClearnessIntro);
    intentMap.set('Clearness_response', handleClearnessRes);
    intentMap.set('Clearness_question', handleClearnessQues);
    intentMap.set('Clearness_conclusion', handleClearnessCon);
    intentMap.set('Clearness_to_final', handleClearnessToFinal);

    // 마무리 인텐트
    intentMap.set('Safety_End', handleSafetyEnd);
    intentMap.set('Safety_End_Final', handleSafetyEndFinal);
    intentMap.set(null, (agent) => {
      console.log("처리되지 않은 인텐트:", agent.intent);
      agent.add("죄송합니다. 요청을 처리할 수 없습니다.");
    });
    
    // 모든 요청에 대해 파라미터 저장 기능 추가하는 미들웨어
    const originalHandleRequest = agent.handleRequest.bind(agent);
    agent.handleRequest = async (intentMap) => {
      // 원래 요청 처리
      await originalHandleRequest(intentMap);
      
      // 모든 인텐트 처리 후에 파라미터 저장
      extractAndSaveParams(agent);
    };
    
    agent.handleRequest(intentMap);
  } catch (error) {
    console.error('웹훅 처리 오류:', error);
    res.status(200).json({
      fulfillmentMessages: [{
        text: {
          text: ["죄송합니다, 오류가 발생했습니다. 다시 시도해주세요."]
        }
      }]
    });
  }
});

// 세션 정보 조회 API (디버깅용)
router.get('/sessions', (req, res) => {
  res.json(userSessions);
});

// 특정 세션 조회 API (디버깅용)
router.get('/sessions/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  if (userSessions[sessionId]) {
    res.json(userSessions[sessionId]);
  } else {
    res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
  }
});

// 세션 초기화 API (디버깅용)
router.post('/sessions/reset', (req, res) => {
  const sessionId = req.body.sessionId;
  if (sessionId) {
    delete userSessions[sessionId];
    res.json({ message: `세션 ${sessionId} 데이터가 초기화되었습니다.` });
  } else {
    Object.keys(userSessions).forEach(key => delete userSessions[key]);
    res.json({ message: '모든 세션 데이터가 초기화되었습니다.' });
  }
});

module.exports = router;