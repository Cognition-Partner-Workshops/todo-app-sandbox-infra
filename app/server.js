const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'todoapp',
  user: process.env.DB_USER || 'todouser',
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.get('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM todos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching todo:', err);
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

app.post('/api/todos', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const result = await pool.query(
      'INSERT INTO todos (title, description) VALUES ($1, $2) RETURNING *',
      [title, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating todo:', err);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;
    const result = await pool.query(
      `UPDATE todos 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           completed = COALESCE($3, completed),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [title, description, completed, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating todo:', err);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully' });
  } catch (err) {
    console.error('Error deleting todo:', err);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Todo App</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .todo-form { margin-bottom: 20px; }
        .todo-form input, .todo-form textarea { width: 100%; padding: 10px; margin: 5px 0; box-sizing: border-box; }
        .todo-form button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
        .todo-list { list-style: none; padding: 0; }
        .todo-item { padding: 15px; border: 1px solid #ddd; margin: 10px 0; border-radius: 5px; }
        .todo-item.completed { background: #e8f5e9; }
        .todo-item h3 { margin: 0 0 10px 0; }
        .todo-item p { margin: 0; color: #666; }
        .todo-actions { margin-top: 10px; }
        .todo-actions button { margin-right: 10px; padding: 5px 10px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>Todo List Application</h1>
      <div class="todo-form">
        <input type="text" id="title" placeholder="Todo title" required>
        <textarea id="description" placeholder="Description (optional)"></textarea>
        <button onclick="addTodo()">Add Todo</button>
      </div>
      <ul class="todo-list" id="todoList"></ul>
      <script>
        async function loadTodos() {
          const res = await fetch('/api/todos');
          const todos = await res.json();
          const list = document.getElementById('todoList');
          list.innerHTML = todos.map(todo => 
            '<li class="todo-item ' + (todo.completed ? 'completed' : '') + '">' +
              '<h3>' + todo.title + '</h3>' +
              '<p>' + (todo.description || '') + '</p>' +
              '<small>Created: ' + new Date(todo.created_at).toLocaleString() + '</small>' +
              '<div class="todo-actions">' +
                '<button onclick="toggleTodo(' + todo.id + ', ' + !todo.completed + ')">' + (todo.completed ? 'Mark Incomplete' : 'Mark Complete') + '</button>' +
                '<button onclick="deleteTodo(' + todo.id + ')">Delete</button>' +
              '</div>' +
            '</li>'
          ).join('');
        }
        async function addTodo() {
          const title = document.getElementById('title').value;
          const description = document.getElementById('description').value;
          if (!title) return alert('Title is required');
          await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
          });
          document.getElementById('title').value = '';
          document.getElementById('description').value = '';
          loadTodos();
        }
        async function toggleTodo(id, completed) {
          await fetch('/api/todos/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: completed })
          });
          loadTodos();
        }
        async function deleteTodo(id) {
          await fetch('/api/todos/' + id, { method: 'DELETE' });
          loadTodos();
        }
        loadTodos();
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('Todo app listening on port ' + PORT);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
