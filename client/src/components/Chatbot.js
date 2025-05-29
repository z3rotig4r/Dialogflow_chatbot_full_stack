import React, { useState, useEffect } from 'react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, Avatar, TypingIndicator } from "@chatscope/chat-ui-kit-react";
import axios from 'axios';
import '../styles/chatbot-custom.css';
import useViewportHeight from './useViewportHeight';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  // 세션 ID는 페이지 로드 시 한 번만 생성하고 유지
  const [sessionId] = useState(() => {
    // 저장된 세션 ID가 있으면 사용하고, 없으면 새로 생성
    const savedSessionId = localStorage.getItem('dialogflowSessionId');
    return savedSessionId || `user-${Date.now()}`;
  });

  useViewportHeight();

  // 컴포넌트 마운트 시 세션 ID를 로컬 스토리지에 저장하고 Welcome 이벤트 호출
  useEffect(() => {
    localStorage.setItem('dialogflowSessionId', sessionId);
    console.log(`세션 ID 설정: ${sessionId}`);
    eventQuery('Welcome');
  }, [sessionId]);

  // 텍스트 쿼리 함수
  const textQuery = async (text) => {
    // 사용자 메시지 추가
    const userMessage = {
      message: text,
      sender: "user",
      direction: "outgoing"
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsTyping(true);
    
    try {
      console.log(`텍스트 쿼리 요청: "${text}", 세션: ${sessionId}`);
      
      // Dialogflow 요청
      const response = await axios.post(
        process.env.REACT_APP_DIALOGFLOW_ENDPOINT + '/textQuery',
        { 
          text,
          sessionId
        }
      );
      
      // 봇 응답 추가
      const botMessage = {
        message: response.data.fulfillmentText,
        sender: "bot",
        direction: "incoming"
      };
      
      setMessages([...newMessages, botMessage]);
    } catch (error) {
      console.error('Dialogflow 텍스트 쿼리 오류:', error);
      
      // 오류 메시지 표시
      const errorMessage = {
        message: "죄송합니다, 오류가 발생했습니다. 다시 시도해주세요.",
        sender: "bot",
        direction: "incoming"
      };
      
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // 이벤트 쿼리 함수
  const eventQuery = async (event) => {
    setIsTyping(true);
    
    try {
      console.log(`이벤트 요청: "${event}", 세션: ${sessionId}`);
      
      // Dialogflow 요청
      const response = await axios.post(
        process.env.REACT_APP_DIALOGFLOW_ENDPOINT + '/eventQuery',
        { 
          event,
          sessionId
        }
      );
      
      if (response.data.fulfillmentText) {
        // 봇 응답 추가
        const botMessage = {
          message: response.data.fulfillmentText,
          sender: "bot",
          direction: "incoming"
        };
        
        setMessages(messages => [...messages, botMessage]);
      }
    } catch (error) {
      console.error('Dialogflow 이벤트 쿼리 오류:', error);
      
      // 오류 메시지 표시
      const errorMessage = {
        message: "죄송합니다, 오류가 발생했습니다. 다시 시도해주세요.",
        sender: "bot",
        direction: "incoming"
      };
      
      setMessages(messages => [...messages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };
  
  // 메시지 전송 핸들러
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
