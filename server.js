const express = require('express');
const { Pool } = require('pg'); // 引入 pg 模块

const app = express();
app.use(express.json());

// 从环境变量读取 Railway 自动提供的 DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false   // Railway 的 PostgreSQL 需要 SSL
  }
});

// 应用启动时创建数据表
// 可选：测试连接
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('数据库连接失败:', err.stack);
  } else {
    console.log('数据库连接成功:', res.rows[0].now);
  }
});

// 获取待办列表
app.get('/api/todos', async (req, res) => {
  const result = await pool.query('SELECT * FROM todos');
  res.json(result.rows);
});

// 新增待办
app.post('/api/todos', async (req, res) => {
  const { title } = req.body;
  const result = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING *',
    [title]
  );
  res.json(result.rows[0]);
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


// 使用 Railway 提供的端口（非常重要！）
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});