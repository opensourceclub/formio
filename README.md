原版readme: https://github.com/formio/formio

定制版Formio
===============================

开发环境配置
------------------
Node.js 和 MongoDB
- Node.js - https://nodejs.org/en/
- MongoDB - http://docs.mongodb.org/manual/installation/
    - Mac ```brew install mongodb```
    - Windows https://www.mongodb.org/downloads
    - Docker
      - 安装Docker
      - 启动mongo docker image
         ```
         docker-compose up mongo
         ```
启动Node.js服务器
-------------------
启动服务器
```
git clone https://github.com/xiyangliu/formio.git
cd formio
git checkout translation
npm install
npm start
Are you sure you wish to install? (y/N): y
Which Github application would you like to install? 1
Local file path or just press Enter for default.:  (client) 
Enter your email address for the root account.:  <输入admin用户名，如admin@example.com>
Enter your password for the root account.:  <输入admin密码，如1234>
```
浏览页面
```
http://localhost:3001
```
