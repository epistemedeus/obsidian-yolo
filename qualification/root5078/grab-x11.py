#!/usr/bin/env python3
# Screenshot only the explicitly owned Xvfb; no desktop/global-display fallback.
import ctypes as C
import struct
import zlib
from pathlib import Path
class Image(C.Structure):
    _fields_=[('width',C.c_int),('height',C.c_int),('xoffset',C.c_int),('format',C.c_int),('data',C.c_void_p),('byte_order',C.c_int),('bitmap_unit',C.c_int),('bitmap_bit_order',C.c_int),('bitmap_pad',C.c_int),('depth',C.c_int),('bytes_per_line',C.c_int),('bits_per_pixel',C.c_int),('red_mask',C.c_ulong),('green_mask',C.c_ulong),('blue_mask',C.c_ulong)]
x=C.CDLL('libX11.so.6');x.XOpenDisplay.argtypes=[C.c_char_p];x.XOpenDisplay.restype=C.c_void_p;x.XDefaultRootWindow.argtypes=[C.c_void_p];x.XDefaultRootWindow.restype=C.c_ulong
x.XGetImage.argtypes=[C.c_void_p,C.c_ulong,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_ulong,C.c_int];x.XGetImage.restype=C.POINTER(Image)
x.XDestroyImage.argtypes=[C.POINTER(Image)];x.XCloseDisplay.argtypes=[C.c_void_p]
d=x.XOpenDisplay(b':0');assert d
im=x.XGetImage(d,x.XDefaultRootWindow(d),0,0,1280,900,C.c_ulong(-1).value,2);assert im
try:
    a=im.contents;assert a.bits_per_pixel==32 and a.red_mask==0xff0000 and a.green_mask==0xff00 and a.blue_mask==0xff and a.byte_order==0
    b=C.string_at(a.data,a.bytes_per_line*a.height);rows=[]
    for y in range(a.height):
        row=b[y*a.bytes_per_line:y*a.bytes_per_line+a.width*4];out=bytearray(a.width*3)
        out[0::3]=row[2::4];out[1::3]=row[1::4];out[2::3]=row[0::4];rows.append(b'\0'+out)
    def chunk(k,v):return struct.pack('>I',len(v))+k+v+struct.pack('>I',zlib.crc32(k+v)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',a.width,a.height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
    Path('runtime/root5084-private/display.png').write_bytes(png);print('Captured owned display :0',a.width,a.height)
finally:x.XDestroyImage(im);x.XCloseDisplay(d)
