const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 初始化数据库表
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      user_id INTEGER REFERENCES users(id) NOT NULL
    )
  `);
  console.log('Database tables ready');
}
initDB();

// JWT 认证中间件
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 注册接口
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: '用户名已存在' });
  }
});

// 登录接口
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  const token = jwt.sign(
    { userId: user.id }, 
    process.env.JWT_SECRET || 'your_jwt_secret'
  );
  res.json({ token });
});

// 获取待办列表（受保护）
app.get('/api/todos', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT * FROM todos WHERE user_id = $1', [req.user.userId]);
  res.json(result.rows);
});

// 新增待办（受保护）
app.post('/api/todos', authenticateToken, async (req, res) => {
  const { title } = req.body;
  const result = await pool.query(
    'INSERT INTO todos (title, user_id) VALUES ($1, $2) RETURNING *',
    [title, req.user.userId]
  );
  res.json(result.rows[0]);
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});