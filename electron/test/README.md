# 测试 Protocol Tester 的测试程序
> gw.py是一个交互式命令行程序。

> 可以模拟网关：通过串口给 ***Protocol Tester*** 发包，从 ***Protocol Tester*** 收到的包也会显示出来。

## 用法
> 首先在终端里运行下面的命令
```ps
python gw.py COMn [BAUD_RATE]
```
其中，
- COMn是串口名字，如COM3，COM10等 
- BAUD_RATE可选，默认值为115200

> 然后输入命令

## 支持的命令
> 命令具有以下格式
```ps
send query|down|regaccept|requirereg [Param List]
```
其中，
- **Param List** 是可选的，其中每一个参数都采用以下形式：

  **KEY=VALUE**

- template/下面有一些json文件，是包的模板

- **KEY** 的可选项就是对应模板里面的那些属性名

例如：template/down.json有如下内容：
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

那么 send down 命令后面可以有的参数为 shortaddr=SHORTADDR data=1133FABC ...， 像下面这样：

```powershell
PS D:\repo\micmote\engineering\cx102\protocol-tester\electron\test> python gw.py COM15
串口 COM15 已打开
> send down shortaddr=101 data=1133FABC
{'cmd': 16, 'shortaddr': 101, 'frameseq': 0, 'start': 1, 'stop': 1, 'datalen': 4, 'data': [17, 51, 250, 188], 'crc': 1}
sent: 10 00 65 00 c4 11 33 fa bc 09 9e
recv: 00 00 65 07 c4 11 33 fa bc d1 e6
>

```
PS: 对于缺乏的参数，会采用json模板里面的值，不过有些值又是通过自动计算得到（比如CRC）.

## test.py
可以修改并运行 **python test.py**, 它会创建gw.py进程，并为它产生命令输入序列, 如此可以定制发包流程.
