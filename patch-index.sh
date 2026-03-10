#!/bin/bash
# Run this on the server after extracting the tarball
# It adds the todos route to index.js if not already present

INDEX=/home/ubuntu/homeschool-hub/backend/src/index.js

if grep -q "todos" "$INDEX"; then
  echo "✅ todos route already registered"
else
  # Add require and use after the last route registration
  sed -i "/require.*auth/a const todosRoutes = require('./routes/todos');" "$INDEX"
  sed -i "/app.use.*auth/a app.use('/api/todos', todosRoutes);" "$INDEX"
  echo "✅ todos route added to index.js"
fi

cat "$INDEX"
