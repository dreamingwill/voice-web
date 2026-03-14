import copy
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"

NS = {"a": A_NS, "p": P_NS, "r": R_NS}

ET.register_namespace("a", A_NS)
ET.register_namespace("p", P_NS)
ET.register_namespace("r", R_NS)


def qn(ns: str, tag: str) -> str:
    return f"{{{ns}}}{tag}"


def extract_slide_number(name: str) -> int:
    stem = Path(name).name
    if stem.startswith("slide") and stem.endswith(".xml.rels"):
        return int(stem[len("slide") : -len(".xml.rels")])
    if stem.startswith("slide") and stem.endswith(".xml"):
        return int(stem[len("slide") : -len(".xml")])
    raise ValueError(f"unsupported slide name: {name}")


SLIDES = [
    {
        "number": 1,
        "template": 1,
        "title": "封面",
        "screenshot": "无需截图。保留封面背景即可。",
        "texts": [
            "语音识别设备操作与使用培训",
            "培训对象：系统操作员与后台管理员",
            "培训日期：2026.3.14",
        ],
    },
    {
        "number": 2,
        "template": 2,
        "title": "培训目标",
        "screenshot": "无需截图。建议保留原目标页的视觉样式。",
        "texts": [
            "培训目标",
            "| ",
            "GOAL",
            "3",
            "会判断转写、说话人、指令命中与转发状态",
            "4",
            "会处理常见故障并完成日常维护",
            "2",
            "掌握开机、采集、停止、查询日志的标准流程",
            "1",
            "了解系统页面、功能入口和角色分工",
        ],
    },
    {
        "number": 3,
        "template": 3,
        "title": "目录",
        "screenshot": "无需截图。作为全篇目录页。",
        "texts": [
            "1",
            "系统与角色",
            "2",
            "目录 ",
            "| CONTENT",
            "3",
            "主页与实时功能",
            "4",
            "5",
            "后台页面与管理员功能",
            "状态说明与问题处理",
            "6",
            "培训总结",
            "操作流程与日志",
        ],
    },
    {
        "number": 4,
        "template": 4,
        "title": "系统概述",
        "screenshot": "放设备整体照片，最好同时能看到屏幕、主板和麦克风。",
        "texts": [
            "1 ",
            "系统概述",
            "",
            "本系统用于",
            "采集现场语音",
            "、",
            "实时转写文字",
            "、",
            "识别当前主说话人",
            "、",
            "判断是否命中预设指令",
            "。操作员日常重点关注“能否采集、文字是否正常、说话人是否正确、指令是否发送成功”四项结果。",
            "设备与系统示意",
        ],
    },
    {
        "number": 5,
        "template": 6,
        "title": "硬件组成",
        "screenshot": "放硬件近景图，标出麦克风阵列、RK3588 主板、屏幕、电源与网络线。",
        "texts": [
            "2 ",
            "系统与硬件",
            "麦克风：",
            "ReSpeaker",
            "麦克风阵列，用于采集现场语音",
            "主板：香橙派",
            "芯片：瑞芯微",
            "RK3588",
            "屏幕：触摸屏，用于本地查看页面与操作",
            "设备外观示意",
            "操作前先检查：电源、麦克风、屏幕、网络",
        ],
    },
    {
        "number": 6,
        "template": 8,
        "title": "角色与使用范围",
        "screenshot": "放主页和顶部导航截图，体现游客入口与登录后菜单差异。",
        "texts": [
            "2 ",
            "角色与使用范围",
            "系统当前包含公开主页和后台管理两类入口。普通操作员主要使用",
            "主页采集",
            "、",
            "实时转写",
            "、",
            "指令结果查看",
            "、",
            "日志查询",
            "；管理员除上述功能外，还可维护",
            "操作员资料",
            "、",
            "岗位权限",
            "、",
            "指令库",
            "和",
            "日志中心",
            "。",
        ],
    },
    {
        "number": 7,
        "template": 17,
        "title": "页面导航总览",
        "screenshot": "放顶部导航栏完整截图，显示“实时监控、指令管理、操作员管理、岗位管理、日志中心、退出登录”。",
        "texts": [
            "2 ",
            "页面导航总览",
            "",
            "顶部导航说明",
            "登录后，页面顶部会显示系统名称、功能菜单、当前登录名和退出按钮。",
            "导航入口",
            "实时监控",
            "主页，进行开始采集、停止采集、查看实时转写、说话人和指令结果。",
            "后台页面",
            "指令管理、操作员管理、岗位管理、日志中心均需登录后进入。",
            "登录区",
            "右上角会显示当前账号名称；未登录时只显示“管理员登录”入口。",
            "操作建议",
            "普通操作员通常只需要主页和日志中心；维护类页面由管理员使用。",
            "截图建议",
            "截一张登录后的完整导航栏，作为后续页面介绍的总索引。",
        ],
    },
    {
        "number": 8,
        "template": 17,
        "title": "主页总览",
        "screenshot": "放主页完整截图，包含左侧实时转写区、右侧指令识别卡片、右边缘测试面板按钮。",
        "texts": [
            "3 ",
            "主页总览",
            "",
            "主页结构",
            "主页是操作员最常使用的页面，核心区域包括实时转写区、顶部控制区和右侧指令识别卡片。",
            "左侧主区域",
            "显示开始/停止采集按钮、说话人识别开关、保存录音开关、音频增强设置和实时转写列表。",
            "右侧卡片",
            "显示指令识别开关、转发目标在线状态、最新命中指令、匹配分数和转发结果。",
            "右边缘按钮",
            "登录后可打开“测试面板”，查看 WebSocket RTT 当前值、平均值、P95 和样本数。",
            "培训重点",
            "主页既是操作入口，也是状态判断入口，培训时应优先展示此页的完整结构。",
            "截图建议",
            "保留完整页面，不要裁掉右侧卡片和右边缘测试面板按钮。",
        ],
    },
    {
        "number": 9,
        "template": 9,
        "title": "登录页面",
        "screenshot": "放登录页截图，显示用户名、密码框、登录按钮和默认提示。",
        "texts": [
            "3.1 ",
            "登录页面",
            "后台功能入口",
            "登录页用于进入管理员后台。",
            "输入用户名和密码后点击“登录”，成功后会跳转到控制台主页；未登录时普通用户仍可直接打开主页，但看不到后台菜单。",
        ],
    },
    {
        "number": 10,
        "template": 17,
        "title": "主页顶部控制区",
        "screenshot": "放主页上半部分截图，覆盖“说话人识别、保存录音、清空、开始采集、停止采集、当前状态”。",
        "texts": [
            "3.2 ",
            "主页顶部控制区",
            "",
            "控制区作用",
            "主页顶部是最常操作的区域，开始采集前需要先确认这里的开关和按钮状态。",
            "开始采集/停止采集",
            "点击开始后，按钮会切换为“停止采集”；再次点击则结束本次会话。",
            "说话人识别",
            "决定当前会话是否尝试识别主说话人；采集中不能修改。",
            "保存录音",
            "决定本次会话是否保存音频文件；采集中不能修改。",
            "清空按钮",
            "用于清除当前页面已显示的转写内容，不会删除后台已保存的历史记录。",
            "截图建议",
            "截图时让按钮处于未采集状态，便于同时展示全部开关。",
        ],
    },
    {
        "number": 11,
        "template": 17,
        "title": "开始采集与停止采集",
        "screenshot": "放两张对比截图：一张未采集状态，一张采集中状态；至少能看出按钮文字变化。",
        "texts": [
            "3.3 ",
            "开始采集与停止采集",
            "",
            "开始采集前",
            "先检查麦克风、网络、说话人识别开关、保存录音开关和音频增强配置是否已设置正确。",
            "点击开始采集",
            "系统会请求麦克风权限并建立实时会话；成功后页面会提示“音频采集已开始”。",
            "采集中表现",
            "状态文本会显示“采集中”或“麦克风静音中”，实时转写列表开始接收语音文本。",
            "点击停止采集",
            "本次会话结束，必要时可立即进入日志中心查询该次会话记录。",
            "异常提示",
            "若无法开始采集，通常会提示麦克风权限问题、设备连接问题或麦克风启动失败。",
            "截图建议",
            "做一页双图对比：左图未采集，右图采集中，帮助操作员理解状态切换。",
        ],
    },
    {
        "number": 12,
        "template": 17,
        "title": "静音、清空与当前状态",
        "screenshot": "放登录状态下采集中的主页截图，能看到“静音/取消静音”按钮和当前状态文本。",
        "texts": [
            "3.4 ",
            "静音、清空与当前状态",
            "",
            "静音按钮",
            "登录后在采集中可使用“静音/取消静音”，用于临时停止上传麦克风内容而不结束会话。",
            "清空按钮",
            "用于清空当前页面上的转写显示，适合开始新一轮演示前使用。",
            "当前状态文本",
            "常见状态包括“麦克风已停止”“采集中”“麦克风静音中”，可快速判断当前会话状态。",
            "访客与登录差异",
            "未登录用户只会看到开始/停止采集，不显示静音按钮和部分后台功能。",
            "培训提醒",
            "静音不是停止采集；若要结束会话并保存日志，应点击“停止采集”。",
            "截图建议",
            "采集中截图最合适，可同时看到静音按钮和状态文本。",
        ],
    },
    {
        "number": 13,
        "template": 9,
        "title": "说话人识别开关",
        "screenshot": "放“说话人识别”开关及其提示气泡截图，最好包含“采集中无法修改”的提示。",
        "texts": [
            "3.5 ",
            "说话人识别开关",
            "功能说明",
            "开启后，系统会尝试识别当前主说话人。",
            "若讲话人已完成声纹登记，页面通常会显示对应姓名或岗位；采集中该开关会被禁用，需停止采集后才能修改。",
        ],
    },
    {
        "number": 14,
        "template": 9,
        "title": "保存录音开关",
        "screenshot": "放“保存录音”开关截图，最好在日志页再补一张能看到录音文件名的截图。",
        "texts": [
            "3.6 ",
            "保存录音开关",
            "功能说明",
            "开启后，本次会话音频会保存为文件。",
            "从点击“开始采集”到点击“停止采集”之间的音频会被保存；采集中不能切换此开关，因此应在会话开始前决定是否保存。",
        ],
    },
    {
        "number": 15,
        "template": 17,
        "title": "音频增强设置",
        "screenshot": "放“音频增强”区域截图，显示多个降噪模式和“推荐”标签。",
        "texts": [
            "3.7 ",
            "音频增强设置",
            "",
            "音频增强区域",
            "登录后主页会出现“音频增强”配置区，用于选择不同降噪模式。",
            "切换时机",
            "只能在未采集状态修改；采集中该区域会提示“采集中不可修改”。",
            "页面反馈",
            "页面会显示当前会话返回的增强信息，例如模式名称、强度和是否启用 Dereverb。",
            "推荐使用",
            "如果现场环境较安静，可以先保持默认推荐配置；环境复杂时再尝试切换模式。",
            "注意事项",
            "不要在采集中反复调整增强模式，否则当前会话设置不会立即生效。",
            "截图建议",
            "截图时同时保留模式选项和顶部状态说明，方便培训时解释。",
        ],
    },
    {
        "number": 16,
        "template": 17,
        "title": "实时转写区怎么读",
        "screenshot": "放已有多条转写记录的主页截图，需能看到说话人、时间、文本、命中指令标记。",
        "texts": [
            "3.8 ",
            "实时转写区怎么读",
            "",
            "转写列表作用",
            "每次识别到有效语音后，主页会新增一条转写记录，最新记录显示在列表顶部。",
            "每条记录包含",
            "说话人名称或“未知说话人”、时间戳、转写文本，以及是否命中指令的标记。",
            "文字颜色差异",
            "未完成识别的内容通常以浅色/斜体显示，完成后的文本会以正常颜色显示。",
            "暂无转写数据",
            "表示当前还没有收到任何有效语音，不一定是故障，也可能只是暂未讲话。",
            "培训提醒",
            "操作员应先看文本是否合理，再看右侧指令卡片和说话人结果是否一致。",
            "截图建议",
            "选择一张同时包含普通文本和命中指令文本的截图最有代表性。",
        ],
    },
    {
        "number": 17,
        "template": 17,
        "title": "指令识别卡片",
        "screenshot": "放右侧指令识别卡片截图，显示识别开关、转发目标在线状态、阈值、最新命中指令。",
        "texts": [
            "3.9 ",
            "指令识别卡片",
            "",
            "卡片位置",
            "主页右侧显示“指令识别”卡片，用于观察系统是否开启指令匹配和转发。",
            "核心信息",
            "卡片会显示已配置指令数量、识别开关、阈值、转发目标在线状态和最新命中记录。",
            "最新命中记录",
            "包括命令名称、命令编号、命中时间、匹配分数以及转发状态。",
            "常见状态",
            "“已转发”表示发送成功；“发送失败”常见原因是目标端离线或转发接口异常；“已阻止”通常和未知说话人有关。",
            "培训提醒",
            "若指令未开启，所有转写只会作为普通语句显示，不会触发命令结果。",
            "截图建议",
            "尽量截取一张已经命中指令的页面，便于解释完整字段含义。",
        ],
    },
    {
        "number": 18,
        "template": 17,
        "title": "告警横幅与测试面板入口",
        "screenshot": "放主页顶部告警横幅截图，以及右边缘“测试面板”按钮截图。",
        "texts": [
            "3.10 ",
            "告警横幅与测试面板入口",
            "",
            "未授权操作告警",
            "当系统检测到未授权操作事件时，主页顶部会出现红色告警横幅，提示操作员及时复核。",
            "横幅信息",
            "会显示事件类型、人员名称和发生时间，并提供“已知晓”按钮用于确认。",
            "测试面板入口",
            "登录后主页右侧会出现悬浮按钮“测试面板”，点击后从右侧抽屉展开。",
            "使用边界",
            "告警横幅属于运行提示，测试面板属于检查网络往返延迟的辅助工具。",
            "培训提醒",
            "普通操作员知道入口和含义即可；深入调试由管理员或技术人员处理。",
            "截图建议",
            "如果现场难以复现告警，可截图测试环境或说明示意图。",
        ],
    },
    {
        "number": 19,
        "template": 17,
        "title": "测试面板怎么用",
        "screenshot": "放测试面板抽屉截图，必须能看到当前值、平均值、P95、样本数和判定结果。",
        "texts": [
            "3.11 ",
            "测试面板怎么用",
            "",
            "面板作用",
            "测试面板用于查看当前会话的 WebSocket 网络往返延迟（RTT），帮助判断链路是否稳定。",
            "主要字段",
            "包含当前值、平均值、P95、样本数和判定结果；判定规则为样本数不少于 20 且 P95 小于等于 100ms。",
            "样本不足",
            "表示会话刚开始或采样时间不够，并不代表故障；继续采集即可获得更多样本。",
            "清空样本",
            "点击“清空样本”可重新开始统计，适合重新进行一次测试时使用。",
            "培训提醒",
            "这个面板主要用于检查网络质量，不用于判断识别文本是否正确。",
            "截图建议",
            "尽量截一张已有足够样本的面板，便于说明“通过/不通过”的判定逻辑。",
        ],
    },
    {
        "number": 20,
        "template": 21,
        "title": "主页状态说明",
        "screenshot": "放一张整理后的状态说明表截图，或配合主页局部截图做讲解。",
        "texts": [
            "4 ",
            "主页状态说明",
            "“暂无转写数据”表示当前还没有收到有效语音，通常是未讲话、讲话过短或环境过于安静。",
            "（",
            "2",
            "）“未知说话人”表示当前没有匹配到已登记声纹，可能是未登记、讲话过短或噪声较大",
            "（",
            "3",
            "）“发送失败”通常是转发目标不可达或转发接口异常，不等于语音识别失败",
            "（",
            "4",
            "）“样本不足”只代表 RTT 统计样本不够，不表示网络一定异常",
            "1",
            "）“麦克风已停止/采集中/麦克风静音中”用于判断当前会话状态",
            "2",
            "）“已转发/已阻止/失败”用于判断命令处理结果",
            "3",
            "）培训时建议把这些状态逐条讲解，避免操作员误判",
        ],
    },
    {
        "number": 21,
        "template": 17,
        "title": "标准操作流程",
        "screenshot": "放一张流程图，或用 4 张连续截图拼图：进入主页、开始采集、讲话、停止采集。",
        "texts": [
            "4 ",
            "标准操作流程",
            "",
            "步骤 1",
            "开机后先检查电源、麦克风、屏幕、网络是否正常，再进入系统主页。",
            "步骤 2",
            "确认说话人识别、保存录音和音频增强是否已按当前任务需要设置。",
            "步骤 3",
            "点击“开始采集”，对着麦克风正常讲话，观察实时转写、主说话人和指令结果。",
            "步骤 4",
            "结束后点击“停止采集”，如需复核可到日志中心查询本次会话记录。",
            "关键提醒",
            "采集中不要切换音频增强和保存录音开关；若需修改，先停止采集。",
            "截图建议",
            "本页最适合使用四宫格流程截图，讲解时逐步点读。",
        ],
    },
    {
        "number": 22,
        "template": 17,
        "title": "异常处理流程",
        "screenshot": "放一张异常流程图，或两张示例截图：未知说话人、转发失败。",
        "texts": [
            "4 ",
            "异常处理流程",
            "",
            "情况 1：无法开始采集",
            "先检查浏览器麦克风权限、设备连接和网络，再重新尝试开始采集。",
            "情况 2：没有转写文字",
            "检查是否真的有讲话、麦克风是否正常、会话是否已开始、是否处于静音状态。",
            "情况 3：一直未知说话人",
            "确认该人员是否已登记声纹，讲话时长是否足够，现场噪声是否过大。",
            "情况 4：指令失败或未命中",
            "先看文字识别是否正确，再看转发目标是否在线；必要时将会话记录反馈管理员。",
            "上报建议",
            "遇到无法自行处理的问题，建议记录时间、页面现象和会话信息后再上报。",
            "截图建议",
            "可用两张典型异常截图配合文字说明：未知说话人、转发失败。",
        ],
    },
    {
        "number": 23,
        "template": 17,
        "title": "日志中心总览",
        "screenshot": "放日志中心首页截图，包含页头、两个 Tab、筛选区、表格和导出按钮。",
        "texts": [
            "5 ",
            "日志中心总览",
            "",
            "页面作用",
            "日志中心用于查询后台操作事件和历史说话记录，并支持导出 CSV。",
            "两个标签页",
            "“操作事件”用于看账号、岗位、声纹等后台变更；“历史说话记录”用于看每次会话的识别结果。",
            "常用场景",
            "操作员多使用“历史说话记录”核对本次识别；管理员同时会使用“操作事件”查看后台变更。",
            "导出功能",
            "两个标签页都支持导出当前筛选结果，便于留档和后续分析。",
            "培训提醒",
            "主页展示的是实时结果，日志中心展示的是历史记录，二者要配合使用。",
            "截图建议",
            "优先保留两个 Tab 和右上角导出按钮，便于说明结构。",
        ],
    },
    {
        "number": 24,
        "template": 17,
        "title": "操作事件页",
        "screenshot": "放“操作事件”Tab 截图，显示筛选条件、类别字段、操作者、关联对象、摘要。",
        "texts": [
            "5 ",
            "操作事件页",
            "",
            "查询内容",
            "该页主要记录创建、更新、删除、切换状态、声纹聚合等后台管理行为。",
            "筛选方式",
            "可按操作类别筛选，也可输入用户名或 ID 查询某个对象相关事件。",
            "表格字段",
            "常见字段包括时间、类别、操作者、关联对象和摘要。",
            "适用人员",
            "主要由管理员使用；普通操作员只需知道如发生配置变更，可在此页追溯。",
            "导出用途",
            "导出 CSV 后可留档或用于验收、排障、追溯分析。",
            "截图建议",
            "选一张有真实数据的截图，能清晰看到类别和摘要最有帮助。",
        ],
    },
    {
        "number": 25,
        "template": 17,
        "title": "历史说话记录页",
        "screenshot": "放“历史说话记录”Tab 截图，显示筛选区、会话标识、文本内容、录音文件、转发结果。",
        "texts": [
            "5 ",
            "历史说话记录页",
            "",
            "查询内容",
            "该页用于查看每次语音会话的识别结果，是操作员最常用的日志页面。",
            "筛选条件",
            "可按会话 ID、主说话人和全文关键字进行查询，便于快速定位某次会话。",
            "表格字段",
            "可查看时间、会话标识、文本内容、段数、时长、相似度、状态、录音文件和转发结果。",
            "常用核对项",
            "重点核对文本是否正确、主说话人是否正确、是否有录音文件、命令是否已转发。",
            "导出用途",
            "导出后可作为培训记录、现场留档或问题复盘材料。",
            "截图建议",
            "最好选择一条已保存录音且有转发结果的记录，更能说明字段意义。",
        ],
    },
    {
        "number": 26,
        "template": 17,
        "title": "日志导出与查询示例",
        "screenshot": "放日志页导出按钮、筛选条件应用前后对比截图，或拼图展示。",
        "texts": [
            "5 ",
            "日志导出与查询示例",
            "",
            "示例 1：按会话查询",
            "在历史说话记录页输入会话 ID，可快速定位某次会话的完整识别结果。",
            "示例 2：按关键字查询",
            "输入全文关键字，可查找某段指令文本是否曾被识别或转发。",
            "示例 3：导出 CSV",
            "点击右上角“导出 CSV”，即可把当前筛选结果导出到本地文件。",
            "使用建议",
            "培训时至少演示一次查询和一次导出，让操作员知道历史记录如何留档。",
            "边界说明",
            "导出的是当前筛选结果，不是全部历史数据；筛选条件会影响导出内容。",
            "截图建议",
            "做一张“筛选前/筛选后/导出成功”的三联图最直观。",
        ],
    },
    {
        "number": 27,
        "template": 17,
        "title": "操作员管理页总览",
        "screenshot": "放操作员管理页完整截图，显示查询区、表格、分页和“新增操作员”按钮。",
        "texts": [
            "6 ",
            "操作员管理页总览",
            "",
            "页面作用",
            "该页用于维护操作员账号、状态、岗位和声纹登记情况，属于管理员页面。",
            "列表信息",
            "可查看姓名、岗位、状态、声纹状态，并支持分页浏览。",
            "筛选方式",
            "支持按用户名模糊搜索，也可按岗位筛选。",
            "常用操作",
            "新增、编辑、删除、启用/禁用、进入声纹登记弹窗。",
            "操作员边界",
            "普通操作员只需知道自己的账号和声纹是否已登记，不负责维护此页数据。",
            "截图建议",
            "保留“已登记/未登记”声纹状态列，培训时非常实用。",
        ],
    },
    {
        "number": 28,
        "template": 17,
        "title": "新增、编辑、启停操作员",
        "screenshot": "放新增/编辑弹窗截图，以及列表中的启用/禁用按钮截图。",
        "texts": [
            "6 ",
            "新增、编辑、启停操作员",
            "",
            "新增操作员",
            "点击“新增操作员”后填写账号、用户名、角色、手机号和岗位信息，再点击保存。",
            "编辑操作员",
            "列表中点击“编辑”可修改该操作员的资料和岗位。",
            "启用/禁用",
            "点击“禁用/启用”可快速控制该操作员是否可用。",
            "删除操作员",
            "删除前系统会弹出确认框，避免误操作。",
            "培训提醒",
            "这部分主要面向管理员；对普通操作员可简要说明，不必展开讲数据库概念。",
            "截图建议",
            "建议做一页双图：左侧表格操作，右侧编辑弹窗。",
        ],
    },
    {
        "number": 29,
        "template": 17,
        "title": "声纹登记弹窗",
        "screenshot": "放声纹登记弹窗截图，显示朗读文本、现场录制/上传文件切换、样本进度、上传声纹按钮。",
        "texts": [
            "6 ",
            "声纹登记弹窗",
            "",
            "进入方式",
            "在操作员管理页点击“声纹登记”，会打开声纹登记弹窗。",
            "两种方式",
            "支持现场录制和上传文件两种模式；当前系统要求单个样本时长在 15 到 30 秒之间。",
            "现场录制",
            "点击开始录制前会有倒计时，录制过程中会显示进度条和已录制秒数。",
            "上传文件",
            "支持 wav、mp3、m4a、aac、ogg、webm 等格式，单个文件不超过 10MB。",
            "完成上传",
            "样本校验通过后点击“上传声纹”，系统会把样本聚合为该操作员的声纹数据。",
            "截图建议",
            "建议截取“现场录制”和“已生成样本波形”状态，最能体现功能。",
        ],
    },
    {
        "number": 30,
        "template": 17,
        "title": "岗位管理页",
        "screenshot": "放岗位管理页截图，显示岗位名称、L1-L8 等级、描述和新增/编辑弹窗。",
        "texts": [
            "6 ",
            "岗位管理页",
            "",
            "页面作用",
            "岗位管理用于维护岗位名称、权限等级和描述，是 8 级权限管理的配置入口。",
            "列表字段",
            "可查看岗位名称、权限等级（L1-L8）和岗位描述。",
            "新增/编辑",
            "点击新增或编辑后，在弹窗中填写岗位名称、等级和描述。",
            "删除影响",
            "删除岗位时会提示相关操作员的岗位信息将被清除。",
            "培训边界",
            "普通操作员只需知道自己属于哪个岗位，不需要理解后台权限实现细节。",
            "截图建议",
            "选择一张能看出多个等级颜色差异的截图，便于解释 L1-L8。",
        ],
    },
    {
        "number": 31,
        "template": 17,
        "title": "指令管理页总览",
        "screenshot": "放指令管理页完整截图，显示搜索区、表格、分页、批量上传按钮。",
        "texts": [
            "6 ",
            "指令管理页总览",
            "",
            "页面作用",
            "指令管理页用于维护可识别指令、搜索指令、启停指令、手动发送指令。",
            "表格字段",
            "可查看指令编号、指令内容、创建时间和当前状态。",
            "搜索方式",
            "支持按关键词搜索，也支持按指令编号搜索。",
            "常用操作",
            "编辑、删除、启用/禁用、发送、批量上传。",
            "与主页关系",
            "主页右侧显示的是识别结果；这里负责维护识别所用的指令库。",
            "截图建议",
            "保留搜索栏、批量上传按钮和表格操作列，方便说明完整能力。",
        ],
    },
    {
        "number": 32,
        "template": 17,
        "title": "指令搜索、编辑与批量上传",
        "screenshot": "放三张拼图：搜索结果、编辑弹窗、批量上传弹窗。",
        "texts": [
            "6 ",
            "指令搜索、编辑与批量上传",
            "",
            "搜索",
            "在搜索框输入关键词或编号后点击查询，可快速缩小指令范围。",
            "编辑",
            "点击“编辑”可修改指令内容和编号，保存后列表会刷新。",
            "批量上传",
            "点击“批量上传指令”可一次粘贴多条指令，支持“编号,内容”或仅内容的格式。",
            "上传规则",
            "每行一条，上传成功后系统会刷新识别缓存，使新指令生效。",
            "培训提醒",
            "若识别结果长期无法命中，可先确认这里是否已存在对应指令。",
            "截图建议",
            "最适合使用三联图：搜索、编辑、批量上传。",
        ],
    },
    {
        "number": 33,
        "template": 17,
        "title": "手动发送指令",
        "screenshot": "放“发送指令”弹窗截图，显示项目编号、操作员账号、操作员姓名字段。",
        "texts": [
            "6 ",
            "手动发送指令",
            "",
            "入口位置",
            "在指令管理页每条指令右侧点击“发送”，会打开手动发送弹窗。",
            "必填信息",
            "项目编号、操作员账号、操作员姓名均需填写；项目编号默认可带出当前指令编号。",
            "使用场景",
            "适合调试转发链路、验证目标系统是否可达，或在非语音场景下手动下发命令。",
            "发送结果",
            "发送成功后页面会提示指令已发送和时间；失败时会显示更明确的错误信息。",
            "培训边界",
            "该功能主要给管理员或测试人员使用，普通操作员通常不需要手动发送。",
            "截图建议",
            "截图时保留待发送指令摘要和输入字段，更方便讲解。",
        ],
    },
    {
        "number": 34,
        "template": 21,
        "title": "操作员与管理员分工",
        "screenshot": "放一张角色分工表，或用两列对照图展示“普通操作员”和“管理员”。",
        "texts": [
            "7 ",
            "操作员与管理员分工",
            "普通操作员日常主要使用主页和历史说话记录，不负责维护指令库、岗位和操作员资料。",
            "（",
            "2",
            "）管理员除主页外，还负责操作员管理、岗位管理、指令管理和操作事件查看",
            "（",
            "3",
            "）声纹登记通常由管理员或现场维护人员协助完成，普通操作员配合朗读即可",
            "（",
            "4",
            "）培训时应明确“谁负责操作、谁负责维护、谁负责排障上报”",
            "1",
            "）操作员：采集、观察结果、停止会话、查历史记录",
            "2",
            "）管理员：配置后台、维护指令、维护账号、处理异常",
            "3",
            "）角色分清后，现场流程会更顺畅，责任也更明确",
        ],
    },
    {
        "number": 35,
        "template": 21,
        "title": "日常维护",
        "screenshot": "放维护检查表或设备实物检查照片，标明电源、麦克风、屏幕、网络口。",
        "texts": [
            "7 ",
            "日常维护",
            "（1）每天使用前检查设备供电、麦克风、屏幕、网络是否正常，确保主页可以打开",
            "（",
            "2",
            "）使用结束后停止采集并核对是否需要保存录音或导出记录",
            "（",
            "3",
            "）长期不用时保持设备清洁，避免麦克风积灰、接口松动或线缆脱落",
            "（",
            "4",
            "）如需长期留档，可定期整理日志和录音文件，避免只依赖现场口头记录",
            "1",
            "）维护重点：硬件状态、页面状态、网络状态",
            "2",
            "）遇到异常先截图留证，再进行排查和上报",
            "3",
            "）不要在不清楚影响的情况下随意修改后台配置",
        ],
    },
    {
        "number": 36,
        "template": 21,
        "title": "常见故障与快速处理",
        "screenshot": "放故障示例拼图：无法采集、未知说话人、发送失败、日志无记录。",
        "texts": [
            "7 ",
            "常见故障与快速处理",
            "（1）无法开始采集：检查浏览器麦克风权限、设备连接、是否已有其他程序占用麦克风",
            "（",
            "2",
            "）页面无转写：检查是否已开始采集、是否处于静音、是否真的有有效讲话",
            "（",
            "3",
            "）一直未知说话人：检查是否已登记声纹、讲话时长是否足够、环境噪声是否过大",
            "（",
            "4",
            "）转发失败或未命中：先看转写文本是否正确，再看转发目标是否在线",
            "1",
            "）日志查不到记录：确认是否已停止会话，必要时按时间或关键字重新筛选",
            "2",
            "）录音未保存：确认开始采集前是否已打开“保存录音”开关",
            "3",
            "）无法解决时，记录时间、页面现象、会话信息后上报管理员",
        ],
    },
    {
        "number": 37,
        "template": 23,
        "title": "培训总结",
        "screenshot": "无需截图。可保留总结页风格。",
        "texts": [
            "8 ",
            "培训总结",
            "培训完成后应掌握",
            "1.",
            "开机与进入主页",
            "：会检查设备状态并进入正确页面。",
            "2.",
            "启动与停止采集：知道开始前要检查什么，结束后要查什么。",
            "3.",
            "结果判断：能看懂实时转写、主说话人、指令命中和转发状态。",
            "4.",
            "异常处理：遇到无转写、未知说话人、转发失败时知道先检查什么。",
            "5.",
            "日志与维护",
            "：会查询历史记录、导出数据，并完成基本维护和上报。",
        ],
    },
    {
        "number": 38,
        "template": 24,
        "title": "结束页",
        "screenshot": "无需截图。可作为培训收尾页。",
        "texts": [
            "培训结束，按标准流程操作并按职责分工执行",
        ],
    },
]


def replace_slide_texts(slide_xml: bytes, replacements: list[str]) -> bytes:
    root = ET.fromstring(slide_xml)
    text_nodes = root.findall(".//a:t", NS)
    if len(replacements) > len(text_nodes):
        raise ValueError(f"text node count mismatch: expected at most {len(text_nodes)}, got {len(replacements)}")
    padded = replacements + [""] * (len(text_nodes) - len(replacements))
    for node, value in zip(text_nodes, padded):
        node.text = value
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def strip_notes_relationships(rels_xml: bytes) -> bytes:
    root = ET.fromstring(rels_xml)
    kept = []
    for child in list(root):
        rel_type = child.attrib.get("Type", "")
        if not rel_type.endswith("/notesSlide"):
            kept.append(copy.deepcopy(child))
    root.clear()
    for child in kept:
        root.append(child)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def build_slide_lookup() -> dict[int, dict]:
    return {slide["number"]: slide for slide in SLIDES}


def update_content_types(xml_data: bytes, new_slide_numbers: list[int]) -> bytes:
    root = ET.fromstring(xml_data)
    existing = {
        node.attrib.get("PartName")
        for node in root.findall(qn(CT_NS, "Override"))
    }
    for number in new_slide_numbers:
        part_name = f"/ppt/slides/slide{number}.xml"
        if part_name in existing:
            continue
        root.append(
            ET.Element(
                qn(CT_NS, "Override"),
                {
                    "PartName": part_name,
                    "ContentType": "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
                },
            )
        )
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def update_presentation(xml_data: bytes, new_rel_ids: list[str]) -> bytes:
    root = ET.fromstring(xml_data)
    sld_id_lst = root.find(qn(P_NS, "sldIdLst"))
    if sld_id_lst is None:
        raise ValueError("presentation.xml missing sldIdLst")
    existing_ids = [int(node.attrib["id"]) for node in sld_id_lst.findall(qn(P_NS, "sldId"))]
    next_id = max(existing_ids) + 1
    for rel_id in new_rel_ids:
        sld_id_lst.append(
            ET.Element(
                qn(P_NS, "sldId"),
                {
                    "id": str(next_id),
                    qn(R_NS, "id"): rel_id,
                },
            )
        )
        next_id += 1
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def update_presentation_rels(xml_data: bytes, new_slide_numbers: list[int]) -> bytes:
    root = ET.fromstring(xml_data)
    slide_rels = [
        child for child in root.findall(qn(REL_NS, "Relationship"))
        if child.attrib.get("Type", "").endswith("/slide")
    ]
    existing_ids = []
    for child in root.findall(qn(REL_NS, "Relationship")):
        rel_id = child.attrib.get("Id", "")
        if rel_id.startswith("rId") and rel_id[3:].isdigit():
            existing_ids.append(int(rel_id[3:]))
    next_rel = max(existing_ids) + 1
    rel_ids = []
    for number in new_slide_numbers:
        rel_id = f"rId{next_rel}"
        rel_ids.append(rel_id)
        root.append(
            ET.Element(
                qn(REL_NS, "Relationship"),
                {
                    "Id": rel_id,
                    "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
                    "Target": f"slides/slide{number}.xml",
                },
            )
        )
        next_rel += 1
    return ET.tostring(root, encoding="utf-8", xml_declaration=True), rel_ids


def write_screenshot_checklist(target: Path) -> None:
    lines = [
        "# 操作员详细培训 PPT 截图清单",
        "",
        "说明：以下清单按 PPT 页码排列，截图以当前 `voice-web` 页面为准。建议优先使用有真实数据的页面，避免纯空白截图。",
        "",
    ]
    for slide in SLIDES:
        lines.append(f"## 第 {slide['number']} 页 - {slide['title']}")
        lines.append(f"- 截图内容：{slide['screenshot']}")
        lines.append("")
    target.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    source = Path("/Users/zrh/Projects/speak/voice-web/语音识别设备操作与使用培训.pptx")
    target = Path("/Users/zrh/Projects/speak/voice-web/语音识别设备操作与使用培训_操作员详细版.pptx")
    checklist_target = Path("/Users/zrh/Projects/speak/voice-web/PPT截图清单_操作员详细版.md")

    slide_lookup = build_slide_lookup()
    original_slide_count = 24
    new_slide_numbers = [slide["number"] for slide in SLIDES if slide["number"] > original_slide_count]

    with zipfile.ZipFile(source, "r") as src:
        source_entries = {info.filename: (info, src.read(info.filename)) for info in src.infolist()}

    with zipfile.ZipFile(target, "w") as dst:
        presentation_rels_bytes = source_entries["ppt/_rels/presentation.xml.rels"][1]
        updated_rels_bytes, new_rel_ids = update_presentation_rels(presentation_rels_bytes, new_slide_numbers)
        updated_presentation = update_presentation(source_entries["ppt/presentation.xml"][1], new_rel_ids)
        updated_content_types = update_content_types(source_entries["[Content_Types].xml"][1], new_slide_numbers)

        for name, (info, original_data) in source_entries.items():
            data = original_data

            if name == "ppt/presentation.xml":
                data = updated_presentation
            elif name == "ppt/_rels/presentation.xml.rels":
                data = updated_rels_bytes
            elif name == "[Content_Types].xml":
                data = updated_content_types
            elif name.startswith("ppt/slides/slide") and name.endswith(".xml"):
                slide_num = extract_slide_number(name)
                spec = slide_lookup.get(slide_num)
                if spec:
                    template_name = f"ppt/slides/slide{spec['template']}.xml"
                    data = replace_slide_texts(source_entries[template_name][1], spec["texts"])
            elif name.startswith("ppt/slides/_rels/slide") and name.endswith(".xml.rels"):
                rel_slide_num = extract_slide_number(name)
                spec = slide_lookup.get(rel_slide_num)
                if spec:
                    template_rel_name = f"ppt/slides/_rels/slide{spec['template']}.xml.rels"
                    if template_rel_name in source_entries:
                        data = strip_notes_relationships(source_entries[template_rel_name][1])

            dst.writestr(info, data)

        for slide in SLIDES:
            if slide["number"] <= original_slide_count:
                continue
            template_num = slide["template"]
            slide_name = f"ppt/slides/slide{slide['number']}.xml"
            rel_name = f"ppt/slides/_rels/slide{slide['number']}.xml.rels"
            template_slide_name = f"ppt/slides/slide{template_num}.xml"
            template_rel_name = f"ppt/slides/_rels/slide{template_num}.xml.rels"

            slide_xml = replace_slide_texts(source_entries[template_slide_name][1], slide["texts"])
            dst.writestr(slide_name, slide_xml)

            if template_rel_name in source_entries:
                cleaned_rels = strip_notes_relationships(source_entries[template_rel_name][1])
                dst.writestr(rel_name, cleaned_rels)

    write_screenshot_checklist(checklist_target)


if __name__ == "__main__":
    main()
