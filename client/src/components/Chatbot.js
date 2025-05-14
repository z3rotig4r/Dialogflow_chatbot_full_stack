import React, { useState, useEffect } from 'react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, Avatar, TypingIndicator } from "@chatscope/chat-ui-kit-react";
import axios from 'axios';
import '../styles/chatbot-custom.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // 시작 Event 설정 - Dialog 상 설정 필요
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
