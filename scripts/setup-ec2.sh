#!/bin/bash
set -e

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Create app directory
sudo mkdir -p /opt/todo-app
sudo chown ec2-user:ec2-user /opt/todo-app

# Create systemd service
sudo tee /etc/systemd/system/todo-app.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Todo App
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/todo-app
ExecStart=/usr/bin/node /opt/todo-app/server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/todo-app/.env

[Install]
WantedBy=multi-user.target
SERVICEEOF

echo "EC2 setup complete. Upload app files and create .env file, then start the service."
