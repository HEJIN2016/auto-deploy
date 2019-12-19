# auto-deploy

> 前端自动化编译与部署脚本
当前支持window上传至linux服务器以及linux上传至linux服务器

### 使用方法
1.下载项目，```git clone https://github.com/HEJIN2016/auto-deploy.git```
将项目中autoDeploy.js文件拷贝至前端项目根目录下（与前端打包完之后的dist目录同级）

2.安装依赖：
```
 npm install archiver ssh2 -D
```

3.配置前端工程部署服务器用户密码等
在autoDeploy.js中，找到首行的对象Config，配置相关参数，配置如下
```js
const Config = {
  host: 'test.com', // 服务器ip地址或域名
  port: 22, // 服务器ssh连接端口号
  username: 'root', // ssh登录用户
  password: '', // 密码
  // privateKey: fs.readFileSync('myKey.key'), // 私钥，私钥与密码二选一

  catalog: '/var/www/test', // 前端文件压缩目录，请勿以/符号结尾
  buildDist: 'dist', // 前端文件打包之后的目录，默认dist
  buildCommand: 'npm run build', // 打包前端文件的命令，默认为npm run build
  readyTimeout: 20000 // ssh连接超时时间
};
```

4.执行上传命令
``` node autoDeploy.js```，耐心等待部署完毕，建议将```node autoDeploy.js```命令添加进入package.json中
  
  