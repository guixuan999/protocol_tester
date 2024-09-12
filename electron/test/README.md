# 测试Protocol Tester的测试程序
gw.py是一个命令行程序，可以模拟网关，通过串口给Protocol Tester发包，从Protcol Tester收到的包也会显示出来

## 用法
- 运行python gw.py COMn [BAUD_RATE]
- 其中BAUD_RATE可选，默认值为115200
- 然后输入命令

## 支持的命令

- send query|down|regaccept|requirereg [Param List]


- 其中 Param List是可选的，其中每一个参数都采用以下形式
- KEY=VALUE

- template/下面有一些json文件，是包的模板

- KEY可选项就是对应模板里面的属性名
- 例如 down.json有如下内容
```json
{
    "cmd": 16,
    "shortaddr": 22,
    "frameseq": 1,
    "start": 1,
    "end": 1,
    "datalen": 12306,
    "data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
    "crc": 1
}
```
- 那么 send down 命令后面可以有的参数为 shortaddr=SHORTADDR data=1133FABC ...
例如：
```powershell
PS D:\repo\micmote\engineering\cx102\protocol-tester\electron\test> python gw.py COM15
串口 COM15 已打开
> send down shortaddr=101 data=1133FABC
{'cmd': 16, 'shortaddr': 101, 'frameseq': 0, 'start': 1, 'end': 1, 'datalen': 4, 'data': [17, 51, 250, 188], 'crc': 1}
sent: 10 00 65 00 c4 11 33 fa bc 09 9e
recv: 00 00 65 07 c4 11 33 fa bc d1 e6
>

```
- 对于缺乏的参数，会采用json模板里面的值，不过有些值又是通过自动计算得到，比如CRC

## test.py
可以修改并运行python test.py, 他会产生gw.py程序的命令输入, 做到简单的发包流程
