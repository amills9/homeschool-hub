#!/bin/bash
set -e
BASE=/home/ubuntu/homeschool-hub

echo "=== Patching backend index.js ==="
INDEX="$BASE/backend/src/index.js"

if grep -q "todos" "$INDEX"; then
  echo "✅ todos route already in index.js"
else
  # Find the line with auth route require and add todos after it
  sed -i "/require.*routes\/auth/a const todosRoutes = require('./routes/todos');" "$INDEX"
  sed -i "/app\.use.*\/api\/auth/a app.use('/api/todos', todosRoutes);" "$INDEX"
  echo "✅ Added todos route to index.js"
fi

echo "=== Patching frontend main.jsx to import mobile-print.css ==="
MAIN="$BASE/frontend/src/main.jsx"
if [ ! -f "$MAIN" ]; then
  MAIN="$BASE/frontend/src/index.jsx"
fi

if grep -q "mobile-print" "$MAIN"; then
  echo "✅ mobile-print.css already imported"
else
  sed -i "1s/^/import '.\/mobile-print.css';\n/" "$MAIN"
  echo "✅ Added mobile-print.css import to $MAIN"
fi

echo "=== All patches applied ==="
