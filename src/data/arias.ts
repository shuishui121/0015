import type { BanStyleInfo, Aria, BanStyle, BeatPoint, AriaSequence, SequenceSegment, TransitionPoint } from '@/types';

export const BAN_STYLES: Record<BanStyle, BanStyleInfo> = {
  yuanban: {
    id: 'yuanban',
    name: '原板',
    category: 'xipi',
    categoryName: '西皮',
    bpm: 80,
    beatsPerMeasure: 4,
    description: '西皮原板，一板三眼，节奏稳健，多用于叙事抒情',
  },
  manban: {
    id: 'manban',
    name: '慢板',
    category: 'xipi',
    categoryName: '西皮',
    bpm: 50,
    beatsPerMeasure: 4,
    description: '西皮慢板，节奏舒缓，旋律华丽，长于抒情',
  },
  liushui: {
    id: 'liushui',
    name: '流水',
    category: 'xipi',
    categoryName: '西皮',
    bpm: 120,
    beatsPerMeasure: 2,
    description: '西皮流水，节奏明快，字字紧凑，表现激动兴奋情绪',
  },
  kuaiban: {
    id: 'kuaiban',
    name: '快板',
    category: 'xipi',
    categoryName: '西皮',
    bpm: 180,
    beatsPerMeasure: 2,
    description: '西皮快板，节奏极快，字字紧连，表现紧张急促情绪',
  },
  yaoban: {
    id: 'yaoban',
    name: '摇板',
    category: 'xipi',
    categoryName: '西皮',
    bpm: 100,
    beatsPerMeasure: 2,
    description: '西皮摇板，节奏自由，唱腔与伴奏可略有错位',
  },
  erliu: {
    id: 'erliu',
    name: '二六',
    category: 'xipi',
    categoryName: '西皮',
    bpm: 100,
    beatsPerMeasure: 4,
    description: '西皮二六，节奏适中，多用于对话和叙事',
  },
  sipingdiao: {
    id: 'sipingdiao',
    name: '四平调',
    category: 'other',
    categoryName: '四平调',
    bpm: 70,
    beatsPerMeasure: 4,
    description: '四平调，节奏平缓，旋律优美，婉转抒情',
  },
  nanbangzi: {
    id: 'nanbangzi',
    name: '南梆子',
    category: 'other',
    categoryName: '南梆子',
    bpm: 90,
    beatsPerMeasure: 4,
    description: '南梆子，节奏细腻，多用于青衣花旦抒情',
  },
  daoban: {
    id: 'daoban',
    name: '导板',
    category: 'erhuang',
    categoryName: '二黄',
    bpm: 60,
    beatsPerMeasure: 4,
    description: '二黄导板，散板形式，多用于大段唱腔开头',
  },
  kuaiyuanban: {
    id: 'kuaiyuanban',
    name: '快原板',
    category: 'erhuang',
    categoryName: '二黄',
    bpm: 110,
    beatsPerMeasure: 4,
    description: '二黄快原板，节奏紧凑，表现激昂慷慨情绪',
  },
};

function generateBeats(
  bpm: number,
  duration: number,
  beatsPerMeasure: number,
  startTime: number = 0
): BeatPoint[] {
  const beatInterval = 60000 / bpm;
  const beats: BeatPoint[] = [];
  const totalBeats = Math.floor(duration / beatInterval);
  
  for (let i = 0; i < totalBeats; i++) {
    beats.push({
      time: startTime + i * beatInterval,
      type: i % beatsPerMeasure === 0 ? 'ban' : 'yan',
      index: i,
    });
  }
  
  return beats;
}

function createAria(
  id: string,
  title: string,
  opera: string,
  role: string,
  style: BanStyle,
  durationSec: number,
  sections: { name: string; startSec: number; endSec: number; lyrics?: string }[],
  difficulty: 'basic' | 'intermediate' | 'advanced'
): Aria {
  const styleInfo = BAN_STYLES[style];
  const beats = generateBeats(styleInfo.bpm, durationSec * 1000, styleInfo.beatsPerMeasure);
  
  return {
    id,
    title,
    opera,
    role,
    style,
    totalDuration: durationSec * 1000,
    beats,
    sections: sections.map(s => ({
      ...s,
      startTime: s.startSec * 1000,
      endTime: s.endSec * 1000,
    })),
    difficulty,
  };
}

export const ARIAS: Aria[] = [
  createAria(
    'guifei-zuijiu-sipingdiao',
    '《贵妃醉酒》四平调',
    '贵妃醉酒',
    '杨贵妃',
    'sipingdiao',
    45,
    [
      { name: '引子', startSec: 0, endSec: 6, lyrics: '海岛冰轮初转腾' },
      { name: '第一段', startSec: 6, endSec: 18, lyrics: '见玉兔，玉兔又早东升' },
      { name: '第二段', startSec: 18, endSec: 30, lyrics: '那冰轮离海岛，乾坤分外明' },
      { name: '第三段', startSec: 30, endSec: 45, lyrics: '皓月当空，恰便似嫦娥离月宫' },
    ],
    'intermediate'
  ),
  createAria(
    'kongchengji-erliu',
    '《空城计》西皮二六',
    '空城计',
    '诸葛亮',
    'erliu',
    52,
    [
      { name: '开头', startSec: 0, endSec: 8, lyrics: '我本是卧龙岗散淡的人' },
      { name: '第一段', startSec: 8, endSec: 20, lyrics: '评阴阳如反掌保定乾坤' },
      { name: '第二段', startSec: 20, endSec: 34, lyrics: '先帝爷下南阳御驾三请，算就了汉家业鼎足三分' },
      { name: '第三段', startSec: 34, endSec: 45, lyrics: '官封到武乡侯执掌帅印，东西南北征博古通今' },
      { name: '结尾', startSec: 45, endSec: 52, lyrics: '闲无事在敌楼亮一亮琴音' },
    ],
    'advanced'
  ),
  createAria(
    'bawangbieji-nanbangzi',
    '《霸王别姬》南梆子',
    '霸王别姬',
    '虞姬',
    'nanbangzi',
    38,
    [
      { name: '引子', startSec: 0, endSec: 6, lyrics: '看大王在帐中合衣睡稳' },
      { name: '第一段', startSec: 6, endSec: 16, lyrics: '我这里出帐外且散愁情' },
      { name: '第二段', startSec: 16, endSec: 28, lyrics: '轻移步走向前荒郊站定，猛抬头见碧落月色清明' },
      { name: '第三段', startSec: 28, endSec: 38, lyrics: '适听得众兵丁闲谈议论，口声声露出了离散之情' },
    ],
    'intermediate'
  ),
  createAria(
    'yutangchun-liushui',
    '《玉堂春》西皮流水',
    '玉堂春',
    '苏三',
    'liushui',
    36,
    [
      { name: '开头', startSec: 0, endSec: 6, lyrics: '苏三离了洪桐县' },
      { name: '第一段', startSec: 6, endSec: 14, lyrics: '将身来在大街前' },
      { name: '第二段', startSec: 14, endSec: 22, lyrics: '未曾开言我心内惨，过往的君子听我言' },
      { name: '第三段', startSec: 22, endSec: 30, lyrics: '哪一位去往南京转，与我那三郎把信传' },
      { name: '结尾', startSec: 30, endSec: 36, lyrics: '言说苏三把命断，来生变犬马我当报还' },
    ],
    'intermediate'
  ),
  createAria(
    'zhameian-yuanban',
    '《铡美案》西皮原板',
    '铡美案',
    '包拯',
    'yuanban',
    42,
    [
      { name: '导板', startSec: 0, endSec: 6, lyrics: '驸马爷近前看端详' },
      { name: '第一段', startSec: 6, endSec: 18, lyrics: '上写着秦香莲三十二岁状告当朝驸马郎' },
      { name: '第二段', startSec: 18, endSec: 30, lyrics: '欺君王瞒皇上，悔婚男儿招东床' },
      { name: '第三段', startSec: 30, endSec: 42, lyrics: '杀妻灭子良心丧，逼死韩琪在庙堂' },
    ],
    'advanced'
  ),
  createAria(
    'silangtanmu-manban',
    '《四郎探母》西皮慢板',
    '四郎探母',
    '铁镜公主',
    'manban',
    48,
    [
      { name: '引子', startSec: 0, endSec: 8, lyrics: '芍药开牡丹放花红一片' },
      { name: '第一段', startSec: 8, endSec: 20, lyrics: '艳阳天春光好百鸟声喧' },
      { name: '第二段', startSec: 20, endSec: 34, lyrics: '我本是女娇娥又不是男儿汉，为什么穿军装绕在街前' },
      { name: '第三段', startSec: 34, endSec: 48, lyrics: '莫不是我驸马露出破绽，因此上乔装扮来在宫前' },
    ],
    'intermediate'
  ),
  createAria(
    'suolinang-manban',
    '《锁麟囊》二黄慢板',
    '锁麟囊',
    '薛湘灵',
    'manban',
    50,
    [
      { name: '引子', startSec: 0, endSec: 8, lyrics: '一霎时把七情俱已昧尽' },
      { name: '第一段', startSec: 8, endSec: 20, lyrics: '参透了酸辛处泪湿衣襟' },
      { name: '第二段', startSec: 20, endSec: 34, lyrics: '我只道铁富贵一生铸定，又谁知人生数顷刻分明' },
      { name: '第三段', startSec: 34, endSec: 50, lyrics: '想当年我也曾撒娇使性，到今朝哪怕我不信前尘' },
    ],
    'advanced'
  ),
  createAria(
    'wenzhaoguan-kuaiyuanban',
    '《文昭关》二黄快原板',
    '文昭关',
    '伍子胥',
    'kuaiyuanban',
    40,
    [
      { name: '开头', startSec: 0, endSec: 8, lyrics: '心中有事难合眼' },
      { name: '第一段', startSec: 8, endSec: 18, lyrics: '翻来覆去睡不安' },
      { name: '第二段', startSec: 18, endSec: 28, lyrics: '背地里只把东皋公怨，叫人难解巧机关' },
      { name: '第三段', startSec: 28, endSec: 40, lyrics: '伍员在头上换儒巾，乔装改扮往东行' },
    ],
    'advanced'
  ),
  createAria(
    'zhuofangcao-yuanban',
    '《捉放曹》二黄原板',
    '捉放曹',
    '陈宫',
    'yuanban',
    44,
    [
      { name: '引子', startSec: 0, endSec: 8, lyrics: '听他言吓得我心惊胆怕' },
      { name: '第一段', startSec: 8, endSec: 20, lyrics: '背转身自埋怨我自己做差' },
      { name: '第二段', startSec: 20, endSec: 32, lyrics: '我先前只望他宽宏量大，却原来贼是个不义的冤家' },
      { name: '第三段', startSec: 32, endSec: 44, lyrics: '这时候我只得暂且忍耐在心下，既同行共大事必须要劝解于他' },
    ],
    'intermediate'
  ),
  createAria(
    'muguiying-kuaiban',
    '《穆桂英挂帅》西皮快板',
    '穆桂英挂帅',
    '穆桂英',
    'kuaiban',
    32,
    [
      { name: '开头', startSec: 0, endSec: 6, lyrics: '猛听得金鼓响画角声震' },
      { name: '第一段', startSec: 6, endSec: 14, lyrics: '唤起我破天门壮志凌云' },
      { name: '第二段', startSec: 14, endSec: 22, lyrics: '想当年桃花马上威风凛凛，敌血飞溅石榴裙' },
      { name: '第三段', startSec: 22, endSec: 32, lyrics: '有生之日责当尽，寸土怎能够属于他人' },
    ],
    'advanced'
  ),
  createAria(
    'hongniang-liushui',
    '《红娘》西皮流水',
    '红娘',
    '红娘',
    'liushui',
    35,
    [
      { name: '第一段', startSec: 0, endSec: 10, lyrics: '叫张生隐藏在棋盘之下，我步步行来你步步爬' },
      { name: '第二段', startSec: 10, endSec: 20, lyrics: '放大胆忍气吞声休害怕，跟随我小红娘你就能见着她' },
      { name: '第三段', startSec: 20, endSec: 35, lyrics: '可算得是一段风流佳话，听号令且莫要惊动了她' },
    ],
    'intermediate'
  ),
  createAria(
    'qunyinghui-yaoban',
    '《群英会》西皮摇板',
    '群英会',
    '周瑜',
    'yaoban',
    30,
    [
      { name: '第一段', startSec: 0, endSec: 10, lyrics: '诸葛亮出帐去呵呵大笑，他笑我周都督用计不高' },
      { name: '第二段', startSec: 10, endSec: 20, lyrics: '我若是借荆州不把兵交，吴蜀魏鼎足立怎肯相饶' },
      { name: '第三段', startSec: 20, endSec: 30, lyrics: '且退到后帐中再生计巧，必须要杀刘备方除后梢' },
    ],
    'basic'
  ),
  createAria(
    'taiwaizhengzong-yuanban',
    '《岳母刺字》二黄原板',
    '岳母刺字',
    '岳母',
    'yuanban',
    42,
    [
      { name: '引子', startSec: 0, endSec: 8, lyrics: '鹏举儿站草堂听娘言讲' },
      { name: '第一段', startSec: 8, endSec: 20, lyrics: '为娘的言语儿要记心上' },
      { name: '第二段', startSec: 20, endSec: 32, lyrics: '但愿你把肝胆忠心献上，灭金兵保大宋锦绣家邦' },
      { name: '第三段', startSec: 32, endSec: 42, lyrics: '精忠报国四个字刺在儿的背上，愿我儿休忘了我教子的娘' },
    ],
    'intermediate'
  ),
  createAria(
    'dengdian-kuaiban',
    '《登殿》西皮快板',
    '大登殿',
    '王宝钏',
    'kuaiban',
    28,
    [
      { name: '第一段', startSec: 0, endSec: 10, lyrics: '讲什么节孝两双全，女儿言来听根源' },
      { name: '第二段', startSec: 10, endSec: 20, lyrics: '大姐许配苏元帅，二姐许配魏左参' },
      { name: '第三段', startSec: 20, endSec: 28, lyrics: '唯有女儿命苦处，许配平贵那花男' },
    ],
    'basic'
  ),
  createAria(
    'lijinghua-manban',
    '《洛神》二黄慢板',
    '洛神',
    '洛神',
    'manban',
    50,
    [
      { name: '引子', startSec: 0, endSec: 10, lyrics: '屏翳收风天清明，过南岗而北岭兮临乎洛滨' },
      { name: '第一段', startSec: 10, endSec: 24, lyrics: '日忽忽其将暮，感甄妃而伤情，步踟蹰而犹疑兮' },
      { name: '第二段', startSec: 24, endSec: 38, lyrics: '神光离合，乍阴乍阳，竦轻躯以鹤立兮若将飞而未翔' },
      { name: '第三段', startSec: 38, endSec: 50, lyrics: '体迅飞凫，飘忽若神，凌波微步罗袜生尘' },
    ],
    'advanced'
  ),
  createAria(
    'sanchakou-kuaiyuanban',
    '《三岔口》二黄快原板',
    '三岔口',
    '任堂惠',
    'kuaiyuanban',
    30,
    [
      { name: '第一段', startSec: 0, endSec: 10, lyrics: '恨奸贼把我牙咬坏，害得我夫妻两分开' },
      { name: '第二段', startSec: 10, endSec: 20, lyrics: '披星戴月往前迈，为找焦赞到此来' },
      { name: '第三段', startSec: 20, endSec: 30, lyrics: '店主东带过了乌骓马，披星戴月往前趱' },
    ],
    'basic'
  ),
  createAria(
    'fenhewan-erliu',
    '《汾河湾》西皮二六',
    '汾河湾',
    '薛仁贵',
    'erliu',
    40,
    [
      { name: '引子', startSec: 0, endSec: 8, lyrics: '家住绛州县龙门' },
      { name: '第一段', startSec: 8, endSec: 18, lyrics: '薛仁贵好命苦无亲无邻' },
      { name: '第二段', startSec: 18, endSec: 28, lyrics: '幼年间父早亡母又丧命，撇下我薛仁贵好不苦情' },
      { name: '第三段', startSec: 28, endSec: 40, lyrics: '在窑中别了柳氏妻身，一去投军有数春' },
    ],
    'intermediate'
  ),
  createAria(
    'wujiaopo-liushui',
    '《武家坡》西皮流水',
    '武家坡',
    '薛平贵',
    'liushui',
    38,
    [
      { name: '开头', startSec: 0, endSec: 6, lyrics: '一马离了西凉界' },
      { name: '第一段', startSec: 6, endSec: 14, lyrics: '不由人一阵阵泪洒胸怀' },
      { name: '第二段', startSec: 14, endSec: 24, lyrics: '青是山绿是水花花世界，薛平贵好一似孤雁归来' },
      { name: '第三段', startSec: 24, endSec: 38, lyrics: '那王允在朝中官居太宰，他把我贫苦人哪放在心怀' },
    ],
    'intermediate'
  ),
  createAria(
    'longfengchengxiang-sipingdiao',
    '《龙凤呈祥》四平调',
    '龙凤呈祥',
    '孙尚香',
    'sipingdiao',
    42,
    [
      { name: '引子', startSec: 0, endSec: 8, lyrics: '昔日梁鸿配孟光' },
      { name: '第一段', startSec: 8, endSec: 18, lyrics: '今朝仙女会襄王' },
      { name: '第二段', startSec: 18, endSec: 30, lyrics: '暗地堪笑我兄长，弄巧成拙是周郎' },
      { name: '第三段', startSec: 30, endSec: 42, lyrics: '但愿得与刘郎同偕往，学一个孟姜女送寒衣到边疆' },
    ],
    'basic'
  ),
  createAria(
    'zhaojunchusai-nanbangzi',
    '《昭君出塞》南梆子',
    '昭君出塞',
    '王昭君',
    'nanbangzi',
    45,
    [
      { name: '引子', startSec: 0, endSec: 8, lyrics: '离别了深宫院泪流满面' },
      { name: '第一段', startSec: 8, endSec: 20, lyrics: '怀抱着琵琶儿扣断了弦' },
      { name: '第二段', startSec: 20, endSec: 32, lyrics: '想故国家园何在，望长城隔断了云山' },
      { name: '第三段', startSec: 32, endSec: 45, lyrics: '这也是汉天子谋猷浅，怎叫我红粉女去和番' },
    ],
    'intermediate'
  ),
  createAria(
    'honghaier-kuaiban',
    '《红孩儿》西皮快板',
    '红孩儿',
    '红孩儿',
    'kuaiban',
    25,
    [
      { name: '第一段', startSec: 0, endSec: 8, lyrics: '哈哈哈哈好呀好，我父王的兵法高' },
      { name: '第二段', startSec: 8, endSec: 16, lyrics: '炼成了三昧火谁人能到，孙悟空虽神通怕我这一招' },
      { name: '第三段', startSec: 16, endSec: 25, lyrics: '将唐僧拿进了火云洞绕，等父王来共享乐逍遥' },
    ],
    'basic'
  ),
];

export const getStyleArias = (style: BanStyle): Aria[] => {
  return ARIAS.filter(a => a.style === style);
};

export const getAriaById = (id: string): Aria | undefined => {
  return ARIAS.find(a => a.id === id);
};

function createSequenceSegment(
  ariaId: string,
  startSec: number,
  endSec: number,
  transitionStyle: 'gradual' | 'abrupt' | 'natural' = 'natural',
  transitionDurationSec: number = 2
): SequenceSegment {
  return {
    id: `${ariaId}-${startSec}-${endSec}`,
    ariaId,
    startTime: startSec * 1000,
    endTime: endSec * 1000,
    transitionStyle,
    transitionDuration: transitionDurationSec * 1000,
  };
}

export const ARIA_SEQUENCES: AriaSequence[] = [
  {
    id: 'erhuang-yuanban-manban',
    title: '二黄原板转慢板',
    description: '练习二黄原板到慢板的舒缓过渡，考验节奏放慢的控制力',
    difficulty: 'intermediate',
    segments: [
      createSequenceSegment('taiwaizhengzong-yuanban', 0, 20, 'gradual', 3),
      createSequenceSegment('suolinang-manban', 8, 30, 'natural', 2),
    ],
    createdAt: Date.now(),
  },
  {
    id: 'xipi-liushui-kuaiban',
    title: '西皮流水转快板',
    description: '练习西皮流水到快板的加速过渡，考验节奏渐快的稳定性',
    difficulty: 'advanced',
    segments: [
      createSequenceSegment('yutangchun-liushui', 0, 20, 'gradual', 2),
      createSequenceSegment('muguiying-kuaiban', 0, 20, 'natural', 2),
    ],
    createdAt: Date.now(),
  },
  {
    id: 'xipi-erliu-liushui-kuaiban',
    title: '西皮二六→流水→快板',
    description: '连续板式转换练习，从二六到流水再到快板，逐级加速',
    difficulty: 'advanced',
    segments: [
      createSequenceSegment('kongchengji-erliu', 8, 25, 'gradual', 2),
      createSequenceSegment('hongniang-liushui', 0, 20, 'gradual', 2),
      createSequenceSegment('dengdian-kuaiban', 0, 20, 'natural', 2),
    ],
    createdAt: Date.now(),
  },
  {
    id: 'xipi-manban-yuanban',
    title: '西皮慢板转原板',
    description: '从慢板到原板的自然过渡，练习节奏适度加快',
    difficulty: 'basic',
    segments: [
      createSequenceSegment('silangtanmu-manban', 8, 28, 'natural', 3),
      createSequenceSegment('zhameian-yuanban', 6, 26, 'natural', 2),
    ],
    createdAt: Date.now(),
  },
  {
    id: 'erhuang-kuaiyuanban-yuanban',
    title: '二黄快原板转原板',
    description: '练习从快原板放慢到原板，考验减速时的稳定性',
    difficulty: 'intermediate',
    segments: [
      createSequenceSegment('wenzhaoguan-kuaiyuanban', 8, 25, 'gradual', 3),
      createSequenceSegment('zhuofangcao-yuanban', 8, 30, 'natural', 2),
    ],
    createdAt: Date.now(),
  },
  {
    id: 'comprehensive-transition',
    title: '综合板式转换练习',
    description: '包含慢板、原板、流水、快板多种板式的综合练习',
    difficulty: 'advanced',
    segments: [
      createSequenceSegment('lijinghua-manban', 10, 28, 'gradual', 3),
      createSequenceSegment('fenhewan-erliu', 8, 25, 'gradual', 2),
      createSequenceSegment('wujiaopo-liushui', 6, 24, 'gradual', 2),
      createSequenceSegment('honghaier-kuaiban', 0, 20, 'natural', 2),
    ],
    createdAt: Date.now(),
  },
];

export const buildSequenceBeats = (sequence: AriaSequence): BeatPoint[] => {
  const beats: BeatPoint[] = [];
  let offsetTime = 0;
  let globalBeatIndex = 0;

  sequence.segments.forEach((segment, segIndex) => {
    const aria = getAriaById(segment.ariaId);
    if (!aria) return;

    const segmentBeats = aria.beats.filter(
      b => b.time >= segment.startTime && b.time < segment.endTime
    );

    const isLastSegment = segIndex === sequence.segments.length - 1;
    const transitionMs = isLastSegment ? 0 : segment.transitionDuration;
    const segmentDuration = segment.endTime - segment.startTime;

    if (!isLastSegment && transitionMs > 0) {
      const nextSegment = sequence.segments[segIndex + 1];
      const nextAria = getAriaById(nextSegment.ariaId);
      const fromStyle = BAN_STYLES[aria.style];
      const toStyle = nextAria ? BAN_STYLES[nextAria.style] : fromStyle;
      
      const fromInterval = 60000 / fromStyle.bpm;
      const toInterval = 60000 / toStyle.bpm;
      const transitionSteps = Math.max(4, Math.floor(transitionMs / Math.min(fromInterval, toInterval)));

      for (let i = 0; i < transitionSteps; i++) {
        const progress = (i + 1) / (transitionSteps + 1);
        const easedProgress = segment.transitionStyle === 'gradual'
          ? progress * progress * (3 - 2 * progress)
          : progress;
        const currentInterval = fromInterval + (toInterval - fromInterval) * easedProgress;
        const beatTime = offsetTime + segmentDuration + i * currentInterval + currentInterval;

        beats.push({
          time: beatTime,
          type: i % fromStyle.beatsPerMeasure === 0 ? 'ban' : 'yan',
          index: globalBeatIndex++,
        });
      }
    }

    segmentBeats.forEach(beat => {
      beats.push({
        time: offsetTime + (beat.time - segment.startTime),
        type: beat.type,
        index: globalBeatIndex++,
      });
    });

    offsetTime += segmentDuration + transitionMs;
  });

  return beats.sort((a, b) => a.time - b.time);
};

export const getSequenceDuration = (sequence: AriaSequence): number => {
  let total = 0;
  sequence.segments.forEach((segment, index) => {
    total += segment.endTime - segment.startTime;
    if (index < sequence.segments.length - 1) {
      total += segment.transitionDuration;
    }
  });
  return total;
};

export const getTransitionPoints = (sequence: AriaSequence): TransitionPoint[] => {
  const points: TransitionPoint[] = [];
  let offsetTime = 0;

  for (let i = 0; i < sequence.segments.length - 1; i++) {
    const currentSegment = sequence.segments[i];
    const nextSegment = sequence.segments[i + 1];
    const currentAria = getAriaById(currentSegment.ariaId);
    const nextAria = getAriaById(nextSegment.ariaId);

    if (currentAria && nextAria) {
      const segmentDuration = currentSegment.endTime - currentSegment.startTime;
      points.push({
        time: offsetTime + segmentDuration,
        fromStyle: currentAria.style,
        toStyle: nextAria.style,
        fromSegmentId: currentSegment.id,
        toSegmentId: nextSegment.id,
        transitionStyle: currentSegment.transitionStyle,
        transitionDuration: currentSegment.transitionDuration,
      });
    }

    offsetTime += (currentSegment.endTime - currentSegment.startTime) + currentSegment.transitionDuration;
  }

  return points;
};

export const getSegmentAtTime = (sequence: AriaSequence, time: number): { segment: SequenceSegment | null; segmentIndex: number; localTime: number } => {
  let offsetTime = 0;

  for (let i = 0; i < sequence.segments.length; i++) {
    const segment = sequence.segments[i];
    const segmentDuration = segment.endTime - segment.startTime;
    const isLast = i === sequence.segments.length - 1;
    const endOffset = offsetTime + segmentDuration + (isLast ? 0 : segment.transitionDuration);

    if (time < endOffset) {
      const localTime = Math.max(0, Math.min(segmentDuration, time - offsetTime)) + segment.startTime;
      return { segment, segmentIndex: i, localTime };
    }

    offsetTime = endOffset;
  }

  const lastSegment = sequence.segments[sequence.segments.length - 1];
  return {
    segment: lastSegment || null,
    segmentIndex: sequence.segments.length - 1,
    localTime: lastSegment ? lastSegment.endTime : 0,
  };
};

export const getSequenceById = (id: string): AriaSequence | undefined => {
  return ARIA_SEQUENCES.find(s => s.id === id);
};

export const getSequencesByDifficulty = (difficulty: AriaSequence['difficulty']): AriaSequence[] => {
  return ARIA_SEQUENCES.filter(s => s.difficulty === difficulty);
};
