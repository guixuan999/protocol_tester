# usage:
# python crc16.py "50 74 32 00 88 9A cc dd"
# CRC16 结果: 816B

import crcmod, re, sys

# 要计算 CRC 的数据，必须是字节串
data = bytes.fromhex(re.sub(r'\s+', '', sys.argv[1]))

# 定义多项式，多项式应包含最高位的 x^16 项
# 对于多项式 x^16 + x^5 + x^2 + 1，其二进制表示为 1 0000 0000 0010 0101（共17位）
# 转换为十六进制表示为 0x10025

polynomial = 0x18005  # 包含最高位的多项式
                      # 这里是 二进制 1,1000,0000,0000,0101 对应多项式 x^16+x^15+x^2+1

# 创建 CRC 函数
# 参数解释：
# - poly：多项式，必须是整数，包含最高位的 1
# - initCrc：初始值，这里使用常见的 0xFFFF，您可以根据需要修改
# - rev：是否反转输入数据位，这里设为 False
# - xorOut：最终输出的异或值，这里设为 0x0000

crc16_func = crcmod.mkCrcFun(poly=polynomial, initCrc=0xFFFF, rev=False, xorOut=0x0000)

# 计算 CRC 值
crc_result = crc16_func(data)

print('CRC16 结果: {:04X}'.format(crc_result))  # 以 16 进制格式输出
