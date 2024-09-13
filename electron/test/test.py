from subprocess import Popen, PIPE, STDOUT

import time, signal, sys

def signal_handler(sig, frame):
    print("\n检测到 Ctrl+C，程序正在退出...")
    p.kill()
    sys.exit(0)  # 正常退出

# 注册信号处理函数
signal.signal(signal.SIGINT, signal_handler)

def send_cmd(p, cmd, wait_before_send):
    time.sleep(wait_before_send) # need this before next input
    p.stdin.write(cmd)
    p.stdin.flush() # need this for every input

p = Popen(['python', "gw.py", "COM15"], stdin=PIPE, stderr=STDOUT)

print("STARTED NOT FROM TERMINAL, You Can't input command from console!!!")
print("ctrl+c to exit !!!\n")

send_cmd(p, b"send query\n", 0.05)

send_cmd(p, b"send regaccept shortaddr=101\n", 0.2)

send_cmd(p, b"send down shortaddr=101 start=1 stop=0 data=0102030405060708090A0B0C0D\n", 0.1)

send_cmd(p, b"send down shortaddr=101 start=0 stop=0 data=1112131415161718191A1B1C1D\n", 0.1)

send_cmd(p, b"send down shortaddr=101 start=0 stop=1 data=908070\n", 0.1)

while(True):
    time.sleep(1)
