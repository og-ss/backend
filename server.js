const express = require('express');
const { Pool } = require('pg'); // 引入 pg 模块

const app = express();
app.use(express.json());

// 从环境变量读取 Railway 自动提供的 DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  sslmode: 'require' // Railway 的数据库需要 SSL
});

// 应用启动时创建数据表
pool.query(`
  CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE
  )
`).then(() => console.log('Todos table ready'));

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