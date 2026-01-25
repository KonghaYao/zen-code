1. Design Mode

    1. Spark List(灵感/想法、BUG Report)
    2. Plan mode
        1. Brain Storm
        2. Production Drawing
        3. BUG Analyze
        4. Spec Writing
            1. Task Review
            2. /.claude/plan/xxx.md
    3. Package all documents

2. Task KanBan
    1. Task Pickup
    2. Task Running
    3. Task Complete
    4. Task Error

---

1. Plan 模式
    1. 输出 plan 文件
    2. 输出 task.json
2. 任务状态机
    1. 解析为子任务树
    2. 子任务树可以声明为并行或者串行执行
    3. 然后任务树中的每个节点为串行执行
    4. 每个子任务树交给单独的 agent 进行操作
3. 子 agent 运行时
    1. 子 agent 接收 plan 文件，整个任务树
    2. 表明它是子 agent，现在进行的任务是什么
    3. 完成任务之后，执行任务提交工具
    4. 任务提交工具格式化 任务信息，任务是否成功
    5. 工具去改写 task.json
