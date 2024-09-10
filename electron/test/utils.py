import struct

def insert_uint32_big_endian(byte_arr, value, offset):
    """
    将一个无符号32位整数以大端序插入到 bytearray 的指定位置。

    :param byte_arr: 目标 bytearray。
    :param value: 要插入的无符号32位整数。
    :param offset: 插入的位置（从0开始）。
    """
    if offset < 0 or offset + 4 > len(byte_arr):
        raise ValueError("Offset out of range for the bytearray.")

    # 将整数转换为大端序的字节序列
    byte_seq = struct.pack('!I', value)
    
    # 替换 bytearray 中的字节
    byte_arr[offset:offset + 4] = byte_seq


def insert_uint16_big_endian(byte_arr, value, offset):
    """
    将一个无符号16位整数以大端序插入到 bytearray 的指定位置。

    :param byte_arr: 目标 bytearray。
    :param value: 要插入的无符号16位整数。
    :param offset: 插入的位置（从0开始）。
    """
    if offset < 0 or offset + 2 > len(byte_arr):
        raise ValueError("Offset out of range for the bytearray.")
    
    if not (0 <= value <= 0xFFFF):
        raise ValueError("Value must be between 0 and 65535 for a 16-bit unsigned integer.")
    
    # 将整数转换为大端序的字节序列
    byte_seq = struct.pack('!H', value)
    
    # 替换 bytearray 中的字节
    byte_arr[offset:offset + 2] = byte_seq