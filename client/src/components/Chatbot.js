import React, { useState, useEffect } from 'react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, Avatar, TypingIndicator } from "@chatscope/chat-ui-kit-react";
import axios from 'axios';
import '../styles/chatbot-custom.css';
import useViewportHeight from './useViewportHeight';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  // 컴포넌트 상태에 세션 ID 추가
  const [sessionId, setSessionId] = useState(`user-${Date.now()}`);
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('sessionToken') || '');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');

  useViewportHeight();

  // 시작 Event 설정 - Dialog 상 설정 필요
  useEffect(() => {
    // 세션 ID가 없는 경우 새로 생성
    if (!sessionId) {
      const newSessionId = 'user-' + Date.now();
      setSessionId(newSessionId);
      localStorage.setItem('sessionId', newSessionId);
    }

    eventQuery('Welcome');
  }, []);

  // 세션 정보를 저장하는 함수
  const saveSessionInfo = (result) => {
    if (result.outputContexts) {
      // 세션 정보 컨텍스트 찾기
      const sessionContext = result.outputContexts.find(
        context => context.name.includes('session-info')
      );
      
      if (sessionContext && sessionContext.parameters) {
        // 세션 정보 저장
        if (sessionContext.parameters.sessionId) {
          setSessionId(sessionContext.parameters.sessionId);
          localStorage.setItem('sessionId', sessionContext.parameters.sessionId);
        }
        
        if (sessionContext.parameters.sessionToken) {
          setSessionToken(sessionContext.parameters.sessionToken);
          localStorage.setItem('sessionToken', sessionContext.parameters.sessionToken);
        }
        
        // 사용자 이름 저장
        if (result.parameters && result.parameters.person) {
          const person = result.parameters.person;
          const name = typeof person === 'string' ? person : 
                      (person[0] && person[0].name) ? person[0].name : '';
          
          if (name) {
            setUserName(name);
            localStorage.setItem('userName', name);
          }
        }
      }
    }
  };

  const textQuery = async (text) => {
    const userMessage = {
      message: text,
      sender: "user",
      direction: "outgoing"
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsTyping(true);
    
    try {
      const response = await axios.post(
        process.env.REACT_APP_DIALOGFLOW_ENDPOINT + '/textQuery',
        { 
          text,
          sessionId: sessionId,
          userName: userName,
          sessionToken: sessionToken
        }
      );
      // 세션 정보 저장
      saveSessionInfo(response.data);

      const botMessage = {
        message: response.data.fulfillmentText,
        sender: "bot",
        direction: "incoming"
      };
      setMessages([...newMessages, botMessage]);
      setIsTyping(false);
    } catch (error) {
      console.error('Dialogflow 호출 오류:', error);
      setIsTyping(false);
    }
  };

  // 이벤트 쿼리 함수 수정
  const eventQuery = async (event) => {
    setIsTyping(true);
    
    try {
      console.log(`이벤트 요청: ${event}, 세션: ${sessionId}`);
      
      const response = await axios.post(
        process.env.REACT_APP_DIALOGFLOW_ENDPOINT + '/eventQuery',
        { 
          event,
          sessionId,  // 항상 동일한 세션 ID 사용
          userName,  // 사용자 이름 추가
          sessionToken  // 세션 토큰 추가
        }
      );
      
      const botMessage = {
        message: response.data.fulfillmentText,
        sender: "bot",
        direction: "incoming"
      };
      
      setMessages([...messages, botMessage]);
      setIsTyping(false);
    } catch (error) {
      console.error('이벤트 쿼리 오류:', error);
      setIsTyping(false);
    }
  };

  const handleSend = (message) => {
    textQuery(message);
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="header-content">
          <img src="images/etty.png" alt="에띠 로고" className="etty-logo" />
          <h2>에띠 (ETTY)</h2>
        </div>
        <p className="chatbot-subtitle">궁금한 것을 물어보세요!</p>
      </div>
      
      <MainContainer className="main-chat-container">
        <ChatContainer>
          <MessageList
            className="message-list-container"
            typingIndicator={isTyping ? <TypingIndicator content="에띠가 생각하고 있어요..." /> : null}
          >
            {messages.map((message, i) => {
              return (
                <Message key={i} model={message} className={message.sender === "bot" ? "bot-message" : "user-message"}>
                  {message.sender === "bot" && (
                    <Avatar src="/images/etty.png" className="avatar-image" name="에띠" />
                  )}
                  {message.sender === "user" && (
                    <Avatar src="/images/user-avatar.png" className="avatar-image" name="나" />
                  )}
                </Message>
              );
            })}
          </MessageList>
          
          <MessageInput
            placeholder="궁금한 것을 물어봐!"
            onSend={handleSend}
            attachButton={false}
            className="message-input-container"
          />
        </ChatContainer>
      </MainContainer>
      
      <div className="chatbot-footer">
        © 2025 AI Maker 2기 (교육팀)
      </div>
    </div>
  );
};

export default Chatbot;
