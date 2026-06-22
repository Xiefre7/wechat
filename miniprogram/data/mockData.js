/**
 * 模拟题库数据 — 用于刷题功能本地测试
 *
 * 数据结构遵循 PRD 定义：
 *   banks → knowledge_points → questions
 *
 * 包含 3 个官方题库（数学、英语、政治）+ 1 个自导入题库
 * 共 125 道题，覆盖单选/多选/判断/填空/简答题型
 * 题库来源：测试仿真练习.md（数学40+政治40+英语40+自定义5）
 */

const mockData = {
  "banks": [
    {
      "_id": "bank_math_1",
      "name": "福建职教高考·数学",
      "type": "official",
      "category": "数学",
      "subCategory": "职教高考",
      "description": "福建省职教高考数学公共基础知识题库",
      "coverImage": "",
      "ownerId": null,
      "isPublic": true,
      "questionCount": 40,
      "knowledgePointCount": 7,
      "tags": [
        "职教高考",
        "数学",
        "福建"
      ],
      "createdAt": "2025-09-01T00:00:00Z",
      "updatedAt": "2025-09-01T00:00:00Z"
    },
    {
      "_id": "bank_english_1",
      "name": "福建职教高考·英语",
      "type": "official",
      "category": "英语",
      "subCategory": "职教高考",
      "description": "福建省职教高考英语公共基础知识题库",
      "coverImage": "",
      "ownerId": null,
      "isPublic": true,
      "questionCount": 40,
      "knowledgePointCount": 4,
      "tags": [
        "职教高考",
        "英语",
        "福建"
      ],
      "createdAt": "2025-09-01T00:00:00Z",
      "updatedAt": "2025-09-01T00:00:00Z"
    },
    {
      "_id": "bank_politics_1",
      "name": "福建职教高考·政治",
      "type": "official",
      "category": "政治",
      "subCategory": "职教高考",
      "description": "福建省职教高考政治公共基础知识题库",
      "coverImage": "",
      "ownerId": null,
      "isPublic": true,
      "questionCount": 40,
      "knowledgePointCount": 4,
      "tags": [
        "职教高考",
        "政治",
        "福建"
      ],
      "createdAt": "2025-09-01T00:00:00Z",
      "updatedAt": "2025-09-01T00:00:00Z"
    },
    {
      "_id": "bank_custom_1",
      "name": "2024福建高职单招真题",
      "type": "custom",
      "category": "数学",
      "subCategory": "",
      "description": "用户自导入的2024年高职单招真题",
      "coverImage": "",
      "ownerId": "user_001",
      "isPublic": false,
      "questionCount": 5,
      "knowledgePointCount": 0,
      "tags": [
        "自导入",
        "真题"
      ],
      "createdAt": "2026-05-15T00:00:00Z",
      "updatedAt": "2026-05-15T00:00:00Z"
    }
  ],
  "knowledgePoints": [
    {
      "_id": "kp_math_1",
      "bankId": "bank_math_1",
      "name": "集合与不等式",
      "parentId": "",
      "order": 1,
      "questionCount": 9,
      "description": "集合运算、区间表示、一元二次不等式、绝对值不等式、不等式性质"
    },
    {
      "_id": "kp_math_2",
      "bankId": "bank_math_1",
      "name": "函数",
      "parentId": "",
      "order": 2,
      "questionCount": 7,
      "description": "函数定义域、奇偶性、指数函数、对数函数、函数求值"
    },
    {
      "_id": "kp_math_3",
      "bankId": "bank_math_1",
      "name": "数列",
      "parentId": "",
      "order": 3,
      "questionCount": 4,
      "description": "等差数列、等比数列的通项公式与公差/公比计算"
    },
    {
      "_id": "kp_math_4",
      "bankId": "bank_math_1",
      "name": "三角函数",
      "parentId": "",
      "order": 4,
      "questionCount": 6,
      "description": "三角比定义、特殊角三角函数值、正弦余弦性质、勾股定理"
    },
    {
      "_id": "kp_math_5",
      "bankId": "bank_math_1",
      "name": "解析几何",
      "parentId": "",
      "order": 5,
      "questionCount": 6,
      "description": "直线方程、圆的方程、斜率、点到点距离、点与圆的位置关系"
    },
    {
      "_id": "kp_math_6",
      "bankId": "bank_math_1",
      "name": "向量与立体几何",
      "parentId": "",
      "order": 6,
      "questionCount": 4,
      "description": "向量加法、向量平行判定、空间几何公理、三点共线"
    },
    {
      "_id": "kp_math_7",
      "bankId": "bank_math_1",
      "name": "概率与统计",
      "parentId": "",
      "order": 7,
      "questionCount": 4,
      "description": "古典概型、分类计数原理、组合数计算、概率性质判断"
    },
    {
      "_id": "kp_english_1",
      "bankId": "bank_english_1",
      "name": "词汇",
      "parentId": "",
      "order": 1,
      "questionCount": 10,
      "description": "核心词汇词义辨析"
    },
    {
      "_id": "kp_english_2",
      "bankId": "bank_english_1",
      "name": "语法",
      "parentId": "",
      "order": 2,
      "questionCount": 10,
      "description": "一般现在时、情态动词、比较级、过去进行时、从句、感叹句等"
    },
    {
      "_id": "kp_english_3",
      "bankId": "bank_english_1",
      "name": "情景交际",
      "parentId": "",
      "order": 3,
      "questionCount": 10,
      "description": "问候、感谢、道歉、建议、请求、频率、天气等应答"
    },
    {
      "_id": "kp_english_4",
      "bankId": "bank_english_1",
      "name": "补全对话与阅读",
      "parentId": "",
      "order": 4,
      "questionCount": 10,
      "description": "对话逻辑补全、阅读理解细节题"
    },
    {
      "_id": "kp_politics_1",
      "bankId": "bank_politics_1",
      "name": "中国特色社会主义",
      "parentId": "",
      "order": 1,
      "questionCount": 13,
      "description": "马克思主义中国化成果、中国式现代化、依法治国、商品与货币、核心价值观、人类命运共同体等"
    },
    {
      "_id": "kp_politics_2",
      "bankId": "bank_politics_1",
      "name": "法律基础",
      "parentId": "",
      "order": 2,
      "questionCount": 8,
      "description": "公民道德规范、法律特征、诚信与法治、宪法地位、消费者权益、犯罪特征"
    },
    {
      "_id": "kp_politics_3",
      "bankId": "bank_politics_1",
      "name": "职业道德与素养",
      "parentId": "",
      "order": 3,
      "questionCount": 9,
      "description": "职业道德规范、职业礼仪、情绪调节、职业理想、遵纪守法、青春期心理"
    },
    {
      "_id": "kp_politics_4",
      "bankId": "bank_politics_1",
      "name": "哲学与心理健康",
      "parentId": "",
      "order": 4,
      "questionCount": 10,
      "description": "辩证唯物主义、心理健康、人际关系、人生价值"
    }
  ],
  "questionClasses": [
    { "_id": "qc_math_1a", "knowledgePointId": "kp_math_1", "name": "集合运算", "order": 1, "questionCount": 5 },
    { "_id": "qc_math_1b", "knowledgePointId": "kp_math_1", "name": "不等式求解", "order": 2, "questionCount": 4 },
    { "_id": "qc_math_2a", "knowledgePointId": "kp_math_2", "name": "函数定义域与求值", "order": 1, "questionCount": 3 },
    { "_id": "qc_math_2b", "knowledgePointId": "kp_math_2", "name": "函数性质与图像", "order": 2, "questionCount": 4 },
    { "_id": "qc_math_3a", "knowledgePointId": "kp_math_3", "name": "等差等比数列", "order": 1, "questionCount": 4 },
    { "_id": "qc_math_4a", "knowledgePointId": "kp_math_4", "name": "三角比与特殊角", "order": 1, "questionCount": 3 },
    { "_id": "qc_math_4b", "knowledgePointId": "kp_math_4", "name": "三角性质与综合", "order": 2, "questionCount": 3 },
    { "_id": "qc_math_5a", "knowledgePointId": "kp_math_5", "name": "直线方程", "order": 1, "questionCount": 3 },
    { "_id": "qc_math_5b", "knowledgePointId": "kp_math_5", "name": "圆与距离", "order": 2, "questionCount": 3 },
    { "_id": "qc_math_6a", "knowledgePointId": "kp_math_6", "name": "向量与立体几何", "order": 1, "questionCount": 4 },
    { "_id": "qc_math_7a", "knowledgePointId": "kp_math_7", "name": "概率与计数", "order": 1, "questionCount": 4 }
  ],
  "questions": [
    {
      "_id": "q_math_001",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_1",
      "questionClassId": "qc_math_1a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "已知集合A={1,2,3}，B={2,3,4}，则A∩B=( )",
        "options": [
          {
            "key": "A",
            "text": "{1,2,3,4}"
          },
          {
            "key": "B",
            "text": "{2,3}"
          },
          {
            "key": "C",
            "text": "{1,4}"
          },
          {
            "key": "D",
            "text": "{1,2,3}"
          }
        ],
        "answer": "B",
        "explanation": "交集取两个集合的公共元素，A和B的公共元素为2和3，故A∩B={2,3}。"
      },
      "tags": [
        "集合",
        "交集",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_002",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_1",
      "questionClassId": "qc_math_1b",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "不等式(x-2)(x+1)<0的解集是( )",
        "options": [
          {
            "key": "A",
            "text": "(-∞,-1)∪(2,+∞)"
          },
          {
            "key": "B",
            "text": "(-1,2)"
          },
          {
            "key": "C",
            "text": "(-∞,-1]∪[2,+∞)"
          },
          {
            "key": "D",
            "text": "[-1,2]"
          }
        ],
        "answer": "B",
        "explanation": "两根为x=-1和x=2，开口向上，小于0取两根之间，即(-1,2)。"
      },
      "tags": [
        "不等式",
        "二次",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_003",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_2",
      "questionClassId": "qc_math_2a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "函数f(x)=√(x-3)的定义域是( )",
        "options": [
          {
            "key": "A",
            "text": "{x|x<3}"
          },
          {
            "key": "B",
            "text": "{x|x≤3}"
          },
          {
            "key": "C",
            "text": "{x|x≥3}"
          },
          {
            "key": "D",
            "text": "{x|x>3}"
          }
        ],
        "answer": "C",
        "explanation": "二次根式被开方数≥0，即x-3≥0，解得x≥3。"
      },
      "tags": [
        "函数",
        "定义域",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_004",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_1",
      "questionClassId": "qc_math_1b",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "已知a>b，下列不等式成立的是( )",
        "options": [
          {
            "key": "A",
            "text": "a-3<b-3"
          },
          {
            "key": "B",
            "text": "-2a>-2b"
          },
          {
            "key": "C",
            "text": "a+1>b+1"
          },
          {
            "key": "D",
            "text": "a/2<b/2"
          }
        ],
        "answer": "C",
        "explanation": "不等式两边同加同减不改变方向，a>b ⇒ a+1>b+1。A减3不变号应>；B乘负数应变号<；D除正数不变号应>。"
      },
      "tags": [
        "不等式",
        "性质",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_005",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_3",
      "questionClassId": "qc_math_3a",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "等差数列{an}中，a₁=2，d=3，则a₅=( )",
        "options": [
          {
            "key": "A",
            "text": "11"
          },
          {
            "key": "B",
            "text": "14"
          },
          {
            "key": "C",
            "text": "17"
          },
          {
            "key": "D",
            "text": "8"
          }
        ],
        "answer": "B",
        "explanation": "a₅=a₁+4d=2+4×3=14。"
      },
      "tags": [
        "数列",
        "等差数列",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_006",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_3",
      "questionClassId": "qc_math_3a",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "等比数列1, 2, 4, 8, …的第6项为( )",
        "options": [
          {
            "key": "A",
            "text": "16"
          },
          {
            "key": "B",
            "text": "32"
          },
          {
            "key": "C",
            "text": "64"
          },
          {
            "key": "D",
            "text": "12"
          }
        ],
        "answer": "B",
        "explanation": "公比q=2，a₆=a₁·q⁵=1×2⁵=32。"
      },
      "tags": [
        "数列",
        "等比数列",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_007",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_2",
      "questionClassId": "qc_math_2b",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "下列函数是奇函数的是( )",
        "options": [
          {
            "key": "A",
            "text": "y=x²"
          },
          {
            "key": "B",
            "text": "y=cosx"
          },
          {
            "key": "C",
            "text": "y=3x"
          },
          {
            "key": "D",
            "text": "y=log₂x"
          }
        ],
        "answer": "C",
        "explanation": "奇函数满足f(-x)=-f(x)。y=3x满足，y=x²和y=cosx是偶函数，y=log₂x非奇非偶。"
      },
      "tags": [
        "函数",
        "奇偶性",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_008",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_4",
      "questionClassId": "qc_math_4a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "已知角α的终边过点P(3,-4)，则sinα=( )",
        "options": [
          {
            "key": "A",
            "text": "3/5"
          },
          {
            "key": "B",
            "text": "-3/5"
          },
          {
            "key": "C",
            "text": "4/5"
          },
          {
            "key": "D",
            "text": "-4/5"
          }
        ],
        "answer": "D",
        "explanation": "r=√(3²+(-4)²)=5，sinα=y/r=-4/5。"
      },
      "tags": [
        "三角",
        "定义",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_009",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_4",
      "questionClassId": "qc_math_4a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "sin30°+cos60°=( )",
        "options": [
          {
            "key": "A",
            "text": "0"
          },
          {
            "key": "B",
            "text": "1/2"
          },
          {
            "key": "C",
            "text": "1"
          },
          {
            "key": "D",
            "text": "√3/2"
          }
        ],
        "answer": "C",
        "explanation": "sin30°=1/2，cos60°=1/2，和为1。"
      },
      "tags": [
        "三角",
        "特殊角",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_010",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_6",
      "questionClassId": "qc_math_6a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "已知向量a=(2,3)，b=(1,-1)，则a+b=( )",
        "options": [
          {
            "key": "A",
            "text": "(3,2)"
          },
          {
            "key": "B",
            "text": "(1,4)"
          },
          {
            "key": "C",
            "text": "(3,4)"
          },
          {
            "key": "D",
            "text": "(2,-1)"
          }
        ],
        "answer": "A",
        "explanation": "a+b=(2+1, 3+(-1))=(3,2)。"
      },
      "tags": [
        "向量",
        "运算",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_011",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_5",
      "questionClassId": "qc_math_5a",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "直线过点(1,2)且斜率为3，其方程为( )",
        "options": [
          {
            "key": "A",
            "text": "y=3x+1"
          },
          {
            "key": "B",
            "text": "y=3x-1"
          },
          {
            "key": "C",
            "text": "y=3x+5"
          },
          {
            "key": "D",
            "text": "y=3x-5"
          }
        ],
        "answer": "B",
        "explanation": "点斜式y-2=3(x-1)，整理得y=3x-1。"
      },
      "tags": [
        "解析几何",
        "直线",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_012",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_5",
      "questionClassId": "qc_math_5b",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "圆(x-2)²+(y+1)²=9的圆心和半径分别是( )",
        "options": [
          {
            "key": "A",
            "text": "(2,1),3"
          },
          {
            "key": "B",
            "text": "(-2,1),3"
          },
          {
            "key": "C",
            "text": "(2,-1),3"
          },
          {
            "key": "D",
            "text": "(-2,-1),9"
          }
        ],
        "answer": "C",
        "explanation": "圆心(2,-1)，注意y+1即y-(-1)；半径r=√9=3。"
      },
      "tags": [
        "解析几何",
        "圆",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_013",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_6",
      "questionClassId": "qc_math_6a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "下列命题正确的是( )",
        "options": [
          {
            "key": "A",
            "text": "三点一定共面"
          },
          {
            "key": "B",
            "text": "两条直线确定一个平面"
          },
          {
            "key": "C",
            "text": "不共线三点确定一个平面"
          },
          {
            "key": "D",
            "text": "一个点确定一个平面"
          }
        ],
        "answer": "C",
        "explanation": "公理：不共线的三点确定唯一一个平面。"
      },
      "tags": [
        "立体几何",
        "公理",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_014",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_7",
      "questionClassId": "qc_math_7a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "投掷一枚质地均匀的骰子，点数为偶数的概率是( )",
        "options": [
          {
            "key": "A",
            "text": "1/6"
          },
          {
            "key": "B",
            "text": "1/3"
          },
          {
            "key": "C",
            "text": "1/2"
          },
          {
            "key": "D",
            "text": "2/3"
          }
        ],
        "answer": "C",
        "explanation": "偶数点有2、4、6共3个，P=3/6=1/2。"
      },
      "tags": [
        "概率",
        "古典概型",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_015",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_7",
      "questionClassId": "qc_math_7a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "从5名男生和3名女生中选1人，共有( )种选法",
        "options": [
          {
            "key": "A",
            "text": "5"
          },
          {
            "key": "B",
            "text": "3"
          },
          {
            "key": "C",
            "text": "8"
          },
          {
            "key": "D",
            "text": "15"
          }
        ],
        "answer": "C",
        "explanation": "分类加法计数原理，5+3=8种。"
      },
      "tags": [
        "计数原理",
        "分类",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_016",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_2",
      "questionClassId": "qc_math_2b",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "指数函数f(x)=2ˣ，则f(3)=( )",
        "options": [
          {
            "key": "A",
            "text": "6"
          },
          {
            "key": "B",
            "text": "8"
          },
          {
            "key": "C",
            "text": "9"
          },
          {
            "key": "D",
            "text": "5"
          }
        ],
        "answer": "B",
        "explanation": "f(3)=2³=8。"
      },
      "tags": [
        "函数",
        "指数",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_017",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_2",
      "questionClassId": "qc_math_2b",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "log₂8的值为( )",
        "options": [
          {
            "key": "A",
            "text": "2"
          },
          {
            "key": "B",
            "text": "3"
          },
          {
            "key": "C",
            "text": "4"
          },
          {
            "key": "D",
            "text": "1"
          }
        ],
        "answer": "B",
        "explanation": "2³=8，所以log₂8=3。"
      },
      "tags": [
        "函数",
        "对数",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_018",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_4",
      "questionClassId": "qc_math_4b",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "函数y=sinx的最大值与最小值的和为( )",
        "options": [
          {
            "key": "A",
            "text": "0"
          },
          {
            "key": "B",
            "text": "1"
          },
          {
            "key": "C",
            "text": "2"
          },
          {
            "key": "D",
            "text": "-1"
          }
        ],
        "answer": "A",
        "explanation": "最大值为1，最小值为-1，和为0。"
      },
      "tags": [
        "三角",
        "性质",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_019",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_1",
      "questionClassId": "qc_math_1a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "区间(1,5]用集合表示为( )",
        "options": [
          {
            "key": "A",
            "text": "{x|1≤x<5}"
          },
          {
            "key": "B",
            "text": "{x|1<x≤5}"
          },
          {
            "key": "C",
            "text": "{x|1≤x≤5}"
          },
          {
            "key": "D",
            "text": "{x|1<x<5}"
          }
        ],
        "answer": "B",
        "explanation": "开区间(不包含端点，闭区间]包含端点。"
      },
      "tags": [
        "集合",
        "区间",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_020",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_2",
      "questionClassId": "qc_math_2a",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "若f(x)=x²+1，则f(-2)=( )",
        "options": [
          {
            "key": "A",
            "text": "-3"
          },
          {
            "key": "B",
            "text": "3"
          },
          {
            "key": "C",
            "text": "5"
          },
          {
            "key": "D",
            "text": "4"
          }
        ],
        "answer": "C",
        "explanation": "f(-2)=(-2)²+1=4+1=5。"
      },
      "tags": [
        "函数",
        "求值",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_021",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_1",
      "questionClassId": "qc_math_1a",
      "type": "fill_blank",
      "difficulty": 1,
      "content": {
        "stem": "集合{1,2,3}的子集共有____个。",
        "options": [],
        "answer": "8",
        "explanation": "含n个元素的集合有2ⁿ个子集，2³=8。"
      },
      "tags": [
        "集合",
        "子集",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_022",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_1",
      "questionClassId": "qc_math_1b",
      "type": "fill_blank",
      "difficulty": 2,
      "content": {
        "stem": "不等式|x|<4的解集用区间表示为____。",
        "options": [],
        "answer": "(-4,4)",
        "explanation": "|x|<a（a>0）的解集为(-a,a)。"
      },
      "tags": [
        "不等式",
        "绝对值",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_023",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_2",
      "questionClassId": "qc_math_2a",
      "type": "fill_blank",
      "difficulty": 2,
      "content": {
        "stem": "若log₃x=2，则x=____。",
        "options": [],
        "answer": "9",
        "explanation": "log₃x=2 ⇒ 3²=x ⇒ x=9。"
      },
      "tags": [
        "函数",
        "对数",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_024",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_3",
      "questionClassId": "qc_math_3a",
      "type": "fill_blank",
      "difficulty": 1,
      "content": {
        "stem": "已知等差数列中a₁=3，a₃=7，则公差d=____。",
        "options": [],
        "answer": "2",
        "explanation": "a₃=a₁+2d ⇒ 7=3+2d ⇒ d=2。"
      },
      "tags": [
        "数列",
        "等差数列",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_025",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_5",
      "questionClassId": "qc_math_5b",
      "type": "fill_blank",
      "difficulty": 2,
      "content": {
        "stem": "点A(3,4)到原点的距离为____。",
        "options": [],
        "answer": "5",
        "explanation": "d=√(3²+4²)=√25=5。"
      },
      "tags": [
        "解析几何",
        "距离",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_026",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_5",
      "questionClassId": "qc_math_5a",
      "type": "fill_blank",
      "difficulty": 1,
      "content": {
        "stem": "直线y=2x+1的斜率为____。",
        "options": [],
        "answer": "2",
        "explanation": "y=kx+b中k就是斜率，k=2。"
      },
      "tags": [
        "解析几何",
        "斜率",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_027",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_4",
      "questionClassId": "qc_math_4a",
      "type": "fill_blank",
      "difficulty": 1,
      "content": {
        "stem": "cos60°=____。",
        "options": [],
        "answer": "1/2",
        "explanation": "cos60°=1/2，需牢记特殊角三角函数值。"
      },
      "tags": [
        "三角",
        "特殊角",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_028",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_6",
      "questionClassId": "qc_math_6a",
      "type": "fill_blank",
      "difficulty": 2,
      "content": {
        "stem": "向量a=(1,2)与b=(2,4)的位置关系是____（填\"平行\"或\"垂直\"）。",
        "options": [],
        "answer": "平行",
        "explanation": "b=2a，两向量成比例则平行。"
      },
      "tags": [
        "向量",
        "平行",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_029",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_7",
      "questionClassId": "qc_math_7a",
      "type": "fill_blank",
      "difficulty": 1,
      "content": {
        "stem": "从1,2,3,4中任取2个数字，有____种取法。",
        "options": [],
        "answer": "6",
        "explanation": "C(4,2)=4×3÷2=6。"
      },
      "tags": [
        "计数原理",
        "组合",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_030",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_2",
      "questionClassId": "qc_math_2a",
      "type": "fill_blank",
      "difficulty": 2,
      "content": {
        "stem": "函数y=√(4-x²)的定义域用区间表示为____。",
        "options": [],
        "answer": "[-2,2]",
        "explanation": "4-x²≥0 ⇒ x²≤4 ⇒ -2≤x≤2。"
      },
      "tags": [
        "函数",
        "定义域",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_031",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_1",
      "questionClassId": "qc_math_1a",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "空集是任何集合的子集。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "空集∅是任何集合的子集，这是集合论的基本性质。"
      },
      "tags": [
        "集合",
        "性质",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_032",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_1",
      "questionClassId": "qc_math_1b",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "若a>b，则ac>bc对任意实数c都成立。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "B",
        "explanation": "错误。当c<0时不等式变号，当c=0时两边相等。"
      },
      "tags": [
        "不等式",
        "性质",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_033",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_4",
      "questionClassId": "qc_math_4b",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "函数y=sinx的最小正周期是2π。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。正弦函数的周期T=2π。"
      },
      "tags": [
        "三角",
        "性质",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_034",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_6",
      "questionClassId": "qc_math_6a",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "三点A(0,0),B(1,1),C(2,2)共线。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。三点都在直线y=x上，斜率一致。"
      },
      "tags": [
        "向量",
        "共线",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_035",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_7",
      "questionClassId": "qc_math_7a",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "投掷一枚硬币，正面朝上的概率是1/3。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "B",
        "explanation": "错误。硬币只有正反两面，等可能，P=1/2。"
      },
      "tags": [
        "概率",
        "古典概型",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_036",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_1",
      "questionClassId": "qc_math_1a",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "已知全集U={1,2,3,4,5,6}，集合A={1,2,3}，B={2,3,4}。\n求：(1) A∪B；(2) A∩B；(3) ∁UA。",
        "options": [],
        "answer": "(1) A∪B={1,2,3,4}\n(2) A∩B={2,3}\n(3) ∁UA={4,5,6}",
        "explanation": "并集、交集、补集是集合运算的基础，注意补集必须在全集范围内讨论。"
      },
      "tags": [
        "集合",
        "运算",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_037",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_3",
      "questionClassId": "qc_math_3a",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "已知等差数列{an}中，a₂=5，a₅=14。\n求：(1) 公差d和首项a₁；(2) a₁₀。",
        "options": [],
        "answer": "公差d=3，首项a₁=2，a₁₀=29",
        "explanation": "利用通项公式aₙ=a₁+(n-1)d：a₅-a₂=3d⇒d=3；a₂=a₁+d⇒a₁=2；a₁₀=a₁+9d=29。"
      },
      "tags": [
        "数列",
        "等差数列",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_038",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_5",
      "questionClassId": "qc_math_5a",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "求经过点A(2,3)且斜率为-2的直线方程，并判断点B(0,7)是否在该直线上。",
        "options": [],
        "answer": "直线方程为y=-2x+7，点B在该直线上",
        "explanation": "点斜式y-y₀=k(x-x₀)：y-3=-2(x-2)⇒y=-2x+7。将B(0,7)代入验证等式成立。"
      },
      "tags": [
        "解析几何",
        "直线",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_039",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_4",
      "questionClassId": "qc_math_4b",
      "type": "short_answer",
      "difficulty": 3,
      "content": {
        "stem": "在△ABC中，已知AB=3，AC=4，∠A=90°。\n求：(1) BC的长度；(2) sinB的值。",
        "options": [],
        "answer": "BC=5，sinB=4/5",
        "explanation": "勾股定理：BC²=AB²+AC²=25⇒BC=5。sinB=对边/斜边=AC/BC=4/5。"
      },
      "tags": [
        "三角",
        "勾股定理",
        "综合"
      ],
      "status": "active"
    },
    {
      "_id": "q_math_040",
      "bankId": "bank_math_1",
      "knowledgePointId": "kp_math_5",
      "questionClassId": "qc_math_5b",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "已知圆的方程为(x-1)²+(y+2)²=4。\n求：(1) 圆心坐标和半径；(2) 点P(3,-2)是否在圆上。",
        "options": [],
        "answer": "圆心(1,-2)，半径2，点P在圆上",
        "explanation": "圆心C(1,-2)，r=√4=2。|PC|²=(3-1)²+(-2+2)²=4=r²，故点P在圆上。"
      },
      "tags": [
        "解析几何",
        "圆",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_001",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "马克思主义中国化时代化的最新理论成果是( )",
        "options": [
          {
            "key": "A",
            "text": "毛泽东思想"
          },
          {
            "key": "B",
            "text": "\"三个代表\"重要思想"
          },
          {
            "key": "C",
            "text": "邓小平理论"
          },
          {
            "key": "D",
            "text": "习近平新时代中国特色社会主义思想"
          }
        ],
        "answer": "D",
        "explanation": "习近平新时代中国特色社会主义思想是当代中国马克思主义、二十一世纪马克思主义。"
      },
      "tags": [
        "中国特色社会主义",
        "马克思主义",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_002",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "党的二十大报告指出，中国式现代化的本质要求之一是( )",
        "options": [
          {
            "key": "A",
            "text": "实现全体人民同步富裕"
          },
          {
            "key": "B",
            "text": "实现全体人民共同富裕"
          },
          {
            "key": "C",
            "text": "实现部分人民先富"
          },
          {
            "key": "D",
            "text": "实现物质富裕即可"
          }
        ],
        "answer": "B",
        "explanation": "中国式现代化是全体人民共同富裕的现代化，不是少数人富裕。"
      },
      "tags": [
        "中国特色社会主义",
        "现代化",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_003",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "全面依法治国的总目标是建设中国特色社会主义法治体系，建设社会主义( )",
        "options": [
          {
            "key": "A",
            "text": "法治国家"
          },
          {
            "key": "B",
            "text": "法治政府"
          },
          {
            "key": "C",
            "text": "法治社会"
          },
          {
            "key": "D",
            "text": "法治制度"
          }
        ],
        "answer": "A",
        "explanation": "总目标是建设中国特色社会主义法治体系，建设社会主义法治国家。"
      },
      "tags": [
        "中国特色社会主义",
        "法治",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_004",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "\"爱岗敬业、诚实守信、办事公道、服务群众、奉献社会\"属于( )",
        "options": [
          {
            "key": "A",
            "text": "社会公德"
          },
          {
            "key": "B",
            "text": "职业道德"
          },
          {
            "key": "C",
            "text": "家庭美德"
          },
          {
            "key": "D",
            "text": "个人品德"
          }
        ],
        "answer": "B",
        "explanation": "这是《新时代公民道德建设实施纲要》规定的职业道德主要内容。"
      },
      "tags": [
        "职业道德",
        "规范",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_005",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_3",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "良好职业礼仪的基本要求不包括( )",
        "options": [
          {
            "key": "A",
            "text": "仪容仪表端庄"
          },
          {
            "key": "B",
            "text": "职业用语文明"
          },
          {
            "key": "C",
            "text": "职业技能精湛"
          },
          {
            "key": "D",
            "text": "行为举止得体"
          }
        ],
        "answer": "C",
        "explanation": "职业技能属于专业能力范畴，不属于职业礼仪的基本要求。礼仪涉及仪容、语言、行为等外在表现。"
      },
      "tags": [
        "职业道德",
        "礼仪",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_006",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_2",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "我国公民最基本的道德规范是( )",
        "options": [
          {
            "key": "A",
            "text": "明礼诚信"
          },
          {
            "key": "B",
            "text": "爱国守法"
          },
          {
            "key": "C",
            "text": "团结友善"
          },
          {
            "key": "D",
            "text": "勤俭自强"
          }
        ],
        "answer": "B",
        "explanation": "爱国守法是公民最基本的道德规范，是所有道德要求的基础。"
      },
      "tags": [
        "法律",
        "道德",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_007",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_2",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "\"不以规矩，不能成方圆\"体现的法律特征是( )",
        "options": [
          {
            "key": "A",
            "text": "法律由国家制定或认可"
          },
          {
            "key": "B",
            "text": "法律对全体社会成员具有普遍约束力"
          },
          {
            "key": "C",
            "text": "法律以国家强制力保证实施"
          },
          {
            "key": "D",
            "text": "法律是调整行为关系的规范"
          }
        ],
        "answer": "D",
        "explanation": "\"规矩\"即规范、标准，强调法律对社会行为的规范和指引作用。"
      },
      "tags": [
        "法律",
        "特征",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_008",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "商品的两个基本属性是( )",
        "options": [
          {
            "key": "A",
            "text": "使用价值和价值"
          },
          {
            "key": "B",
            "text": "使用价值和价格"
          },
          {
            "key": "C",
            "text": "交换价值和价值"
          },
          {
            "key": "D",
            "text": "交换价值和价格"
          }
        ],
        "answer": "A",
        "explanation": "商品是使用价值和价值的统一体。使用价值是商品的自然属性，价值是商品的社会属性。"
      },
      "tags": [
        "中国特色社会主义",
        "经济",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_009",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "货币的本质是( )",
        "options": [
          {
            "key": "A",
            "text": "商品"
          },
          {
            "key": "B",
            "text": "一般等价物"
          },
          {
            "key": "C",
            "text": "纸币"
          },
          {
            "key": "D",
            "text": "金银"
          }
        ],
        "answer": "B",
        "explanation": "货币是从商品中分离出来固定充当一般等价物的商品，其本质是一般等价物。"
      },
      "tags": [
        "中国特色社会主义",
        "经济",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_010",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "\"牵牛要牵牛鼻子\"体现的哲学原理是( )",
        "options": [
          {
            "key": "A",
            "text": "要抓住事物的主要矛盾"
          },
          {
            "key": "B",
            "text": "要看到矛盾的两个方面"
          },
          {
            "key": "C",
            "text": "矛盾双方可以转化"
          },
          {
            "key": "D",
            "text": "矛盾无处不在"
          }
        ],
        "answer": "A",
        "explanation": "牛鼻子是牵牛的关键部位，比喻要善于抓住主要矛盾，抓住问题的关键。"
      },
      "tags": [
        "哲学",
        "矛盾",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_011",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "\"拔苗助长\"的寓言启示我们( )",
        "options": [
          {
            "key": "A",
            "text": "要充分发挥主观能动性"
          },
          {
            "key": "B",
            "text": "要尊重客观规律"
          },
          {
            "key": "C",
            "text": "要敢于打破常规"
          },
          {
            "key": "D",
            "text": "要坚持实践第一"
          }
        ],
        "answer": "B",
        "explanation": "拔苗助长违背了禾苗生长的客观规律，启示我们必须尊重客观规律，按规律办事。"
      },
      "tags": [
        "哲学",
        "规律",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_012",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "实践是认识的( )",
        "options": [
          {
            "key": "A",
            "text": "唯一标准"
          },
          {
            "key": "B",
            "text": "唯一目的"
          },
          {
            "key": "C",
            "text": "来源、动力、目的和检验标准"
          },
          {
            "key": "D",
            "text": "最终结果"
          }
        ],
        "answer": "C",
        "explanation": "实践决定认识，是认识的来源、发展动力、目的和检验真理的唯一标准。"
      },
      "tags": [
        "哲学",
        "实践观",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_013",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "以下哪项不属于青春期常见的心理特征( )",
        "options": [
          {
            "key": "A",
            "text": "自我意识增强"
          },
          {
            "key": "B",
            "text": "情绪波动较大"
          },
          {
            "key": "C",
            "text": "完全独立不依赖他人"
          },
          {
            "key": "D",
            "text": "渴望同伴交往"
          }
        ],
        "answer": "C",
        "explanation": "青春期自我意识增强但不可能完全独立，仍然需要家庭和社会的支持。"
      },
      "tags": [
        "心理健康",
        "青春期",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_014",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_3",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "调节情绪的正确方法是( )",
        "options": [
          {
            "key": "A",
            "text": "压抑所有负面情绪"
          },
          {
            "key": "B",
            "text": "合理宣泄和转移注意"
          },
          {
            "key": "C",
            "text": "对他人发泄愤怒"
          },
          {
            "key": "D",
            "text": "完全忽略情绪变化"
          }
        ],
        "answer": "B",
        "explanation": "心理健康要求合理调节情绪，可以通过运动、倾诉、转移注意等健康方式宣泄。"
      },
      "tags": [
        "心理健康",
        "情绪",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_015",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "实现人生价值的根本途径是( )",
        "options": [
          {
            "key": "A",
            "text": "学习理论知识"
          },
          {
            "key": "B",
            "text": "劳动和奉献"
          },
          {
            "key": "C",
            "text": "追求个人利益"
          },
          {
            "key": "D",
            "text": "获得社会地位"
          }
        ],
        "answer": "B",
        "explanation": "人生价值在劳动和奉献中实现，在对社会和他人的贡献中体现。"
      },
      "tags": [
        "哲学",
        "人生观",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_016",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "中国特色社会主义最本质的特征是中国共产党领导。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。这是宪法修正案和十九大报告明确阐明的重大政治论断。"
      },
      "tags": [
        "中国特色社会主义",
        "党的领导",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_017",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_2",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "诚信只是个人道德问题，与社会发展无关。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "B",
        "explanation": "错误。诚信是社会主义核心价值观的重要内容，也是市场经济健康运行的基石。"
      },
      "tags": [
        "法律",
        "诚信",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_018",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_2",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "法律对全体社会成员具有普遍约束力。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。法律面前人人平等，这是社会主义法治的基本原则。"
      },
      "tags": [
        "法律",
        "原则",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_019",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_2",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "宪法是我国的根本大法。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。宪法具有最高的法律效力，是治国安邦的总章程。"
      },
      "tags": [
        "法律",
        "宪法",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_020",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "量变是质变的必要准备，质变是量变的必然结果。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。这是唯物辩证法关于量变质变规律的基本原理。"
      },
      "tags": [
        "哲学",
        "辩证法",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_021",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "实践观点是马克思主义哲学首要的和基本的观点。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。实践性是马克思主义哲学区别于其他哲学的最显著特征。"
      },
      "tags": [
        "哲学",
        "实践观",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_022",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "社会主义核心价值观只包括国家层面的价值目标。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "B",
        "explanation": "错误。社会主义核心价值观包含国家、社会、个人三个层面。"
      },
      "tags": [
        "中国特色社会主义",
        "价值观",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_023",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_3",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "只要努力学习书本知识，就能实现人生价值。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "B",
        "explanation": "错误。实现人生价值需要理论与实践相结合，在劳动和奉献中实现。"
      },
      "tags": [
        "职业道德",
        "人生观",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_024",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "朋友之间应该完全坦诚，没有任何隐私。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "B",
        "explanation": "错误。健康的人际关系需要相互尊重，包括尊重彼此的隐私空间。"
      },
      "tags": [
        "心理健康",
        "人际关系",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_025",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "创新是引领发展的第一动力。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。创新在我国现代化建设全局中居于核心地位。"
      },
      "tags": [
        "中国特色社会主义",
        "创新",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_026",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_2",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "消费者的合法权益受到侵害时，只能自认倒霉。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "B",
        "explanation": "错误。消费者可以通过协商、投诉、仲裁、诉讼等合法途径维权。"
      },
      "tags": [
        "法律",
        "消费者",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_027",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "构建人类命运共同体是中国为世界贡献的中国方案。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。这是习近平外交思想的重要内容，已多次写入联合国决议。"
      },
      "tags": [
        "中国特色社会主义",
        "外交",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_028",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_3",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "每个人都可以根据自己的兴趣选择职业，不需考虑社会需要。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "B",
        "explanation": "错误。职业选择应把个人兴趣与社会需要相结合，实现个人价值与社会价值的统一。"
      },
      "tags": [
        "职业道德",
        "职业选择",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_029",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "绿水青山就是金山银山。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "正确。这是习近平生态文明思想的核心理念，强调生态保护与经济发展的辩证统一。"
      },
      "tags": [
        "中国特色社会主义",
        "生态文明",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_030",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_3",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "中职生只要掌握专业技术就够了，不需要提升综合素养。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "B",
        "explanation": "错误。新时代需要德技并修的高素质技术技能人才，综合素养同样重要。"
      },
      "tags": [
        "职业道德",
        "素养",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_031",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "简述社会主义核心价值观的基本内容。",
        "options": [],
        "answer": "国家层面——富强、民主、文明、和谐；社会层面——自由、平等、公正、法治；个人层面——爱国、敬业、诚信、友善。",
        "explanation": "24字核心价值观分三个层面，是当代中国精神的集中体现。"
      },
      "tags": [
        "中国特色社会主义",
        "价值观",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_032",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_3",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "中职生践行职业道德应从哪些方面入手？",
        "options": [],
        "answer": "①爱岗敬业，干一行爱一行；②诚实守信，言行一致；③办事公道，坚持原则；④服务群众，乐于奉献；⑤奉献社会，实现价值。",
        "explanation": "职业道德五条规范是中职生职业素养的核心要求。"
      },
      "tags": [
        "职业道德",
        "规范",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_033",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_2",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "什么是依法治国？其基本要求是什么？",
        "options": [],
        "answer": "依法治国是党领导人民治理国家的基本方略。基本要求：科学立法、严格执法、公正司法、全民守法。",
        "explanation": "十六字方针概括了法治建设的四个关键环节。"
      },
      "tags": [
        "法律",
        "法治",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_034",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "short_answer",
      "difficulty": 3,
      "content": {
        "stem": "简述实践与认识的辩证关系。",
        "options": [],
        "answer": "①实践决定认识——实践是认识的来源、动力、目的和检验标准；②认识对实践有反作用——正确认识指导实践，错误认识阻碍实践。",
        "explanation": "特别要注意认识对实践的反作用，正确理论能指导实践成功。"
      },
      "tags": [
        "哲学",
        "实践观",
        "综合"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_035",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_3",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "中职生如何做一名遵纪守法的好公民？",
        "options": [],
        "answer": "①学习法律知识，增强法治意识；②自觉遵守法律法规和校规校纪；③依法维护自身合法权益；④敢于同违法行为作斗争。",
        "explanation": "学法、守法、用法、护法四个层次递进。"
      },
      "tags": [
        "职业道德",
        "守法",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_036",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "什么是量变和质变？两者关系如何？",
        "options": [],
        "answer": "量变是事物数量的增减，质变是事物根本性质的变化。关系：量变是质变的必要准备，质变是量变的必然结果。",
        "explanation": "量变积累到一定程度必然引起质变，质变又为新的量变开辟道路。"
      },
      "tags": [
        "哲学",
        "辩证法",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_037",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_4",
      "type": "short_answer",
      "difficulty": 3,
      "content": {
        "stem": "青少年如何保持心理健康？",
        "options": [],
        "answer": "①正确认识自我，悦纳自己；②学会调节情绪，合理宣泄；③建立良好人际关系；④培养积极乐观的生活态度；⑤遇到严重困扰主动寻求专业帮助。",
        "explanation": "心理健康是青少年健康成长的重要保障。"
      },
      "tags": [
        "心理健康",
        "方法",
        "综合"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_038",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_2",
      "type": "short_answer",
      "difficulty": 3,
      "content": {
        "stem": "简述犯罪的基本特征。",
        "options": [],
        "answer": "①严重的社会危害性（最本质特征）；②刑事违法性（法律特征）；③应受刑罚处罚性（法律后果）。",
        "explanation": "三个特征缺一不可，社会危害性是定罪的核心依据。"
      },
      "tags": [
        "法律",
        "犯罪",
        "综合"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_039",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "short_answer",
      "difficulty": 2,
      "content": {
        "stem": "新时代中职生应具备怎样的职业理想？",
        "options": [],
        "answer": "①将个人理想融入社会理想；②立志成为高素质技术技能人才；③服务社会、报效祖国；④在实践中不断调整和完善职业规划。",
        "explanation": "职业理想应与社会发展需要相结合。"
      },
      "tags": [
        "中国特色社会主义",
        "理想",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_pol_040",
      "bankId": "bank_politics_1",
      "knowledgePointId": "kp_politics_1",
      "type": "short_answer",
      "difficulty": 3,
      "content": {
        "stem": "\"一带一路\"倡议的核心理念是什么？",
        "options": [],
        "answer": "共商、共建、共享。追求的是发展，崇尚的是共赢，传递的是希望。不以意识形态划界，不搞零和博弈。",
        "explanation": "\"一带一路\"是中国为促进全球共同发展繁荣提供的国际公共产品。"
      },
      "tags": [
        "中国特色社会主义",
        "一带一路",
        "综合"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_001",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Please obey the school rules.\n\n选出划线词的中文意思：obey",
        "options": [
          {
            "key": "A",
            "text": "违反"
          },
          {
            "key": "B",
            "text": "遵守"
          },
          {
            "key": "C",
            "text": "忽视"
          }
        ],
        "answer": "B",
        "explanation": "obey意为\"遵守、服从\"。"
      },
      "tags": [
        "词汇",
        "动词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_002",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "The movie was so exciting that I watched it twice.\n\n选出划线词的中文意思：exciting",
        "options": [
          {
            "key": "A",
            "text": "令人兴奋的"
          },
          {
            "key": "B",
            "text": "无聊的"
          },
          {
            "key": "C",
            "text": "令人疲倦的"
          }
        ],
        "answer": "A",
        "explanation": "exciting意为\"令人兴奋的\"。"
      },
      "tags": [
        "词汇",
        "形容词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_003",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Never give up your dream.\n\n选出划线词的中文意思：Never",
        "options": [
          {
            "key": "A",
            "text": "总是"
          },
          {
            "key": "B",
            "text": "有时"
          },
          {
            "key": "C",
            "text": "永不"
          }
        ],
        "answer": "C",
        "explanation": "Never意为\"永不、决不\"。"
      },
      "tags": [
        "词汇",
        "副词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_004",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "We should protect the environment.\n\n选出划线词的中文意思：protect",
        "options": [
          {
            "key": "A",
            "text": "保护"
          },
          {
            "key": "B",
            "text": "破坏"
          },
          {
            "key": "C",
            "text": "忽视"
          }
        ],
        "answer": "A",
        "explanation": "protect意为\"保护\"。"
      },
      "tags": [
        "词汇",
        "动词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_005",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "She successfully passed the driving test.\n\n选出划线词的中文意思：successfully",
        "options": [
          {
            "key": "A",
            "text": "成功地"
          },
          {
            "key": "B",
            "text": "失败地"
          },
          {
            "key": "C",
            "text": "幸运地"
          }
        ],
        "answer": "A",
        "explanation": "successfully意为\"成功地\"。"
      },
      "tags": [
        "词汇",
        "副词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_006",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "The teacher asked us to review the lesson.\n\n选出划线词的中文意思：review",
        "options": [
          {
            "key": "A",
            "text": "预习"
          },
          {
            "key": "B",
            "text": "复习"
          },
          {
            "key": "C",
            "text": "跳过"
          }
        ],
        "answer": "B",
        "explanation": "review意为\"复习\"。"
      },
      "tags": [
        "词汇",
        "动词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_007",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "He is proud of his son.\n\n选出划线词的中文意思：proud",
        "options": [
          {
            "key": "A",
            "text": "担心的"
          },
          {
            "key": "B",
            "text": "自豪的"
          },
          {
            "key": "C",
            "text": "生气的"
          }
        ],
        "answer": "B",
        "explanation": "be proud of意为\"为……感到自豪\"。"
      },
      "tags": [
        "词汇",
        "形容词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_008",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "The bridge was built in 2010.\n\n选出划线词的中文意思：bridge",
        "options": [
          {
            "key": "A",
            "text": "学校"
          },
          {
            "key": "B",
            "text": "桥梁"
          },
          {
            "key": "C",
            "text": "医院"
          }
        ],
        "answer": "B",
        "explanation": "bridge意为\"桥、桥梁\"。"
      },
      "tags": [
        "词汇",
        "名词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_009",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "The news spread quickly across the town.\n\n选出划线词的中文意思：spread",
        "options": [
          {
            "key": "A",
            "text": "传播"
          },
          {
            "key": "B",
            "text": "停止"
          },
          {
            "key": "C",
            "text": "隐藏"
          }
        ],
        "answer": "A",
        "explanation": "spread意为\"传播、扩散\"。"
      },
      "tags": [
        "词汇",
        "动词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_010",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_1",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Let me introduce my friend to you.\n\n选出划线词的中文意思：introduce",
        "options": [
          {
            "key": "A",
            "text": "介绍"
          },
          {
            "key": "B",
            "text": "邀请"
          },
          {
            "key": "C",
            "text": "拒绝"
          }
        ],
        "answer": "A",
        "explanation": "introduce意为\"介绍\"。"
      },
      "tags": [
        "词汇",
        "动词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_011",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Tom ____ to school by bike every day.",
        "options": [
          {
            "key": "A",
            "text": "go"
          },
          {
            "key": "B",
            "text": "goes"
          },
          {
            "key": "C",
            "text": "going"
          }
        ],
        "answer": "B",
        "explanation": "Tom第三人称单数，一般现在时用goes。"
      },
      "tags": [
        "语法",
        "时态",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_012",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "You ____ smoke here. It is a no-smoking area.",
        "options": [
          {
            "key": "A",
            "text": "can"
          },
          {
            "key": "B",
            "text": "must"
          },
          {
            "key": "C",
            "text": "mustn't"
          }
        ],
        "answer": "C",
        "explanation": "禁烟区用mustn't表示\"禁止\"。"
      },
      "tags": [
        "语法",
        "情态动词",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_013",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "This book is ____ than that one.",
        "options": [
          {
            "key": "A",
            "text": "interesting"
          },
          {
            "key": "B",
            "text": "more interesting"
          },
          {
            "key": "C",
            "text": "most interesting"
          }
        ],
        "answer": "B",
        "explanation": "than提示用比较级，interesting多音节加more。"
      },
      "tags": [
        "语法",
        "比较级",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_014",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "She ____ her homework when I called her.",
        "options": [
          {
            "key": "A",
            "text": "does"
          },
          {
            "key": "B",
            "text": "was doing"
          },
          {
            "key": "C",
            "text": "did"
          }
        ],
        "answer": "B",
        "explanation": "过去某个时间点正在进行的动作用过去进行时。"
      },
      "tags": [
        "语法",
        "时态",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_015",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "There ____ a pen and two books on the desk.",
        "options": [
          {
            "key": "A",
            "text": "is"
          },
          {
            "key": "B",
            "text": "are"
          },
          {
            "key": "C",
            "text": "be"
          }
        ],
        "answer": "A",
        "explanation": "there be就近原则，与最近的名词a pen一致用is。"
      },
      "tags": [
        "语法",
        "主谓一致",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_016",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "I don't know ____ he will come tomorrow.",
        "options": [
          {
            "key": "A",
            "text": "if"
          },
          {
            "key": "B",
            "text": "what"
          },
          {
            "key": "C",
            "text": "where"
          }
        ],
        "answer": "A",
        "explanation": "宾语从句\"是否\"用if/whether，后为完整句子不需要疑问代词。"
      },
      "tags": [
        "语法",
        "从句",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_017",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "The man ____ is standing there is my uncle.",
        "options": [
          {
            "key": "A",
            "text": "who"
          },
          {
            "key": "B",
            "text": "which"
          },
          {
            "key": "C",
            "text": "what"
          }
        ],
        "answer": "A",
        "explanation": "定语从句先行词the man指人，用关系代词who。"
      },
      "tags": [
        "语法",
        "从句",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_018",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "She has ____ been to Beijing twice.",
        "options": [
          {
            "key": "A",
            "text": "yet"
          },
          {
            "key": "B",
            "text": "already"
          },
          {
            "key": "C",
            "text": "never"
          }
        ],
        "answer": "B",
        "explanation": "already用于肯定句表示\"已经\"，yet用于否定/疑问句。"
      },
      "tags": [
        "语法",
        "时态",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_019",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "I enjoy ____ basketball after school.",
        "options": [
          {
            "key": "A",
            "text": "play"
          },
          {
            "key": "B",
            "text": "to play"
          },
          {
            "key": "C",
            "text": "playing"
          }
        ],
        "answer": "C",
        "explanation": "enjoy后接动词-ing形式，enjoy doing sth.。"
      },
      "tags": [
        "语法",
        "非谓语",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_020",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_2",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "____ beautiful the flower is!",
        "options": [
          {
            "key": "A",
            "text": "What"
          },
          {
            "key": "B",
            "text": "How"
          },
          {
            "key": "C",
            "text": "What a"
          }
        ],
        "answer": "B",
        "explanation": "感叹句How+形容词+主语+谓语！What修饰名词。"
      },
      "tags": [
        "语法",
        "感叹句",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_021",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: How are you?\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "How do you do?"
          },
          {
            "key": "B",
            "text": "I'm fine, thank you."
          },
          {
            "key": "C",
            "text": "You're welcome."
          }
        ],
        "answer": "B",
        "explanation": "How are you?是询问身体状况的问候语，回答I'm fine。"
      },
      "tags": [
        "情景交际",
        "问候",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_022",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: Thank you for helping me.\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "Don't say that."
          },
          {
            "key": "B",
            "text": "You're welcome."
          },
          {
            "key": "C",
            "text": "No, thanks."
          }
        ],
        "answer": "B",
        "explanation": "感谢的回应用You're welcome或My pleasure。"
      },
      "tags": [
        "情景交际",
        "感谢",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_023",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: I'm sorry I broke your pen.\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "You're right."
          },
          {
            "key": "B",
            "text": "Never mind."
          },
          {
            "key": "C",
            "text": "Thank you."
          }
        ],
        "answer": "B",
        "explanation": "道歉的回应用Never mind或It doesn't matter。"
      },
      "tags": [
        "情景交际",
        "道歉",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_024",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: Shall we go shopping this afternoon?\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "Good idea!"
          },
          {
            "key": "B",
            "text": "You're welcome."
          },
          {
            "key": "C",
            "text": "I'm sorry."
          }
        ],
        "answer": "A",
        "explanation": "提建议的回应用Good idea/Sounds great等表示赞同。"
      },
      "tags": [
        "情景交际",
        "建议",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_025",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: May I use your phone?\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "Sure, go ahead."
          },
          {
            "key": "B",
            "text": "See you later."
          },
          {
            "key": "C",
            "text": "That's all right."
          }
        ],
        "answer": "A",
        "explanation": "请求允许May I...?肯定回答用Sure/Certainly/Of course。"
      },
      "tags": [
        "情景交际",
        "请求",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_026",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: How often do you exercise?\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "In the morning."
          },
          {
            "key": "B",
            "text": "Once a week."
          },
          {
            "key": "C",
            "text": "For two hours."
          }
        ],
        "answer": "B",
        "explanation": "How often问频率，用Once a week/Twice a month等回答。"
      },
      "tags": [
        "情景交际",
        "频率",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_027",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: What's the weather like today?\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "It's sunny."
          },
          {
            "key": "B",
            "text": "It's Monday."
          },
          {
            "key": "C",
            "text": "It's June."
          }
        ],
        "answer": "A",
        "explanation": "问天气用It's sunny/rainy/cloudy等描述。"
      },
      "tags": [
        "情景交际",
        "天气",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_028",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: What do you usually do on weekends?\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "I played football."
          },
          {
            "key": "B",
            "text": "I usually read books."
          },
          {
            "key": "C",
            "text": "I will go shopping."
          }
        ],
        "answer": "B",
        "explanation": "usually提示用一般现在时回答习惯性动作。"
      },
      "tags": [
        "情景交际",
        "日常",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_029",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: Would you like some coffee?\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "Yes, please."
          },
          {
            "key": "B",
            "text": "No, I don't."
          },
          {
            "key": "C",
            "text": "Yes, I am."
          }
        ],
        "answer": "A",
        "explanation": "Would you like...?肯定回答Yes, please；否定No, thanks。"
      },
      "tags": [
        "情景交际",
        "邀请",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_030",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_3",
      "type": "single_choice",
      "difficulty": 1,
      "content": {
        "stem": "Speaker A: Good luck with your exam!\nSpeaker B: ____",
        "options": [
          {
            "key": "A",
            "text": "The same to you."
          },
          {
            "key": "B",
            "text": "Thank you."
          },
          {
            "key": "C",
            "text": "That's OK."
          }
        ],
        "answer": "B",
        "explanation": "对祝福的回应是Thank you。"
      },
      "tags": [
        "情景交际",
        "祝福",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_031",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "补全对话：从A-E中选择合适的选项补全对话。\n\nA: Hi, Jack. ____\nB: My favorite sport is basketball.\nA: Do you often play it?\nB: (见选项)\nA: (见选项)\nB: I play it twice a week.\nA: Who do you play with?\nB: (见选项)\nA: (见选项) Maybe I can join you next time.\nB: Of course! You're welcome.",
        "options": [
          {
            "key": "A",
            "text": "Yes, I do. I like playing basketball very much."
          },
          {
            "key": "B",
            "text": "I usually play basketball with my friends."
          },
          {
            "key": "C",
            "text": "What's your favorite sport?"
          },
          {
            "key": "D",
            "text": "How often do you play?"
          },
          {
            "key": "E",
            "text": "Sounds great!"
          }
        ],
        "answer": "C",
        "explanation": "第111空：问\"最喜欢的运动是什么\"引出篮球话题。"
      },
      "tags": [
        "对话",
        "补全",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_032",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "补全对话：从A-E中选择合适的选项补全对话。\n\nA: Hi, Jack. (见选项)\nB: My favorite sport is basketball.\nA: Do you often play it?\nB: ____\nA: (见选项)\nB: I play it twice a week.\nA: Who do you play with?\nB: (见选项)\nA: (见选项) Maybe I can join you next time.\nB: Of course! You're welcome.",
        "options": [
          {
            "key": "A",
            "text": "Yes, I do. I like playing basketball very much."
          },
          {
            "key": "B",
            "text": "I usually play basketball with my friends."
          },
          {
            "key": "C",
            "text": "What's your favorite sport?"
          },
          {
            "key": "D",
            "text": "How often do you play?"
          },
          {
            "key": "E",
            "text": "Sounds great!"
          }
        ],
        "answer": "A",
        "explanation": "第112空：回答\"Do you often play it?\"，用\"Yes, I do...\"。"
      },
      "tags": [
        "对话",
        "补全",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_033",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "补全对话：从A-E中选择合适的选项补全对话。\n\nA: Hi, Jack. (见选项)\nB: My favorite sport is basketball.\nA: Do you often play it?\nB: (见选项)\nA: ____\nB: I play it twice a week.\nA: Who do you play with?\nB: (见选项)\nA: (见选项) Maybe I can join you next time.\nB: Of course! You're welcome.",
        "options": [
          {
            "key": "A",
            "text": "Yes, I do. I like playing basketball very much."
          },
          {
            "key": "B",
            "text": "I usually play basketball with my friends."
          },
          {
            "key": "C",
            "text": "What's your favorite sport?"
          },
          {
            "key": "D",
            "text": "How often do you play?"
          },
          {
            "key": "E",
            "text": "Sounds great!"
          }
        ],
        "answer": "D",
        "explanation": "第113空：对方回答频率，说明问的是\"How often do you play?\"。"
      },
      "tags": [
        "对话",
        "补全",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_034",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "补全对话：从A-E中选择合适的选项补全对话。\n\nA: Hi, Jack. (见选项)\nB: My favorite sport is basketball.\nA: Do you often play it?\nB: (见选项)\nA: (见选项)\nB: I play it twice a week.\nA: Who do you play with?\nB: ____\nA: (见选项) Maybe I can join you next time.\nB: Of course! You're welcome.",
        "options": [
          {
            "key": "A",
            "text": "Yes, I do. I like playing basketball very much."
          },
          {
            "key": "B",
            "text": "I usually play basketball with my friends."
          },
          {
            "key": "C",
            "text": "What's your favorite sport?"
          },
          {
            "key": "D",
            "text": "How often do you play?"
          },
          {
            "key": "E",
            "text": "Sounds great!"
          }
        ],
        "answer": "B",
        "explanation": "第114空：回答\"Who do you play with?\"，用\"I usually play with...\"。"
      },
      "tags": [
        "对话",
        "补全",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_035",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "补全对话：从A-E中选择合适的选项补全对话。\n\nA: Hi, Jack. (见选项)\nB: My favorite sport is basketball.\nA: Do you often play it?\nB: (见选项)\nA: (见选项)\nB: I play it twice a week.\nA: Who do you play with?\nB: (见选项)\nA: ____ Maybe I can join you next time.\nB: Of course! You're welcome.",
        "options": [
          {
            "key": "A",
            "text": "Yes, I do. I like playing basketball very much."
          },
          {
            "key": "B",
            "text": "I usually play basketball with my friends."
          },
          {
            "key": "C",
            "text": "What's your favorite sport?"
          },
          {
            "key": "D",
            "text": "How often do you play?"
          },
          {
            "key": "E",
            "text": "Sounds great!"
          }
        ],
        "answer": "E",
        "explanation": "第115空：回应对方的加入意愿，用\"听起来不错\"。"
      },
      "tags": [
        "对话",
        "补全",
        "提高"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_036",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "阅读下面短文，从A、B、C三个选项中选出最佳选项：\n\nLi Hua is a student from a vocational school in Fujian. She studies nursing and hopes to become a nurse in the future. Every day, she gets up at 6:30 in the morning and goes to school by bus. She has four classes in the morning and two in the afternoon. After school, she often practices nursing skills in the training room. Her teachers say she is very hardworking. Last month, she won first prize in the school nursing skills competition. She believes that with hard work, she can realize her dream of helping patients.\n\nWhat does Li Hua study?",
        "options": [
          {
            "key": "A",
            "text": "Cooking."
          },
          {
            "key": "B",
            "text": "Nursing."
          },
          {
            "key": "C",
            "text": "Computer science."
          }
        ],
        "answer": "B",
        "explanation": "短文第一句明确She studies nursing。"
      },
      "tags": [
        "阅读",
        "细节理解",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_037",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "阅读下面短文，从A、B、C三个选项中选出最佳选项：\n\nLi Hua is a student from a vocational school in Fujian. She studies nursing and hopes to become a nurse in the future. Every day, she gets up at 6:30 in the morning and goes to school by bus. She has four classes in the morning and two in the afternoon. After school, she often practices nursing skills in the training room. Her teachers say she is very hardworking. Last month, she won first prize in the school nursing skills competition. She believes that with hard work, she can realize her dream of helping patients.\n\nHow does Li Hua go to school?",
        "options": [
          {
            "key": "A",
            "text": "On foot."
          },
          {
            "key": "B",
            "text": "By bus."
          },
          {
            "key": "C",
            "text": "By bike."
          }
        ],
        "answer": "B",
        "explanation": "短文中goes to school by bus。"
      },
      "tags": [
        "阅读",
        "细节理解",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_038",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "阅读下面短文，从A、B、C三个选项中选出最佳选项：\n\nLi Hua is a student from a vocational school in Fujian. She studies nursing and hopes to become a nurse in the future. Every day, she gets up at 6:30 in the morning and goes to school by bus. She has four classes in the morning and two in the afternoon. After school, she often practices nursing skills in the training room. Her teachers say she is very hardworking. Last month, she won first prize in the school nursing skills competition. She believes that with hard work, she can realize her dream of helping patients.\n\nHow many classes does Li Hua have in the morning?",
        "options": [
          {
            "key": "A",
            "text": "Two."
          },
          {
            "key": "B",
            "text": "Four."
          },
          {
            "key": "C",
            "text": "Six."
          }
        ],
        "answer": "B",
        "explanation": "短文She has four classes in the morning。"
      },
      "tags": [
        "阅读",
        "细节理解",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_039",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "阅读下面短文，从A、B、C三个选项中选出最佳选项：\n\nLi Hua is a student from a vocational school in Fujian. She studies nursing and hopes to become a nurse in the future. Every day, she gets up at 6:30 in the morning and goes to school by bus. She has four classes in the morning and two in the afternoon. After school, she often practices nursing skills in the training room. Her teachers say she is very hardworking. Last month, she won first prize in the school nursing skills competition. She believes that with hard work, she can realize her dream of helping patients.\n\nWhat did Li Hua win last month?",
        "options": [
          {
            "key": "A",
            "text": "First prize in singing."
          },
          {
            "key": "B",
            "text": "First prize in nursing skills."
          },
          {
            "key": "C",
            "text": "First prize in sports."
          }
        ],
        "answer": "B",
        "explanation": "短文she won first prize in the school nursing skills competition。"
      },
      "tags": [
        "阅读",
        "细节理解",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_eng_040",
      "bankId": "bank_english_1",
      "knowledgePointId": "kp_english_4",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "阅读下面短文，从A、B、C三个选项中选出最佳选项：\n\nLi Hua is a student from a vocational school in Fujian. She studies nursing and hopes to become a nurse in the future. Every day, she gets up at 6:30 in the morning and goes to school by bus. She has four classes in the morning and two in the afternoon. After school, she often practices nursing skills in the training room. Her teachers say she is very hardworking. Last month, she won first prize in the school nursing skills competition. She believes that with hard work, she can realize her dream of helping patients.\n\nWhat is Li Hua's dream?",
        "options": [
          {
            "key": "A",
            "text": "To be a teacher."
          },
          {
            "key": "B",
            "text": "To be a nurse and help patients."
          },
          {
            "key": "C",
            "text": "To be a doctor."
          }
        ],
        "answer": "B",
        "explanation": "短文she can realize her dream of helping patients，她想成为护士。"
      },
      "tags": [
        "阅读",
        "主旨大意",
        "基础"
      ],
      "status": "active"
    },
    {
      "_id": "q_cus_001",
      "bankId": "bank_custom_1",
      "knowledgePointId": "",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "若等差数列 {aₙ} 中，a₁ = 2，d = 3，则 a₅ = ?",
        "options": [
          {
            "key": "A",
            "text": "11"
          },
          {
            "key": "B",
            "text": "14"
          },
          {
            "key": "C",
            "text": "17"
          },
          {
            "key": "D",
            "text": "20"
          }
        ],
        "answer": "B",
        "explanation": "等差数列通项公式：aₙ = a₁ + (n-1)d。a₅ = 2 + (5-1)×3 = 2 + 12 = 14。"
      },
      "tags": [
        "真题",
        "等差数列"
      ],
      "status": "active"
    },
    {
      "_id": "q_cus_002",
      "bankId": "bank_custom_1",
      "knowledgePointId": "",
      "type": "single_choice",
      "difficulty": 2,
      "content": {
        "stem": "直线 y = 2x + 1 的斜率是？",
        "options": [
          {
            "key": "A",
            "text": "1"
          },
          {
            "key": "B",
            "text": "2"
          },
          {
            "key": "C",
            "text": "-1"
          },
          {
            "key": "D",
            "text": "-2"
          }
        ],
        "answer": "B",
        "explanation": "一次函数 y = kx + b 中，k 是斜率。本题中 k = 2，所以斜率为 2。"
      },
      "tags": [
        "真题",
        "直线"
      ],
      "status": "active"
    },
    {
      "_id": "q_cus_003",
      "bankId": "bank_custom_1",
      "knowledgePointId": "",
      "type": "true_false",
      "difficulty": 1,
      "content": {
        "stem": "圆的面积公式为 S = πr²。",
        "options": [
          {
            "key": "A",
            "text": "对"
          },
          {
            "key": "B",
            "text": "错"
          }
        ],
        "answer": "A",
        "explanation": "圆的面积公式确实是 S = πr²，其中 r 为圆的半径。"
      },
      "tags": [
        "真题",
        "几何"
      ],
      "status": "active"
    },
    {
      "_id": "q_cus_004",
      "bankId": "bank_custom_1",
      "knowledgePointId": "",
      "type": "multi_choice",
      "difficulty": 2,
      "content": {
        "stem": "下列函数中，定义域为全体实数 R 的有？（多选）",
        "options": [
          {
            "key": "A",
            "text": "f(x) = x² + 1"
          },
          {
            "key": "B",
            "text": "f(x) = 1/x"
          },
          {
            "key": "C",
            "text": "f(x) = |x|"
          },
          {
            "key": "D",
            "text": "f(x) = √x"
          }
        ],
        "answer": "A,C",
        "explanation": "A: 多项式函数定义域为 R ✓；B: 分母不能为 0 ✗；C: 绝对值函数定义域为 R ✓；D: 被开方数 ≥ 0 ✗。"
      },
      "tags": [
        "真题",
        "定义域"
      ],
      "status": "active"
    },
    {
      "_id": "q_cus_005",
      "bankId": "bank_custom_1",
      "knowledgePointId": "",
      "type": "short_answer",
      "difficulty": 3,
      "content": {
        "stem": "解方程：2(x - 3) = x + 4，并写出解题步骤。",
        "options": [],
        "answer": "x = 10",
        "explanation": "2(x - 3) = x + 4\n→ 2x - 6 = x + 4\n→ 2x - x = 4 + 6\n→ x = 10"
      },
      "tags": [
        "真题",
        "方程"
      ],
      "status": "active"
    }
  ]
};

module.exports = mockData;
