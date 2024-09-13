from crc16 import crc16_func
from utils import insert_uint32_big_endian, insert_uint16_big_endian
import serial, sys, threading,time, signal, os, json, copy

def signal_handler(sig, frame):
    print("\n自定义处理: 检测到 Ctrl+C，程序正在退出...")
    sys.exit(0)  # 正常退出

signal.signal(signal.SIGINT, signal_handler)

COM = sys.argv[1]
BAUD = 115200
if len(sys.argv) >= 3:
    BAUD = int(sys.argv[2])

# 打开串口，设置波特率和超时
ser = serial.Serial(COM, BAUD, timeout=0.01)
# 如果在 Linux 或 macOS 上，使用类似 '/dev/ttyUSB0'
# ser = serial.Serial('/dev/ttyUSB0', 9600, timeout=1)

# 检查串口是否成功打开
if ser.is_open:
    print(f"串口 {ser.name} 已打开")

def serial_reader():
    # 接收数据
    while(True):
        data = ser.read(100)  # 期望读取 100 个字节的数据，但有超时(目前是0.01s)
        if len(data) > 0:
            hex_str = data.hex()
            print("\b\b", end='', flush=True)
            print("recv: %s" % (f"{' '.join(hex_str[i:i+2] for i in range(0, len(hex_str), 2))}"))
            print("> ", end='', flush=True)

read_thread = threading.Thread(target=serial_reader)
read_thread.daemon = True
read_thread.start()

# read templates
templates = {}
cmd_name_map = {}
for i in ("query", "regaccept", "requirereg", "down"):
    with open('template/%s.json' % (i,), 'r', encoding='utf-8') as file:
        templates[i] = json.load(file)
        cmd_name_map[templates[i]["cmd"]] = i

def generate(tpl, has_crc):
    
    if cmd_name_map[tpl["cmd"]] == "query":
        ba = bytearray(20)
        ba[0] = tpl["cmd"]
        insert_uint32_big_endian(ba, tpl["devid"], 1)
        ba[5] = tpl["frameseq"]
        insert_uint16_big_endian(ba, tpl["nonce"], 6)
        insert_uint32_big_endian(ba, tpl["gwtoken"], 8)
        insert_uint32_big_endian(ba, tpl["key"], 12)
        insert_uint16_big_endian(ba, tpl["q"], 16)
        
        if has_crc:
            insert_uint16_big_endian(ba, tpl["crc"], 18)
        else:
            # 只有query的CRC计算不需要gateway_token
            insert_uint16_big_endian(ba, crc16_func(ba[:18]), 18)

        return bytes(ba)
    
    elif cmd_name_map[tpl["cmd"]] == "regaccept":
        ba = bytearray(10)
        ba[0] = tpl["cmd"]
        insert_uint32_big_endian(ba, tpl["devid"], 1)
        ba[5] = tpl["frameseq"]
        insert_uint16_big_endian(ba, tpl["shortaddr"], 6)
                
        if has_crc:
            insert_uint16_big_endian(ba, tpl["crc"], 8)
        else:
            ba_4_crc = bytearray(8 + 4)
            ba_4_crc[:8] = ba[:8]
            insert_uint32_big_endian(ba_4_crc, gateway_token, 8)
            insert_uint16_big_endian(ba, crc16_func(ba_4_crc), 8)

        return bytes(ba)
    
    elif cmd_name_map[tpl["cmd"]] == "requirereg":
        ba = bytearray(18)
        ba[0] = tpl["cmd"]
        insert_uint16_big_endian(ba, tpl["shortaddr"], 1)
        ba[3] = tpl["frameseq"]
        insert_uint16_big_endian(ba, tpl["nonce"], 4)
        insert_uint32_big_endian(ba, tpl["gwtoken"], 6)
        insert_uint32_big_endian(ba, tpl["key"], 10)
        insert_uint16_big_endian(ba, tpl["q"], 14)
        
        if has_crc:
            insert_uint16_big_endian(ba, tpl["crc"], 16)
        else:
            ba_4_crc = bytearray(16 + 4)
            ba_4_crc[:16] = ba[:16]
            insert_uint32_big_endian(ba_4_crc, gateway_token, 16)
            insert_uint16_big_endian(ba, crc16_func(ba_4_crc), 16)
        
        return bytes(ba)
    
    elif cmd_name_map[tpl["cmd"]] == "down":
        ba = bytearray(7 + tpl["datalen"])
        ba[0] = tpl["cmd"]
        insert_uint16_big_endian(ba, tpl["shortaddr"], 1)
        ba[3] = tpl["frameseq"]

        if tpl["start"]:
            tpl["start"] = 1
        else:
            tpl["start"] = 0

        if tpl["stop"]:
            tpl["stop"] = 1
        else:
            tpl["stop"] = 0

        ba[4] = (tpl["start"] << 7) + (tpl["stop"] << 6) + (tpl["datalen"] & 0x3F)
        ba[5:5+tpl["datalen"]] = tpl["data"]

        if has_crc:
            insert_uint16_big_endian(ba, tpl["crc"], 5+tpl["datalen"])
        else:
            ba_4_crc = bytearray((5 + tpl["datalen"]) + 4)
            ba_4_crc[:(5 + tpl["datalen"])] = ba[:(5 + tpl["datalen"])]
            insert_uint32_big_endian(ba_4_crc, gateway_token, (5 + tpl["datalen"]))
            insert_uint16_big_endian(ba, crc16_func(ba_4_crc), 5 + tpl["datalen"])
        
        return bytes(ba)

def parsecmd(cmd):
    if cmd == "exit":
        sys.exit(0)
        
    tokens = cmd.split()
    if len(tokens) < 2:
        return False, False, None
    if tokens[0] != 'send' or not tokens[1] in templates:
        return False, False, None
    
    tpl = templates[tokens[1]]
    tpl_copy = copy.deepcopy(tpl)
    has_seq = False
    has_crc = False
    has_gwtoken = False
    has_nonce = False
    if len(tokens) > 2:
       
        for key_val in tokens[2:]:
            try:
                k, v = key_val.split('=')
                if k not in tpl_copy:
                    return False, False, None
                
                if k == "frameseq":
                    has_seq = True
                if k == "crc":
                    has_crc = True
                if k == "gwtoken":
                    has_gwtoken = True
                if k == "nonce":
                    has_nonce = True
                
                if k != "data":
                    tpl_copy[k] = int(v)
                else:
                    tpl_copy[k] = list(bytes.fromhex(v))
            except Exception as e:
                return False, False, None
    
    if not has_seq:
        tpl_copy["frameseq"] = next(seq)
    if not has_gwtoken:
        if cmd_name_map[tpl_copy["cmd"]] == "query" or cmd_name_map[tpl_copy["cmd"]] == "requirereg":
            tpl_copy["gwtoken"] = gateway_token
    if not has_nonce:
        if cmd_name_map[tpl_copy["cmd"]] == "query" or cmd_name_map[tpl_copy["cmd"]] == "requirereg":
            tpl_copy["nonce"] = nonce

    # calculate datalen
    if cmd_name_map[tpl_copy["cmd"]] == "down":
        tpl_copy["datalen"] = len(tpl_copy["data"])

    return True, has_crc, tpl_copy

def gen_seq(start=0):
    num = start
    while True:
        yield num
        num += 1
        if num == 256:
            num = 0
seq = gen_seq()

gateway_token = 0x00007AC1
nonce = 0x132F

while(1):
    user_input = input("> ")
    succ, has_crc, tpl = parsecmd(user_input)
    if not succ:
        print("bad command")
    else:
        print(tpl)
        frameBytes = generate(tpl, has_crc)
        hex_str = frameBytes.hex()
        hex_str = f"{' '.join(hex_str[i:i+2] for i in range(0, len(hex_str), 2))}"
        ser.write(frameBytes)
        print("sent:", hex_str)

ser.close()

