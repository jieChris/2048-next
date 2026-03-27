可以。下面给你一版能直接落地的 **v1 回放协议草案**，范围先只覆盖：

* 普通 `4x4`
* 可撤回 `4x4`
* `3x4`
* 不记录 seed
* 只记录**有效移动**
* 保留每一步时间
* 以后还能扩展到其他玩法

我会把它分成两个文件层级：

* **`.rpl`**：最终导出的紧凑回放文件，给用户保存/分享
* **`.rlog`**：运行时日志，解决“崩溃后尽量不丢已完成步骤”

重点先写 `.rpl`。

---

# 1. 设计原则

这版协议的核心是：

**初始盘面 + 每个有效移动的方向 + 该步生成结果 + 时间差**

不存 seed，不存每步整盘。

因为对普通 `4x4/3x4` 来说，一步有效移动真正不可推导的信息只有：

* 方向：4 个方向，2 bit
* 新砖位置：最多 16 格，4 bit
* 新砖数值：2 / 4，1 bit
* 这一步距上一“已结算步骤”的时间差：varint

也就是每步核心只要 **1 byte + 时间 varint**。

---

# 2. `.rpl` 文件格式

## 2.1 文件整体结构

```text
RPL file
= header
+ records...
+ file_crc32
```

具体定义：

```text
offset  size   field
0       4      magic = "RPL1"
4       1      dims
5       1      flags
6       1      init_count
7       ?      start_unix_ms        (optional, if flags bit0 = 1)
?       N      init_tiles[]         (init_count bytes)
?       ...    records[]
...     4      crc32_le             (对前面所有字节做 CRC32)
```

---

## 2.2 Header 字段定义

### `magic`

固定 4 字节：

```text
"RPL1"
```

---

### `dims`

1 字节，棋盘尺寸，低 4 位是宽，高 4 位是高：

```text
dims = (width & 0x0F) | ((height & 0x0F) << 4)
```

例子：

* `4x4` → `0x44`
* `3x4` → `0x43`

---

### `flags`

1 字节：

```text
bit0: has_start_unix_ms     // 文件头里是否包含对局开始绝对时间
bit1: contains_undo_records // 是否包含 UNDO 事件（完整会话回放）
bit2: contains_checkpoints  // 是否包含 CHECKPOINT
bit3: reserved
bit4: reserved
bit5: reserved
bit6: reserved
bit7: reserved
```

建议默认：

* 普通分享文件：`bit1 = 0`
* 要复现完整撤回过程：`bit1 = 1`

---

### `init_count`

初始砖块个数。

普通 2048 一般是 `2`，但这里不写死，方便以后扩展。

---

### `start_unix_ms`

可选，ULEB128。

只在 `flags.bit0 = 1` 时存在。

用途：

* 想恢复每一步绝对起止时刻，就存
* 不关心绝对时间，只关心步间用时，就可以不存

---

### `init_tiles[]`

每个初始砖块 1 字节：

```text
bit0..3 : cell_index   // 0..15
bit4    : value_bit    // 0=2, 1=4
bit5..7 : reserved
```

这里先只针对普通 `4x4/3x4`，所以初始砖只考虑 `2/4`。

格子编号统一用 **row-major**：

```text
cell_index = row * width + col
```

例如 `4x4`：

```text
0  1  2  3
4  5  6  7
8  9  10 11
12 13 14 15
```

---

# 3. Record 定义

## 3.1 记录类型总览

为了让最常见的 MOVE 最省，约定：

* **首字节 `< 0x80`**：一定是 `MOVE`
* **首字节 `>= 0x80`**：控制记录

定义如下：

```text
0x00..0x7F : MOVE
0x80       : UNDO1
0x81       : UNDON
0x82       : CHECKPOINT
0x83       : EXT            // 预留给以后特殊玩法
0x84       : END            // 可选，不写也行
0x85..0xFF : reserved
```

---

## 3.2 MOVE

这是最常见的一条记录。

### 编码

```text
byte0:
  bit0..1 : dir         // 0=Up, 1=Right, 2=Down, 3=Left
  bit2..5 : spawn_index // 0..15
  bit6    : spawn_value // 0=2, 1=4
  bit7    : 0           // MOVE 标志

after byte0:
  delta_ms : ULEB128
```

### 含义

这条记录表示：

1. 玩家做了一次**有效移动**
2. 方向为 `dir`
3. 结算后新砖生成在 `spawn_index`
4. 新砖是 `2` 或 `4`
5. 这一步距离上一条“已保留记录”的结算时间差为 `delta_ms`

---

## 3.3 时间语义：`delta_ms`

这里我建议不要存“按键开始/按键结束”这种不稳定概念，而统一存：

**相邻两条已记录事件的结算时间差**

也就是：

* 上一条事件结算完的时刻
* 到当前条事件结算完的时刻
* 之间过去了多少毫秒

这样最稳，也最好压缩。

如果文件头有 `start_unix_ms`，就能还原每步的起止时刻：

```text
step0.start = start_unix_ms
step0.end   = start_unix_ms + delta_ms[0]

stepN.start = step(N-1).end
stepN.end   = stepN.start + delta_ms[N]
```

所以虽然文件里只存一个 `delta_ms`，但**起止时间都能还原**。

---

## 3.4 UNDO1

如果你要保存“完整会话”，而不是只保存最后生效路线，就需要 UNDO。

单步撤回：

```text
0x80
delta_ms : ULEB128
```

表示：

* 距离上一条记录过去了 `delta_ms`
* 用户执行了一次撤回 1 步

---

## 3.5 UNDON

多步撤回：

```text
0x81
undo_count : ULEB128
delta_ms   : ULEB128
```

表示撤回 `undo_count` 步。

如果你游戏里永远只允许单步撤回，其实 `UNDO1` 就够了。

---

## 3.6 CHECKPOINT

这个不是必须，但我建议支持。

作用：

* 快进更快
* 校验更方便
* 文件损坏时更容易定位
* 将来做跨版本兼容更稳

格式：

```text
0x82
packed_board : ceil(width * height * 5 / 8) bytes
```

因为：

* 每格用 5 bit
* `4x4` 一共 16 格 → `16*5=80 bit=10 bytes`
* `3x4` 一共 12 格 → `12*5=60 bit=8 bytes`

### 5 bit 棋盘编码

每格编码为：

```text
0  = empty
1  = 2
2  = 4
3  = 8
...
31 = 2^31
```

也就是直接存 **指数**。

这比“字符盘面”更紧凑，也比 `0~65536` 的文本写法更稳定。

---

## 3.7 EXT

给以后特殊玩法留后门，避免将来推翻整个协议。

```text
0x83
ext_type : ULEB128
ext_len  : ULEB128
payload  : bytes[ext_len]
```

当前普通 `4x4/3x4` 不用它。

将来如果某个模式有：

* 特殊砖
* 额外随机事件
* 技能
* 障碍物
* 旋转棋盘

都可以往 `EXT` 里挂，不影响老解析器识别普通记录。

---

# 4. 为什么这比“每步存整盘”更小

对普通 `4x4/3x4`：

## 每步整盘快照

* `4x4`：每步 `10 bytes`
* `3x4`：每步 `8 bytes`

还没算时间。

## 这版 MOVE

每步：

* 方向 + 出生位置 + 出生值：**1 byte**
* `delta_ms`：通常 **1~2 byte**

  * 几百毫秒到几秒，ULEB128 一般 2 byte 很常见

所以平均下来：

* **大约 2~3 byte / 有效步**

比每步存盘面仍然小很多。

---

# 5. 撤回模式怎么处理最合适

这里建议你明确做两个导出模式。

---

## 5.1 分享模式（最小）

只保留**最后真正生效的路线**。

特点：

* 不写 `UNDO`
* 被撤回的 move 直接从导出结果中删除
* 文件最小
* 最适合分享和排行榜存档

### 时间怎么处理

如果中间有一段被撤回的尝试，你把那段删掉以后，**这些时间不能凭空消失**。

做法是：

**把被撤回分支消耗的时间，折叠到下一条仍然保留的 MOVE 上。**

例子：

```text
A(500ms), B(800ms), UNDO(300ms), C(700ms)
```

最终分享文件只保留：

```text
A(500ms), C(1800ms)
```

因为从 A 结算完到 C 结算完，真实过了：

```text
800 + 300 + 700 = 1800ms
```

这样分享文件虽然不展示撤回过程，但时间线仍然是真实的。

---

## 5.2 完整会话模式

保留：

* MOVE
* UNDO

特点：

* 可以完整复现玩家的真实操作过程
* 文件略大
* 更适合本地分析或“教学/复盘”

---

# 6. 导出压缩逻辑

## 6.1 普通模式（无 undo）

直接按有效步写 MOVE。

---

## 6.2 有 undo，但导出为分享模式

用一个栈压缩：

### 伪代码

```text
out = []
carry_ms = 0

for event in session_events:
    if event.type == MOVE:
        out.push(MOVE(
            dir=event.dir,
            spawn_index=event.spawn_index,
            spawn_value=event.spawn_value,
            delta_ms=event.delta_ms + carry_ms
        ))
        carry_ms = 0

    elif event.type == UNDO:
        carry_ms += event.delta_ms
        repeat event.undo_count times:
            removed = out.pop()
            carry_ms += removed.delta_ms
```

意思就是：

* 撤回掉的 move 本身，也贡献了时间
* 执行撤回动作本身，也贡献了时间
* 这些时间最后并入下一条仍保留的 move

这样导出出来的分享文件最小，而且时间仍然连贯。

---

# 7. 编码/解码伪代码

## 7.1 写 MOVE

```text
byte0 = 0
byte0 |= dir
byte0 |= (spawn_index << 2)
byte0 |= (spawn_value << 6)

write_u8(byte0)
write_uleb128(delta_ms)
```

---

## 7.2 读 MOVE

```text
b0 = read_u8()

if b0 < 0x80:
    dir         =  b0        & 0b00000011
    spawn_index = (b0 >> 2)  & 0b00001111
    spawn_value = (b0 >> 6)  & 0b00000001
    delta_ms    = read_uleb128()
```

---

## 7.3 写 CHECKPOINT

```text
write_u8(0x82)

for cell in board_in_row_major:
    code = exponent(cell)   // empty=0, 2=1, 4=2 ...
    write_5bits(code)
flush_bitstream_to_bytes()
```

---

# 8. 一个具体例子

假设：

* 棋盘 `4x4`
* 一步操作是 `Right`
* 新砖生成在 `cell 6`
* 新砖是 `4`
* 这一步和上一结算点相差 `834ms`

约定方向：

```text
0=Up, 1=Right, 2=Down, 3=Left
```

那么：

* `dir = 1`
* `spawn_index = 6`
* `spawn_value = 1`

首字节：

```text
byte0 = dir | (spawn_index << 2) | (spawn_value << 6)
      = 1   | (6 << 2)           | (1 << 6)
      = 1   | 24                 | 64
      = 89
      = 0x59
```

`834` 的 ULEB128 是：

```text
0xC2 0x06
```

所以这一步记录就是：

```text
59 C2 06
```

也就是 **3 字节**。

---

# 9. `.rlog` 运行时日志建议

如果你还要解决“程序崩溃时不丢已经完成的有效步”，建议运行中不要直接写最终 `.rpl`，而是先写 `.rlog`。

## 9.1 `.rlog` 结构

可以复用同样的 header，然后每条记录包一层：

```text
[len : ULEB128]
[record bytes]
[crc32_le of record bytes]
```

### 写入流程

每当一条有效 MOVE 或 UNDO 已经**逻辑结算完成**时：

1. 生成 record
2. 写 `len`
3. 写 `record`
4. 写 `crc32`
5. flush
6. 严格要求不丢的话再 `fsync`

### 恢复

启动时顺序扫描：

* 校验通过 → 接受
* 遇到半条或 CRC 错 → 直接截断后面的尾巴

这样就能最大程度保证“已完成的步不丢”。

---

# 10. 这版协议的实际建议

如果是你这个项目，我会直接这样落地：

## 对外分享文件

用 `.rpl`

* 不存 seed
* 不存每步整盘
* 只存最终生效的有效步
* 有撤回就折叠
* 可选存 `start_unix_ms`
* 每 128 或 256 步插一个 checkpoint

## 运行时

用 `.rlog`

* append-only
* 每步结算后写一条
* 严格模式下 `fsync`

---

# 11. 最后一版推荐字段汇总

```text
RPL1:
  magic[4] = "RPL1"
  dims     = (w & 0x0F) | ((h & 0x0F) << 4)
  flags
  init_count
  [start_unix_ms : ULEB128]
  init_tiles[init_count]   // 1 byte each
  records...
  crc32_le
```

```text
MOVE:
  byte0:
    bit0..1 dir
    bit2..5 spawn_index
    bit6    spawn_value
    bit7    0
  delta_ms : ULEB128
```

```text
UNDO1:
  0x80
  delta_ms : ULEB128
```

```text
UNDON:
  0x81
  undo_count : ULEB128
  delta_ms   : ULEB128
```

```text
CHECKPOINT:
  0x82
  packed_board : ceil(w*h*5/8) bytes
```

```text
EXT:
  0x83
  ext_type : ULEB128
  ext_len  : ULEB128
  payload
```

---

这版已经够你先把：

* 普通 `4x4`
* 可撤回 `4x4`
* `3x4`

全部做出来了，而且以后要加其他模式也不用推翻重来。

下一步最实用的是，我直接把这份协议写成一套 **C# 结构体 + 读写伪代码 / TypeScript 读写代码骨架**。
