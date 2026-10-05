type Kind = 'vegetable' | 'fruit'

export interface CatalogItem {
  id: string
  name: string
  kind: Kind
  origin: string
  /** Months (1–12) the item is in season. */
  months: number[]
  /** Peak months: cheapest and best quality, so we recommend buying it. */
  peak: number[]
  tip: string
}

const ALL_YEAR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/** Months from `start` to `end` inclusive, wrapping past December (e.g. 11 → 3). */
function span(start: number, end: number): number[] {
  const length = ((end - start + 12) % 12) + 1
  return Array.from({ length }, (_, i) => ((start - 1 + i) % 12) + 1)
}

/** Tags every entry of a list with its kind. */
function withKind(kind: Kind, items: Omit<CatalogItem, 'kind'>[]): CatalogItem[] {
  return items.map((item) => ({ ...item, kind }))
}

const VEGETABLES = withKind('vegetable', [
  { id: 'cabbage', name: '高麗菜', origin: '雲林、彰化', months: span(11, 4), peak: [12, 1, 2], tip: '葉片包得緊密、拿起來有重量' },
  { id: 'napa', name: '大白菜', origin: '雲林、彰化', months: span(11, 3), peak: [12, 1], tip: '葉片潔白厚實、底部切口新鮮' },
  { id: 'radish', name: '白蘿蔔', origin: '雲林、彰化', months: span(11, 3), peak: [12, 1], tip: '表皮光滑、拿起來沉，代表水分足' },
  { id: 'cauliflower', name: '花椰菜', origin: '彰化、雲林', months: span(11, 3), peak: [12, 1, 2], tip: '花蕾緊密、沒有黃斑' },
  { id: 'spinach', name: '菠菜', origin: '雲林、彰化', months: span(11, 3), peak: [1], tip: '葉色深綠、根部帶紅' },
  { id: 'crown-daisy', name: '茼蒿', origin: '彰化、雲林', months: span(12, 2), peak: [1], tip: '莖短葉嫩、沒有開花' },
  { id: 'mustard', name: '長年菜（芥菜）', origin: '彰化、雲林', months: span(12, 2), peak: [1], tip: '葉柄厚實、葉片無蟲孔' },
  { id: 'scallion', name: '青蔥', origin: '宜蘭三星、雲林', months: span(11, 3), peak: [12], tip: '蔥白長而紮實、蔥綠挺直' },
  { id: 'carrot', name: '胡蘿蔔', origin: '雲林、彰化', months: span(12, 4), peak: [2, 3], tip: '顏色橙紅均勻、表皮無裂痕' },
  { id: 'pea', name: '豌豆', origin: '彰化、雲林', months: span(11, 3), peak: [1, 2], tip: '豆莢翠綠飽滿、折斷時清脆' },
  { id: 'celery', name: '芹菜', origin: '彰化、雲林', months: span(11, 3), peak: [12, 1], tip: '莖部挺直、葉片不枯黃' },
  { id: 'onion', name: '洋蔥', origin: '屏東恆春', months: span(2, 4), peak: [3, 4], tip: '外皮乾燥有光澤、頂部不發芽' },
  { id: 'garlic', name: '蒜頭', origin: '雲林', months: span(2, 4), peak: [3], tip: '蒜瓣飽滿、外皮乾淨不潮濕' },
  { id: 'asparagus', name: '蘆筍', origin: '彰化、雲林', months: span(3, 10), peak: [4, 5], tip: '筍尖緊密、切口不乾' },
  { id: 'pumpkin', name: '南瓜', origin: '花蓮、台東', months: span(4, 7), peak: [5], tip: '果梗乾燥、敲起來聲音沉' },
  { id: 'bamboo', name: '綠竹筍', origin: '新北、台北', months: span(5, 9), peak: [6, 7, 8], tip: '筍身彎如牛角、筍尖未出青' },
  { id: 'loofah', name: '絲瓜', origin: '屏東、高雄', months: span(5, 9), peak: [7], tip: '外皮紋路明顯、拿起來重' },
  { id: 'water-spinach', name: '空心菜', origin: '屏東、彰化', months: span(5, 10), peak: [7, 8], tip: '莖部翠綠、折斷時清脆' },
  { id: 'sweet-potato-leaf', name: '地瓜葉', origin: '全台各地', months: span(5, 10), peak: [7, 8], tip: '葉片嫩綠、莖細不老' },
  { id: 'eggplant', name: '茄子', origin: '屏東、高雄', months: span(5, 10), peak: [6, 7], tip: '表皮紫黑發亮、蒂頭尖刺明顯' },
  { id: 'bitter-gourd', name: '苦瓜', origin: '屏東、高雄', months: span(5, 9), peak: [7, 8], tip: '顆粒大而飽滿、顏色白亮' },
  { id: 'wax-gourd', name: '冬瓜', origin: '彰化、雲林', months: span(5, 9), peak: [7], tip: '表皮有白粉、切面肉厚' },
  { id: 'okra', name: '秋葵', origin: '屏東、彰化', months: span(5, 10), peak: [7, 8], tip: '長度約一個手掌、表面細毛完整' },
  { id: 'ginger', name: '嫩薑', origin: '南投、台東', months: span(6, 9), peak: [7], tip: '表皮白嫩帶粉紅、無皺縮' },
  { id: 'lotus-root', name: '蓮藕', origin: '台南白河', months: span(7, 10), peak: [8, 9], tip: '藕節粗短、孔洞小而勻稱' },
  { id: 'water-bamboo', name: '茭白筍', origin: '南投埔里', months: span(5, 10), peak: [9, 10], tip: '筍身白嫩、底部切口不變色' },
  { id: 'taro', name: '芋頭', origin: '台中大甲、屏東', months: span(9, 12), peak: [10, 11], tip: '同樣大小挑較輕的，口感較鬆' },
  { id: 'water-caltrop', name: '菱角', origin: '台南官田', months: span(9, 11), peak: [10], tip: '外殼黑亮、果實飽滿' },
  { id: 'sweet-corn', name: '甜玉米', origin: '雲林、嘉義', months: span(10, 3), peak: [11, 12], tip: '玉米鬚褐色濕潤、顆粒飽滿' },
])

const FRUITS = withKind('fruit', [
  { id: 'orange', name: '柳丁', origin: '雲林古坑、台南', months: span(11, 3), peak: [12, 1], tip: '果皮薄而油亮、拿起來沉甸甸' },
  { id: 'ponkan', name: '椪柑', origin: '新竹、苗栗', months: span(11, 1), peak: [11, 12], tip: '果皮鬆、蒂頭仍帶綠色' },
  { id: 'tankan', name: '桶柑', origin: '新竹、苗栗', months: span(1, 3), peak: [2], tip: '皮色橙紅、果實紮實' },
  { id: 'murcott', name: '茂谷柑', origin: '台南、嘉義', months: span(1, 3), peak: [2, 3], tip: '表皮光滑、手感重' },
  { id: 'strawberry', name: '草莓', origin: '苗栗大湖', months: span(12, 4), peak: [1, 2, 3], tip: '果實全紅、蒂頭翠綠不乾枯' },
  { id: 'wax-apple', name: '蓮霧', origin: '屏東', months: span(12, 4), peak: [1, 2, 3], tip: '底部臍口張開、顏色深紅' },
  { id: 'cherry-tomato', name: '小番茄', origin: '高雄美濃、嘉義', months: span(12, 4), peak: [1, 2, 3], tip: '果皮緊實有光澤、蒂頭新鮮' },
  { id: 'jujube', name: '蜜棗', origin: '高雄燕巢', months: span(12, 3), peak: [1, 2], tip: '果皮淡綠帶白、沒有傷痕' },
  { id: 'loquat', name: '枇杷', origin: '台中太平', months: span(2, 4), peak: [3, 4], tip: '絨毛完整、果皮橙黃無斑' },
  { id: 'mulberry', name: '桑椹', origin: '苗栗、花蓮', months: span(3, 4), peak: [3], tip: '顏色紫黑、果粒完整' },
  { id: 'plum', name: '梅子', origin: '南投信義', months: span(3, 4), peak: [4], tip: '果皮青綠無斑點，適合醃漬' },
  { id: 'pineapple', name: '鳳梨', origin: '屏東、台南關廟', months: span(3, 7), peak: [5, 6], tip: '葉片翠綠、拍打聲音沉實' },
  { id: 'prune', name: '李子', origin: '台中梨山', months: span(5, 7), peak: [6], tip: '果粉均勻、果實硬中帶軟' },
  { id: 'mango', name: '芒果', origin: '台南玉井、屏東枋山', months: span(5, 8), peak: [6, 7], tip: '果皮光滑有果香、蒂頭周圍略軟' },
  { id: 'lychee', name: '荔枝', origin: '高雄大樹', months: span(5, 7), peak: [6], tip: '果殼紅而平整、蒂頭新鮮' },
  { id: 'watermelon', name: '西瓜', origin: '花蓮、雲林', months: span(5, 8), peak: [6, 7], tip: '拍打聲清脆、瓜紋清晰' },
  { id: 'grape', name: '葡萄', origin: '彰化大村', months: [6, 7, 8, 12, 1], peak: [7], tip: '果粉均勻、果粒飽滿不掉粒' },
  { id: 'passion-fruit', name: '百香果', origin: '南投埔里', months: span(6, 11), peak: [7, 8, 9], tip: '果皮略皺代表熟透、香氣較濃' },
  { id: 'dragon-fruit', name: '火龍果', origin: '彰化、屏東', months: span(6, 11), peak: [8, 9], tip: '果皮鮮紅、鱗片青綠' },
  { id: 'longan', name: '龍眼', origin: '台南東山、高雄', months: span(7, 9), peak: [8], tip: '果殼黃褐飽滿、成串完整' },
  { id: 'lemon', name: '檸檬', origin: '屏東九如', months: span(7, 9), peak: [8], tip: '表皮光滑、果皮薄較多汁' },
  { id: 'pear', name: '水梨', origin: '台中東勢、梨山', months: span(7, 10), peak: [8, 9], tip: '果皮光滑、手感沉重' },
  { id: 'avocado', name: '酪梨', origin: '台南大內', months: span(7, 11), peak: [9, 10], tip: '外皮轉深、輕按微軟即可食用' },
  { id: 'pomelo', name: '文旦柚', origin: '台南麻豆、花蓮', months: span(8, 9), peak: [9], tip: '底部寬平、放幾天「消水」更甜' },
  { id: 'sugar-apple', name: '釋迦', origin: '台東', months: span(8, 3), peak: [10, 11], tip: '鱗目飽滿、表面不發黑' },
  { id: 'persimmon', name: '柿子', origin: '台中和平、新竹', months: span(9, 12), peak: [10, 11], tip: '果蒂完整貼合、色澤橙紅均勻' },
  { id: 'starfruit', name: '楊桃', origin: '苗栗卓蘭、彰化', months: span(10, 3), peak: [11, 12], tip: '稜邊翠綠、果色金黃' },
  { id: 'banana', name: '香蕉', origin: '高雄旗山、屏東', months: ALL_YEAR, peak: [], tip: '果皮出現小黑點時最香甜' },
  { id: 'guava', name: '芭樂', origin: '高雄燕巢', months: ALL_YEAR, peak: [], tip: '表皮淡綠帶光澤、果實紮實' },
  { id: 'papaya', name: '木瓜', origin: '屏東、台南', months: ALL_YEAR, peak: [], tip: '果皮由綠轉黃、輕按略軟' },
])

export const CATALOG: CatalogItem[] = [...VEGETABLES, ...FRUITS]
