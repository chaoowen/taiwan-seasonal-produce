/**
 * Hand-written knowledge about each crop: the name shown, picking tip, curated peak months, and how it maps
 * to the AFA open data (data/afa-peak-season.json). catalog.ts merges the two.
 *
 * - `afa`: the crop name(s) in the AFA dataset; season months and main counties come from there.
 * - `manual`: crops the AFA dataset does not cover (or covers badly: then `supersedes`); months and origin
 *   are kept by hand.
 * - `peak`: curated peak months (kept for crops verified before the open data); intersected with the AFA
 *   months. Crops without it get their peak from how many places are in season each month.
 */

type Kind = 'vegetable' | 'fruit'

interface ProfileBase {
  id: string
  name: string
  kind: Kind
  tip: string
  peak?: number[]
}

export type CropProfile =
  | (ProfileBase & { afa: string[]; manual?: never })
  | (ProfileBase & {
      manual: { months: number[]; origin: string }
      /** AFA crop names this hand-kept entry replaces, so they are not listed again on their own. */
      supersedes?: string[]
      afa?: never
    })

/** Months from `start` to `end` inclusive, wrapping past December (e.g. 11 → 3). */
function span(start: number, end: number): number[] {
  const length = ((end - start + 12) % 12) + 1
  return Array.from({ length }, (_, i) => ((start - 1 + i) % 12) + 1)
}

export const CROP_PROFILES: CropProfile[] = [
  // Vegetables
  { id: 'cabbage', name: '高麗菜', kind: 'vegetable', afa: ['甘藍'], peak: [12, 1, 2], tip: '葉片包得緊密、拿起來有重量' },
  { id: 'napa', name: '大白菜', kind: 'vegetable', afa: ['結球白菜'], peak: [12, 1], tip: '葉片潔白厚實、底部切口新鮮' },
  { id: 'radish', name: '白蘿蔔', kind: 'vegetable', afa: ['蘿蔔'], peak: [12, 1], tip: '表皮光滑、拿起來沉，代表水分足' },
  { id: 'cauliflower', name: '花椰菜', kind: 'vegetable', afa: ['花椰菜'], peak: [12, 1, 2], tip: '花蕾緊密、沒有黃斑' },
  { id: 'spinach', name: '菠菜', kind: 'vegetable', afa: ['菠菜'], peak: [1], tip: '葉色深綠、根部帶紅' },
  { id: 'crown-daisy', name: '茼蒿', kind: 'vegetable', manual: { months: span(12, 2), origin: '彰化、雲林' }, peak: [1], tip: '莖短葉嫩、沒有開花' },
  { id: 'mustard', name: '長年菜（芥菜）', kind: 'vegetable', afa: ['芥菜'], peak: [1], tip: '葉柄厚實、葉片無蟲孔' },
  { id: 'scallion', name: '青蔥', kind: 'vegetable', afa: ['青蔥'], peak: [12], tip: '蔥白長而紮實、蔥綠挺直' },
  { id: 'carrot', name: '胡蘿蔔', kind: 'vegetable', afa: ['胡蘿蔔'], peak: [2, 3], tip: '顏色橙紅均勻、表皮無裂痕' },
  { id: 'pea', name: '豌豆', kind: 'vegetable', afa: ['豌豆'], peak: [1, 2], tip: '豆莢翠綠飽滿、折斷時清脆' },
  { id: 'celery', name: '芹菜', kind: 'vegetable', afa: ['芹菜'], peak: [12, 1], tip: '莖部挺直、葉片不枯黃' },
  { id: 'onion', name: '洋蔥', kind: 'vegetable', afa: ['洋蔥'], peak: [3, 4], tip: '外皮乾燥有光澤、頂部不發芽' },
  { id: 'garlic', name: '蒜頭', kind: 'vegetable', afa: ['大蒜'], peak: [3], tip: '蒜瓣飽滿、外皮乾淨不潮濕' },
  { id: 'asparagus', name: '蘆筍', kind: 'vegetable', manual: { months: span(3, 10), origin: '彰化、雲林' }, peak: [4, 5], tip: '筍尖緊密、切口不乾' },
  { id: 'pumpkin', name: '南瓜', kind: 'vegetable', manual: { months: span(4, 7), origin: '花蓮、台東' }, peak: [5], tip: '果梗乾燥、敲起來聲音沉' },
  { id: 'bamboo', name: '綠竹筍', kind: 'vegetable', afa: ['綠竹筍'], peak: [6, 7, 8], tip: '筍身彎如牛角、筍尖未出青' },
  { id: 'loofah', name: '絲瓜', kind: 'vegetable', afa: ['絲瓜'], peak: [7], tip: '外皮紋路明顯、拿起來重' },
  { id: 'water-spinach', name: '空心菜', kind: 'vegetable', manual: { months: span(5, 10), origin: '屏東、彰化' }, peak: [7, 8], tip: '莖部翠綠、折斷時清脆' },
  { id: 'sweet-potato-leaf', name: '地瓜葉', kind: 'vegetable', manual: { months: span(5, 10), origin: '全台各地' }, peak: [7, 8], tip: '葉片嫩綠、莖細不老' },
  { id: 'eggplant', name: '茄子', kind: 'vegetable', afa: ['茄子'], peak: [6, 7], tip: '表皮紫黑發亮、蒂頭尖刺明顯' },
  { id: 'bitter-gourd', name: '苦瓜', kind: 'vegetable', afa: ['苦瓜'], peak: [7, 8], tip: '顆粒大而飽滿、顏色白亮' },
  { id: 'wax-gourd', name: '冬瓜', kind: 'vegetable', manual: { months: span(5, 9), origin: '彰化、雲林' }, peak: [7], tip: '表皮有白粉、切面肉厚' },
  { id: 'okra', name: '秋葵', kind: 'vegetable', manual: { months: span(5, 10), origin: '屏東、彰化' }, peak: [7, 8], tip: '長度約一個手掌、表面細毛完整' },
  { id: 'ginger', name: '嫩薑', kind: 'vegetable', manual: { months: span(6, 9), origin: '南投、台東' }, peak: [7], tip: '表皮白嫩帶粉紅、無皺縮' },
  { id: 'lotus-root', name: '蓮藕', kind: 'vegetable', manual: { months: span(7, 10), origin: '台南白河' }, peak: [8, 9], tip: '藕節粗短、孔洞小而勻稱' },
  { id: 'water-bamboo', name: '茭白筍', kind: 'vegetable', afa: ['茭白筍'], peak: [9, 10], tip: '筍身白嫩、底部切口不變色' },
  { id: 'taro', name: '芋頭', kind: 'vegetable', manual: { months: span(9, 12), origin: '台中大甲、屏東' }, peak: [10, 11], tip: '同樣大小挑較輕的，口感較鬆' },
  { id: 'water-caltrop', name: '菱角', kind: 'vegetable', manual: { months: span(9, 11), origin: '台南官田' }, peak: [10], tip: '外殼黑亮、果實飽滿' },
  { id: 'sweet-corn', name: '甜玉米', kind: 'vegetable', manual: { months: span(10, 3), origin: '雲林、嘉義' }, peak: [11, 12], tip: '玉米鬚褐色濕潤、顆粒飽滿' },
  { id: 'makino-bamboo', name: '桂竹筍', kind: 'vegetable', afa: ['桂竹筍'], tip: '筍殼緊包、切口新鮮不乾' },
  { id: 'edamame', name: '毛豆', kind: 'vegetable', afa: ['毛豆'], tip: '豆莢飽滿翠綠、絨毛完整' },
  { id: 'bell-pepper', name: '甜椒', kind: 'vegetable', afa: ['甜椒'], tip: '果皮厚實光亮、蒂頭新鮮不乾' },
  { id: 'arrow-bamboo', name: '箭竹筍', kind: 'vegetable', afa: ['箭竹筍'], tip: '筍身細長嫩綠、折斷時清脆' },
  { id: 'lettuce', name: '美生菜（結球萵苣）', kind: 'vegetable', afa: ['結球萵苣'], tip: '葉球包得緊、切口白淨不變色' },
  { id: 'cucumber', name: '胡瓜（小黃瓜）', kind: 'vegetable', afa: ['胡瓜'], tip: '表皮刺瘤明顯、瓜身硬挺不軟' },
  { id: 'mushroom', name: '菇類', kind: 'vegetable', afa: ['菇類'], tip: '菇傘完整不黏手、根部乾淨無異味' },
  { id: 'chili', name: '辣椒', kind: 'vegetable', afa: ['辣椒'], tip: '色澤鮮亮、蒂頭青綠不乾枯' },
  { id: 'daylily', name: '金針花', kind: 'vegetable', afa: ['金針'], tip: '花苞飽滿未開、色澤鮮黃' },
  { id: 'yardlong-bean', name: '長豇豆（菜豆）', kind: 'vegetable', afa: ['長豇豆'], tip: '豆莢細長均勻、豆粒不明顯凸出' },
  { id: 'ma-bamboo', name: '麻竹筍', kind: 'vegetable', afa: ['麻竹筍'], tip: '筍身短胖、筍尖黃白未出青' },

  // Fruits
  { id: 'orange', name: '柳丁', kind: 'fruit', afa: ['柳橙'], peak: [12, 1], tip: '果皮薄而油亮、拿起來沉甸甸' },
  { id: 'ponkan', name: '椪柑', kind: 'fruit', afa: ['椪柑'], peak: [11, 12], tip: '果皮鬆、蒂頭仍帶綠色' },
  { id: 'tankan', name: '桶柑', kind: 'fruit', afa: ['桶柑'], peak: [2], tip: '皮色橙紅、果實紮實' },
  { id: 'murcott', name: '茂谷柑', kind: 'fruit', afa: ['茂谷柑'], peak: [2, 3], tip: '表皮光滑、手感重' },
  { id: 'strawberry', name: '草莓', kind: 'fruit', afa: ['草莓'], peak: [1, 2, 3], tip: '果實全紅、蒂頭翠綠不乾枯' },
  { id: 'wax-apple', name: '蓮霧', kind: 'fruit', afa: ['蓮霧'], peak: [1, 2, 3], tip: '底部臍口張開、顏色深紅' },
  { id: 'cherry-tomato', name: '小番茄', kind: 'fruit', afa: ['番茄'], peak: [1, 2, 3], tip: '果皮緊實有光澤、蒂頭新鮮' },
  { id: 'jujube', name: '蜜棗', kind: 'fruit', afa: ['棗'], peak: [1, 2], tip: '果皮淡綠帶白、沒有傷痕' },
  { id: 'loquat', name: '枇杷', kind: 'fruit', afa: ['枇杷'], peak: [3, 4], tip: '絨毛完整、果皮橙黃無斑' },
  { id: 'mulberry', name: '桑椹', kind: 'fruit', manual: { months: span(3, 4), origin: '苗栗、花蓮' }, peak: [3], tip: '顏色紫黑、果粒完整' },
  { id: 'plum', name: '梅子', kind: 'fruit', afa: ['青梅'], peak: [4], tip: '果皮青綠無斑點，適合醃漬' },
  // Kept by hand: in the AFA data the main pineapple areas (屏東, 臺南) have rows without a month, which
  // the sync drops, leaving only 南投/彰化 in June–October.
  { id: 'pineapple', name: '鳳梨', kind: 'fruit', manual: { months: span(3, 7), origin: '屏東、台南關廟' }, supersedes: ['鳳梨'], peak: [5, 6], tip: '葉片翠綠、拍打聲音沉實' },
  { id: 'prune', name: '李子', kind: 'fruit', afa: ['李'], peak: [6], tip: '果粉均勻、果實硬中帶軟' },
  { id: 'mango', name: '芒果', kind: 'fruit', afa: ['芒果'], peak: [6, 7], tip: '果皮光滑有果香、蒂頭周圍略軟' },
  { id: 'lychee', name: '荔枝', kind: 'fruit', afa: ['荔枝'], peak: [6], tip: '果殼紅而平整、蒂頭新鮮' },
  { id: 'watermelon', name: '西瓜', kind: 'fruit', afa: ['西瓜'], peak: [6, 7], tip: '拍打聲清脆、瓜紋清晰' },
  { id: 'grape', name: '葡萄', kind: 'fruit', afa: ['葡萄'], peak: [7], tip: '果粉均勻、果粒飽滿不掉粒' },
  { id: 'passion-fruit', name: '百香果', kind: 'fruit', afa: ['百香果'], peak: [7, 8, 9], tip: '果皮略皺代表熟透、香氣較濃' },
  { id: 'dragon-fruit', name: '火龍果', kind: 'fruit', afa: ['紅龍果'], peak: [8, 9], tip: '果皮鮮紅、鱗片青綠' },
  { id: 'longan', name: '龍眼', kind: 'fruit', afa: ['龍眼'], peak: [8], tip: '果殼黃褐飽滿、成串完整' },
  { id: 'lemon', name: '檸檬', kind: 'fruit', afa: ['檸檬'], peak: [8], tip: '表皮光滑、果皮薄較多汁' },
  { id: 'pear', name: '水梨', kind: 'fruit', afa: ['高接梨', '溫帶梨'], peak: [8, 9], tip: '果皮光滑、手感沉重' },
  { id: 'avocado', name: '酪梨', kind: 'fruit', afa: ['酪梨'], peak: [9, 10], tip: '外皮轉深、輕按微軟即可食用' },
  { id: 'pomelo', name: '文旦柚', kind: 'fruit', afa: ['文旦柚'], peak: [9], tip: '底部寬平、放幾天「消水」更甜' },
  { id: 'sugar-apple', name: '釋迦', kind: 'fruit', afa: ['番荔枝'], peak: [10, 11], tip: '鱗目飽滿、表面不發黑' },
  { id: 'persimmon', name: '柿子', kind: 'fruit', afa: ['柿子'], peak: [10, 11], tip: '果蒂完整貼合、色澤橙紅均勻' },
  { id: 'starfruit', name: '楊桃', kind: 'fruit', afa: ['楊桃'], peak: [11, 12], tip: '稜邊翠綠、果色金黃' },
  { id: 'banana', name: '香蕉', kind: 'fruit', afa: ['香蕉'], peak: [], tip: '果皮出現小黑點時最香甜' },
  { id: 'guava', name: '芭樂', kind: 'fruit', afa: ['番石榴'], peak: [], tip: '表皮淡綠帶光澤、果實紮實' },
  { id: 'papaya', name: '木瓜', kind: 'fruit', afa: ['木瓜'], peak: [], tip: '果皮由綠轉黃、輕按略軟' },
  { id: 'coconut', name: '椰子', kind: 'fruit', afa: ['椰子'], tip: '搖晃有水聲、殼面無裂痕' },
  { id: 'peach', name: '水蜜桃', kind: 'fruit', afa: ['水蜜桃'], tip: '果皮絨毛完整、有香氣、輕按微軟' },
  { id: 'honey-peach', name: '甜蜜桃', kind: 'fruit', afa: ['甜蜜桃'], tip: '果形圓整、色澤紅潤、果肉紮實' },
  { id: 'melon', name: '甜瓜（香瓜、哈密瓜）', kind: 'fruit', afa: ['甜瓜'], tip: '瓜臍略軟、聞得到香氣' },
  { id: 'grapefruit', name: '葡萄柚', kind: 'fruit', afa: ['葡萄柚'], tip: '果皮薄而光滑、拿起來沉' },
  { id: 'apple', name: '蘋果', kind: 'fruit', afa: ['蘋果'], tip: '果皮緊實有光澤、果梗新鮮' },
  { id: 'kumquat', name: '金柑（金棗）', kind: 'fruit', afa: ['金柑'], tip: '果皮橙黃飽滿、沒有斑點' },
]
