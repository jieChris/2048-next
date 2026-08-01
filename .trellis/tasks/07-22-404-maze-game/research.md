# 404 迷宫开源参考

## 参考项目

1. [codebox/mazes](https://github.com/codebox/mazes)（MIT）
   - 借鉴“完美迷宫”约束：任意两点间恰好一条路径。
   - 借鉴距离图与不同算法产生不同走廊特征的分析方式，用于校验 19 套地图的结构差异。
2. [keesiemeijer/maze-generator](https://github.com/keesiemeijer/maze-generator)（MIT）
   - 借鉴递归回溯产生长走廊、深支路和明显回撤代价的结构特征。
3. [thejoshwolfe/maze-generator](https://github.com/thejoshwolfe/maze-generator)（MIT）
   - 借鉴最长路径选点、无环迷宫和逐层消去死胡同的分析方法。

## 使用边界

- 不复制任何现成地图、源码或视觉资产。
- 只将上述项目作为结构设计与自动校验方法的参考；本项目保留自己的字符地图、渲染和移动规则。
