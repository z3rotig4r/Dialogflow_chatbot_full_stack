import axios from 'axios';

const API_URL = process.env.REACT_APP_DIALOGFLOW_ENDPOINT;

export const sendTextQuery = (text) =>
  axios.post(`${API_URL}/textQuery`, { text });

export const sendEventQuery = (event) =>
  axios.post(`${API_URL}/eventQuery`, { event });