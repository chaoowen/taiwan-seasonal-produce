/**
 * How each catalog item is named in the MOA wholesale data (農產品交易行情, 作物名稱).
 *
 * A pattern without "-" matches the crop and all its varieties ("甘藍" → "甘藍-初秋");
 * a pattern with "-" matches that variety only. Imports ("進口") are always skipped,
 * and `exclude` drops varieties whose name contains one of the words (processed or ornamental).
 * Items whose crop is not traded in a given window simply get no price.
 */
export interface MarketNameRule {
  patterns: string[]
  exclude?: string[]
}

export const MARKET_NAMES: Record<string, MarketNameRule> = {
  // Vegetables (TcType N04)
  cabbage: { patterns: ['甘藍-初秋', '甘藍-改良種', '甘藍-改良尖', '甘藍-其他'] },
  napa: { patterns: ['包心白'] },
  radish: { patterns: ['蘿蔔-梅花', '蘿蔔-矸仔'] },
  cauliflower: { patterns: ['花椰菜-白梗', '花椰菜-青梗'] },
  spinach: { patterns: ['菠菜'] },
  'crown-daisy': { patterns: ['茼蒿'] },
  mustard: { patterns: ['芥菜-大芥菜'] },
  scallion: { patterns: ['青蔥-北蔥', '青蔥-日蔥', '青蔥-粉蔥'] },
  carrot: { patterns: ['胡蘿蔔'] },
  pea: { patterns: ['豌豆-甜豌豆', '豌豆-紅花'] },
  celery: { patterns: ['芹菜-白梗', '芹菜-山芹菜', '芹菜-水耕'] },
  onion: { patterns: ['洋蔥-本產'] },
  garlic: { patterns: ['大蒜-蒜頭'] },
  asparagus: { patterns: ['蘆筍-綠蘆筍'] },
  pumpkin: { patterns: ['南瓜'], exclude: ['觀賞'] },
  bamboo: { patterns: ['竹筍-綠竹筍'] },
  loofah: { patterns: ['絲瓜'] },
  'water-spinach': { patterns: ['蕹菜'] },
  'sweet-potato-leaf': { patterns: ['甘薯葉'] },
  eggplant: { patterns: ['茄子'] },
  'bitter-gourd': { patterns: ['苦瓜'] },
  'wax-gourd': { patterns: ['冬瓜'] },
  okra: { patterns: ['黃秋葵'] },
  ginger: { patterns: ['薑-嫩薑'] },
  'lotus-root': { patterns: ['蓮藕'], exclude: ['蓮子'] },
  'water-bamboo': { patterns: ['茭白筍'] },
  taro: { patterns: ['芋-檳榔心芋', '芋-麵芋', '芋-里芋'] },
  'water-caltrop': { patterns: ['菱角'] },
  'sweet-corn': { patterns: ['玉米-甜硬殼', '玉米-甜軟殼', '玉米-超甜白'] },

  // Fruits (TcType N05)
  orange: { patterns: ['甜橙-柳橙'] },
  ponkan: { patterns: ['椪柑'] },
  tankan: { patterns: ['桶柑', '雜柑-桶柑'] },
  murcott: { patterns: ['茂谷柑', '雜柑-茂谷'] },
  strawberry: { patterns: ['草莓'] },
  'wax-apple': { patterns: ['蓮霧'] },
  'cherry-tomato': { patterns: ['小番茄'] },
  jujube: { patterns: ['棗子'] },
  loquat: { patterns: ['枇杷'] },
  mulberry: { patterns: ['桑椹'] },
  plum: { patterns: ['梅'] },
  pineapple: { patterns: ['鳳梨'] },
  prune: { patterns: ['李'] },
  mango: { patterns: ['芒果'], exclude: ['芒果青'] },
  lychee: { patterns: ['荔枝'] },
  watermelon: { patterns: ['西瓜'] },
  grape: { patterns: ['葡萄-巨峰', '葡萄-其他'] },
  'passion-fruit': { patterns: ['百香果'] },
  'dragon-fruit': { patterns: ['紅龍果'] },
  longan: { patterns: ['龍眼'], exclude: ['龍眼乾'] },
  lemon: { patterns: ['雜柑-檸檬', '雜柑-無子檸檬', '雜柑-黃金檸檬'] },
  pear: { patterns: ['梨'], exclude: ['西洋梨', '鳥梨'] },
  avocado: { patterns: ['酪梨'] },
  pomelo: { patterns: ['柚子-文旦'] },
  'sugar-apple': { patterns: ['釋迦'] },
  persimmon: { patterns: ['柿子-甜柿', '柿子-水柿', '柿子-紅柿'] },
  starfruit: { patterns: ['楊桃'] },
  banana: { patterns: ['香蕉'] },
  guava: { patterns: ['番石榴'] },
  papaya: { patterns: ['木瓜'], exclude: ['青木瓜'] },
}

/** Whether a MOA crop name (e.g. "甘藍-初秋") belongs to the item described by `rule`. */
export function matchesMarketName(cropName: string, rule: MarketNameRule): boolean {
  if (cropName.includes('進口')) return false
  if (rule.exclude?.some((word) => cropName.includes(word))) return false
  return rule.patterns.some((pattern) =>
    pattern.includes('-') ? cropName === pattern : cropName === pattern || cropName.startsWith(`${pattern}-`),
  )
}
