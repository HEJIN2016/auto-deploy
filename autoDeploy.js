const Config = {
  host: 'test.com', // 服务器ip地址或域名
  port: 22, // 服务器ssh连接端口号
  username: 'root', // ssh登录用户
  password: '1234', // 密码
  privateKey: null, // 私钥，私钥与密码二选一

  catalog: '/var/www', // 前端文件压缩目录
  buildDist: 'dist', // 前端文件打包之后的目录，默认dist
  buildCommand: 'npm run build', // 打包前端文件的命令
  readyTimeout: 20000 // ssh连接超时时间
};

const { exec } = require('child_process');
const path = require('path');
const archiver = require('archiver');
const fs = require('fs');
const Client = require("ssh2").Client;


// 前端打包文件的目录
const dir = path.resolve(__dirname, Config.buildDist);


class SSH {
  constructor ({ host, port, username, password, privateKey }) {
    this.server = {
      host, port, username, password, privateKey
    };
    this.conn = new Client();
  }

  // 连接服务器
  connectServer () {
    return new Promise((resolve, reject) => {
      this.conn.on("ready", ()=>{
        resolve({
          success: true
        });
      }).on('error', (err)=>{
        reject({
          success: false,
          error: err
        });
      }).on('end', ()=> {
        console.log("connect end!");
      }).on('close', (had_error)=>{
        console.log("connect close");
      }).connect(this.server);
    })
  }

  // 上传文件
  uploadFile ({ localPath, remotePath }) {
    return new Promise((resolve, reject) => {
      return this.conn.sftp((err, sftp)=>{
        if (err) {
          reject({
            success: false,
            error: err
          });
        } else{
          sftp.fastPut(localPath, remotePath, (err, result)=>{
            if (err) {
              reject({
                success: false,
                error: err
              });
            }
            resolve({
              success: true,
              result
            });
          });
        }
      })
    })
  }

  // 执行ssh命令
  execSsh (command) {
    return new Promise((resolve, reject) => {
      return this.conn.exec(command, (err, stream)=>{
        if (err || !stream) {
          reject({
            success: false, error: err
          });
        } else {
          stream.on('close', (code, signal) => {
            this.conn.end();
            resolve({
              success: true
            });
          }).on('data', function (data) {
            console.log(data.toString());
          }).stderr.on('data', function (data) {
            console.log(data.toString());
          });
        }
      });
    })
  }

  // 结束连接
  endConn () {
    this.conn.end();
    console.log('----SSH连接已关闭----');
  }

  // 删除本地文件
  deleteLocalFile (filePathName) {
    return new Promise((resolve, reject) => {
      fs.unlink(filePathName, function(error){
        if(error){
          reject({
            success: false,
            error
          });
        } else {
          resolve({
            success: true
          });
        }
      })
    })
  }

  // 压缩文件夹下的所有文件
  zipFile(fileName, filePath) {
    return new Promise((resolve, reject) => {
      // 创建文件输出流
      let output = fs.createWriteStream(__dirname + '/' + fileName);
      let archive = archiver('zip', {
        zlib: { level: 9 } // 设置压缩级别
      });
      // 文件输出流结束
      output.on('close', function() {
        console.log(`----压缩文件总共 ${archive.pointer()} 字节----`);
        console.log('----压缩文件夹完毕----');
        resolve({
          success: true
        })
      });
      // 数据源是否耗尽
      output.on('end', function() {
        console.error('----压缩失败，数据源已耗尽----');
        reject();
      });
      // 存档警告
      archive.on('warning', function(err) {
        if (err.code === 'ENOENT') {
          console.error('----stat故障和其他非阻塞错误----')
        } else {
          console.error('----压缩失败----');
        }
        reject(err);
      });
      // 存档出错
      archive.on('error', function(err) {
        console.error('----存档错误，压缩失败----');
        console.error(err);
        reject(err);
      });
      // 通过管道方法将输出流存档到文件
      archive.pipe(output);

      // 打包dist里面的所有文件和目录
      archive.directory(filePath, false);
      // archive.directory(`../${Config.buildDist}/`, false);

      // 完成归档
      archive.finalize();
    })
  }

  // 打包本地前端文件
  buildProject () {
    console.log('----开始编译打包文件，请耐心等待----');
    return new Promise((resolve, reject) => {
      exec(Config.buildCommand, async (error, stdout, stderr) => {
        if (error) {
          console.error(error);
          reject({
            error,
            success: false
          });
        } else if (stderr) {
          console.error(stderr);
          reject({
            error,
            success: false
          });
        } else {
          resolve({
            stdout,
            success: true
          });
        }
      });
    })
  }
}

// 停止程序之前需结束ssh连接并删除本地压缩包文件
function stopProgress(sshCon, fileName, notEnd) {
  if (!notEnd) {
    // ssh未连接成功时无需停止ssh连接
    sshCon.endConn();
  }
  sshCon.deleteLocalFile(fileName).catch((e)=>{
    console.error('----删除本地文件失败，请手动删除----');
    console.error(e);
  }).then(()=>{
    console.log('----已删除本地压缩包文件----');
  })
}

// 执行前端部署
(async ()=> {
  let sshCon = new SSH(Config);
  // 打包文件
  let buildRes = await sshCon.buildProject().catch(e=>{
    console.error(e);
  });
  if (!buildRes || !buildRes.success) {
    console.error('----编译打包文件出错----');
    return false;
  }
  console.log(buildRes.stdout);
  console.log('----编译打包文件完成----');

  let date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let timeStr = `${year}_${month}_${day}`;
  const fileName = `${Config.buildDist}-`+ timeStr + '-' + Math.random().toString(16).slice(2) + '.zip';
  let res = await sshCon.zipFile(fileName, `${Config.buildDist}/`).catch(()=>{});
  if (!res || !res.success) return false;
  console.log('----开始进行SSH连接----');

  let sshRes = await sshCon.connectServer().catch(e=>{
    console.error(e);
  });
  if (!sshRes || !sshRes.success) {
    console.error('----连接服务器失败，请检查用户名密码是否正确以及服务器是否已开启远程连接----');
    stopProgress(sshCon, fileName, true);
    return false;
  }

  console.log('----连接服务器成功，开始上传文件----');

  let uploadRes = await sshCon.uploadFile({
    localPath: path.resolve(__dirname, fileName),
    remotePath: Config.catalog + '/' + fileName
  }).catch(e=>{
    console.error(e);
  });

  if (!uploadRes || !uploadRes.success) {
    console.error('----上传文件失败，请重新上传----');
    stopProgress(sshCon, fileName);
    return false;
  }
  console.log('----上传文件成功，开始解压文件----');

  let zipRes = await sshCon.execSsh(`unzip -o ${Config.catalog + '/' + fileName} -d ${Config.catalog}`).catch((e)=>{
    console.error(e);
  });
  if (!zipRes || !zipRes.success) {
    console.error('----解压文件失败，请手动解压zip文件----');
    stopProgress(sshCon, fileName);
    return false;
  }
  console.log('----部署成功，正在为您删除本地文件----');

  stopProgress(sshCon, fileName);

})();
