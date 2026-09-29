const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json());

// CORS 配置（按环境变量走，没配就默认全开）
const origins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : '*';
app.use(cors({ origin: origins }));

// 健康检查接口（Railway 需要）
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 内存版 Todo 接口
let todos = [];
let nextId = 1;

app.get('/api/todos', (req, res) => res.json(todos));
app.post('/api/todos', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: 'title required' });
  const t = { id: nextId++, title, done: false };
  todos.push(t);
  res.status(201).json(t);
});
app.put('/api/todos/:id', (req, res) => {
  const t = todos.find(x => x.id === Number(req.params.id));
  if (!t) return res.status(404).json({ message: 'not found' });
  if (req.body.title !== undefined) t.title = req.body.title;
  if (req.body.done !== undefined) t.done = req.body.done;
  res.json(t);
});
app.delete('/api/todos/:id', (req, res) => {
  const i = todos.findIndex(x => x.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ message: 'not found' });
  todos.splice(i, 1);
  res.json({ message: 'deleted' });
});

// 监听端口（必须读环境变量，不能写死 3000）
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('running on', PORT));