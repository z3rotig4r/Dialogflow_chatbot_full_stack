import React from 'react';
import '../styles/chatbot-custom.css';

const QuickReplies = ({ options, onSelect }) => (
  <div className="quick-replies">
    {options.map((option, index) => (
      <button
        key={index}
        className="quick-reply-button"
        onClick={() => onSelect(option)}
      >
        {option}
      </button>
    ))}
  </div>
);

export default QuickReplies;