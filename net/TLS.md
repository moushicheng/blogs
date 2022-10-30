
1. 客户端发送 Client Hello ，协定TLS版本，加密套件，R1（第一随机数     Hello阶段
2. 服务端发送 Server Hello，指定TLS版本，指定加密套件，R2，还有CA证书
3. 客户端利用CA证书的服务器公钥，加密 预主密钥（R3），发送公钥加密[R3]   ClientKeyExchange阶段
4. 服务端利用私钥解密 公钥加密[R3]，得到R3
5. 客户端服务端各自利用R1 R2 R3 计算会话秘钥 K                     
6. 用K来加密Finish消息，互相发送并各自验证，确认最终链接。                       ChangeCipherSpec阶段