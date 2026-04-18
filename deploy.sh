#!/bin/bash
set -e

echo "===== 1. 启动 MySQL ====="
systemctl start mysql
systemctl enable mysql

echo "===== 2. 创建数据库 ====="
mysql -e "CREATE DATABASE IF NOT EXISTS elderly_care_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "SHOW DATABASES;"

echo "===== 3. 创建项目目录 ====="
mkdir -p /var/www
cd /var/www

echo "===== 4. 克隆代码 ====="
git clone https://github.com/XiFeng224/AgeWise.git
cd AgeWise

echo "===== 5. 安装后端依赖 ====="
cd backend
npm install
npm run build

echo "===== 6. 安装前端依赖并构建 ====="
cd ../frontend
npm install
npm run build

echo "===== 7. 配置后端环境变量 ====="
cd /var/www/AgeWise/backend
cat > .env << 'ENVEOF'
PORT=8000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_NAME=elderly_care_agent
DB_USER=root
DB_PASSWORD=
JWT_SECRET=elderly-care-super-secret-jwt-key-2024
DB_SYNC_ALTER=false
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
AI_AGENT_ENABLED=false
ENVEOF

echo "===== 8. 安装 PM2 ====="
npm install -g pm2

echo "===== 9. 启动后端服务 ====="
pm2 start npm --name "elderly-care-backend" -- start

echo "===== 10. 配置 Nginx ====="
cat > /etc/nginx/sites-available/elderly-care << 'NGINXEOF'
server {
    listen 80;
    server_name 139.196.49.108;

    root /var/www/AgeWise/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/elderly-care /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "===== 11. 配置防火墙 ====="
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "===== 12. 初始化测试数据 ====="
cd /var/www/AgeWise/backend
npm run seed:china || true
npm run seed:high-risk || true
npm run seed:agent-bundle || true

echo "===== 13. 保存 PM2 配置 ====="
pm2 save
pm2 startup

echo "===== 14. 重启所有服务 ====="
pm2 restart all
systemctl restart nginx

echo "===== 15. 检查服务状态 ====="
pm2 status
systemctl status nginx --no-pager
curl -s http://localhost:8000/api/health || echo "Backend health check failed"
curl -s http://localhost/ || echo "Frontend check failed"

echo "===== 部署完成! ====="
echo "访问地址: http://139.196.49.108"
echo "后端 API: http://139.196.49.108/api"
echo "默认账号: admin"
echo "默认密码: admin123"
