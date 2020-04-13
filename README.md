在常规的前端项目中，部署项目需要经过本地build，压缩文件，将压缩包上传至服务器并解压文件等步骤，过程较为繁琐。所以本人编写了一个nodejs脚本，用来告别手动上传的过程，配置使用简单，实现前端一键自动化部署。
 


> 前端自动化编译与部署脚本
当前支持window上传至linux服务器以及linux上传至linux服务器，并且支持通过跳板机连接目标机器
如果您觉得对您有帮助 点个赞或者去GitHub点个star ，非常感谢
[项目git地址]([https://github.com/HEJIN2016/auto-deploy](https://github.com/HEJIN2016/auto-deploy)
)

注意：
    
    1.使用前需保证服务端安装了unzip（安装方法 apt-get install unzip）
    2.暂只支持上传至linux ubuntu/centos等服务器
#### 使用步骤
1.下载项目，```git clone https://github.com/HEJIN2016/auto-deploy.git```
将项目中autoDeploy.js文件拷贝至前端项目根目录下（与前端打包完之后的dist目录同级）

2.安装依赖：
```
 npm install archiver ssh2 -D
```

3.配置前端工程部署服务器用户密码等
在autoDeploy.js中，找到首行的环境对象dev、test、和pro，分别代表开发、测试、线上环境，配置相关参数(如果不需要配置多个环境，则可只配置一个环境的参数，然后在Config对象中的publishEnv指明使用该环境)，然后配置Config中的其他参数，配置如下
```js
// 开发环境
const dev = {
  host: 'dev.test.cn', // 服务器ip地址或域名
  password: '', // 密码
  catalog: '/var/www/test', // 前端文件压缩目录
  port: 22, // 服务器ssh连接端口号
  username: 'root', // ssh登录用户
  privateKey: null, // 私钥，私钥与密码二选一
};
// 测试环境
const test = {
  host: 'test.test.cn', // 服务器ip地址或域名
  password: '', // 密码
  catalog: '/var/www/test', // 前端文件压缩目录
  port: 22, // 服务器ssh连接端口号
  username: 'root', // ssh登录用户
  privateKey: null, // 私钥，私钥与密码二选一
};
// 线上环境
const pro = {
  host: 'test.test.cn', // 服务器ip地址或域名
  password: '', // 密码，请勿将此密码上传至git服务器
  catalog: '/var/www/test', // 前端文件压缩目录
  port: 22, // 服务器ssh连接端口号
  username: 'root', // ssh登录用户
  privateKey: null, // 私钥，私钥与密码二选一
};
// 全局配置
const Config = {
  // publishEnv: pro,
  publishEnv: [ test ], // 发布环境，可填写多个，也可只填写一个

  buildDist: 'dist', // 前端文件打包之后的目录，默认dist
  buildCommand: 'npm run build', // 打包前端文件的命令
  readyTimeout: 20000, // ssh连接超时时间
  deleteFile: true // 是否删除线上上传的dist压缩包
};
```

4.执行上传命令
``` node autoDeploy.js```，耐心等待部署完毕，建议将```node autoDeploy.js```命令添加进入package.json中

#### 部署基本流程介绍
1.执行build命令

2.压缩打包之后的文件

3.ssh连接服务器并上传文件

4.解压上传的文件

5.删除本地的压缩包文件，部署完毕
