# 🏫 Homeschool Hub

A full-stack homeschool management web app for Oracle Cloud Ubuntu.

---

## 🚀 Getting Started on Oracle Cloud

### Prerequisites (already on your VM)
- Node.js + npm
- Access to your VM via VNC or SSH

---

## Step-by-Step Installation

### 1. Copy the project to your VM

Upload the `homeschool` folder to your Oracle Cloud VM. If using SCP:
```bash
scp -r homeschool ubuntu@YOUR_IP:~/
```
Or if using VNC, you can paste files directly.

---

### 2. Open a terminal in your VNC and navigate to the project:
```bash
cd ~/homeschool
```

---

### 3. Run the setup script (does everything automatically):
```bash
chmod +x setup.sh
./setup.sh
```

This script will:
- Install PM2 (process manager) globally
- Install Nginx (web server)
- Install all npm dependencies (backend + frontend)
- Build the React frontend for production
- Configure Nginx to serve the app
- Start the backend with PM2 (survives reboots)

---

### 4. Open Oracle Cloud firewall port 80

In Oracle Cloud Console:
1. Go to **Networking → Virtual Cloud Networks → Your VCN → Security Lists**
2. Add Ingress Rule:
   - Protocol: TCP
   - Destination Port: 80
   - Source: 0.0.0.0/0

Also in the VM itself (Ubuntu firewall):
```bash
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

### 5. Access your app

Open a browser and go to: `http://YOUR_SERVER_IP`

**Default credentials:**
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Full admin access |
| parent | parent123 | Standard access |

⚠️ **Change these passwords immediately after first login** (Admin → Users)

---

## 📖 How to Use the App

### Dashboard (Part 1)
- See all children's learning progress at a glance
- Visual progress rings for weekly tasks and outcomes
- Click any outcome checkbox to mark it achieved
- Subject breakdown cards

### Weekly Planner (Part 2)
- Monday–Friday column view
- Add tasks to specific days
- Mark tasks complete with a click
- Set tasks as **recurring** so they auto-copy each week
- Navigate between weeks with arrow buttons
- Filter by child

### Resources (Part 3 — Resources section)
- Add websites, PDFs, books, and notes
- Link resources to specific children and subjects
- Click **Open** to visit a URL directly

### Setup (Part 3 — Subjects & Outcomes)
- Add subjects for each child (with icon, colour, hours/week target)
- Add learning outcomes to track milestones
- Tick off outcomes as they're achieved

### Admin (Part 4)
- **Admin only** — accessible via the sidebar when logged in as admin
- Add/edit/delete children with name, year level, avatar colour
- Create user accounts (parent or admin roles)
- Each user has their own username + password

---

## 🔧 Development Mode (if you want to edit code)

Run the backend and frontend in separate terminals:

**Terminal 1 — Backend:**
```bash
cd ~/homeschool/backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd ~/homeschool/frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## 🔄 Updating the App

After making changes to the code:
```bash
cd ~/homeschool/frontend
npm run build         # Rebuild frontend

pm2 restart homeschool-hub   # Restart backend
```

---

## 🔐 Security Checklist

Before going live, update these in `ecosystem.config.js`:
```js
JWT_SECRET: 'replace-with-a-long-random-string-at-least-32-chars',
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then restart: `pm2 restart homeschool-hub`

---

## 📁 Project Structure

```
homeschool/
├── backend/
│   └── src/
│       ├── index.js          # Express server
│       ├── db/init.js        # SQLite database setup
│       ├── middleware/auth.js # JWT authentication
│       └── routes/           # API route handlers
│           ├── auth.js       # Login, user management
│           ├── children.js   # Children, subjects, outcomes
│           ├── tasks.js      # Weekly tasks
│           └── resources.js  # Learning resources
├── frontend/
│   └── src/
│       ├── App.jsx           # Router + layout
│       ├── pages/            # Page components
│       │   ├── Dashboard.jsx
│       │   ├── WeeklyPlanner.jsx
│       │   ├── Resources.jsx
│       │   ├── Setup.jsx
│       │   └── Admin.jsx
│       ├── components/
│       │   └── Sidebar.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       └── utils/
│           ├── api.js        # Axios instance
│           └── dates.js      # Week helpers
├── data/                     # SQLite database (auto-created)
├── logs/                     # PM2 log files (auto-created)
├── ecosystem.config.js       # PM2 config
├── nginx.conf                # Nginx site config
└── setup.sh                  # Auto-install script
```

---

## 🛠 Useful Commands

```bash
# App management
pm2 status                    # Check if app is running
pm2 logs homeschool-hub       # Live log stream
pm2 restart homeschool-hub    # Restart after config changes
pm2 stop homeschool-hub       # Stop the app

# Nginx
sudo nginx -t                 # Test config
sudo systemctl restart nginx  # Restart nginx
sudo systemctl status nginx   # Check nginx status

# Database (SQLite — view raw data)
sqlite3 ~/homeschool/data/homeschool.db
.tables           # List tables
SELECT * FROM children;
.quit
```
