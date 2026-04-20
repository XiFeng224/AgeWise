#!/bin/bash
echo "检查 MySQL 用户配置..."
mysql -e "SELECT user, host, plugin FROM mysql.user WHERE user='root';"

echo "修改 root 用户认证方式..."
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';"
mysql -e "FLUSH PRIVILEGES;"

echo "验证修改..."
mysql -e "SELECT user, host, plugin FROM mysql.user WHERE user='root';"

echo "测试数据库连接..."
mysql -u root -p'' -e "SHOW DATABASES;"