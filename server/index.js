const express = require("express");
const cors = require("cors");
const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());

// DialogFlow 라우터
app.use('/api/dialogflow', require('./routes/dialogflow'));

// 서버 실행
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`서버가 ${port}번 포트에서 실행 중입니다.`);
});