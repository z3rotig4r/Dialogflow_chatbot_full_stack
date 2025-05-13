import React, { useState, useEffect } from 'react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import {
  MainContainer, ChatContainer, MessageList, Message, MessageInput, Avatar, TypingIndicator
} from "@chatscope/chat-ui-kit-react";
import axios from 'axios';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  //시작 Event 설정 - Dialog 상 설정 필요
  useEffect(() => {
    eventQuery('Welcome');
  }, []);

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
        { text }
      );
      const botMessage = {
        message: response.data.fulfillmentText,
        sender: "bot",
        direction: "incoming"
      };
      setMessages([...newMessages, botMessage]);
      setIsTyping(false);
    } catch (error) {
      setIsTyping(false);
    }
  };

  const eventQuery = async (event) => {
    setIsTyping(true);
    try {
      const response = await axios.post(
        process.env.REACT_APP_DIALOGFLOW_ENDPOINT + '/eventQuery',
        { event }
      );
      const botMessage = {
        message: response.data.fulfillmentText,
        sender: "bot",
        direction: "incoming"
      };
      setMessages([...messages, botMessage]);
      setIsTyping(false);
    } catch (error) {
      setIsTyping(false);
    }
  };

  const handleSend = (message) => {
    textQuery(message);
  };

  return (
    <div className="chatbot-container">
    <div className="chatbot-header">
      <h2>초중학생용 챗봇</h2>
      <p className="chatbot-subtitle">궁금한 것을 물어보세요!</p>
    </div>
      <MainContainer>
        <ChatContainer>
          <MessageList typingIndicator={isTyping ? <TypingIndicator content="봇이 입력 중..." /> : null}>
            {messages.map((message, i) => (
              <Message key={i} model={message}>
                {message.direction === "incoming" && (
                  <Avatar src="/images/ai_chatbot_image.png" name="봇" />
                )}
              </Message>
            ))}
          </MessageList>
          <MessageInput placeholder="메시지를 입력하세요..." onSend={handleSend} />
        </ChatContainer>
      </MainContainer>
    </div>
  );
};

export default Chatbot;