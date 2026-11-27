// ゲーム内データ。価格・性能はゲーム用の目安で、実際の製品の値ではない。
// 性能値は 0〜10 くらいの相対値。weight は kg。

export const PART_SLOTS = [
  { id: "frame", label: "フレーム" },
  { id: "wheels", label: "ホイール" },
  { id: "tires", label: "タイヤ" },
  { id: "group", label: "コンポ" },
  { id: "bar", label: "ハンドル" },
  { id: "saddle", label: "サドル" },
];

export const OUTFIT_SLOTS = [
  { id: "helmet", label: "ヘルメット" },
  { id: "top", label: "トップス" },
  { id: "bottom", label: "ボトムス" },
  { id: "shoes", label: "シューズ" },
];

export const PARTS = [
  // フレーム
  { id: "giant-escape", slot: "frame", brand: "GIANT", name: "ESCAPE R3", price: 0, weight: 2.6, speed: 3, comfort: 6, durability: 7, style: 3, color: "#3a6fd8", accent: "#ffffff", note: "定番クロスバイク。旅の相棒の第一歩。" },
  { id: "anchor-rl6", slot: "frame", brand: "BRIDGESTONE ANCHOR", name: "RL6", price: 98000, weight: 1.9, speed: 5, comfort: 6, durability: 7, style: 5, color: "#c8282e", accent: "#f2f2f2", note: "日本のメーカーらしい素直な乗り味。" },
  { id: "bianchi-nirone", slot: "frame", brand: "Bianchi", name: "Via Nirone 7", price: 120000, weight: 1.8, speed: 5, comfort: 5, durability: 6, style: 8, color: "#7fd3c4", accent: "#1d1d1d", note: "チェレステカラーは映え抜群。" },
  { id: "caad13", slot: "frame", brand: "Cannondale", name: "CAAD13", price: 180000, weight: 1.5, speed: 7, comfort: 4, durability: 6, style: 6, color: "#1c1c1c", accent: "#9be15d", note: "アルミの名作。キビキビ走る。" },
  { id: "domane", slot: "frame", brand: "TREK", name: "Domane SL5", price: 290000, weight: 1.3, speed: 6, comfort: 9, durability: 7, style: 6, color: "#2b3a55", accent: "#e8c547", note: "振動を逃がすロングライド向け。" },
  { id: "surly-lht", slot: "frame", brand: "Surly", name: "Long Haul Trucker", price: 210000, weight: 3.2, speed: 2, comfort: 8, durability: 10, style: 7, color: "#6b7a3a", accent: "#e0d6b8", note: "日本一周もこなすツーリングの鉄。" },
  { id: "tarmac", slot: "frame", brand: "SPECIALIZED", name: "Tarmac SL8", price: 850000, weight: 0.95, speed: 10, comfort: 5, durability: 5, style: 9, color: "#e8e8e8", accent: "#d4232b", note: "勝つためのフレーム。財布は泣く。" },

  // ホイール
  { id: "wh-rs100", slot: "wheels", brand: "SHIMANO", name: "WH-RS100", price: 0, weight: 1.9, speed: 3, comfort: 5, durability: 7, style: 3, rim: 2, rimColor: "#2a2a2a", note: "まずはこれで十分。" },
  { id: "racing5", slot: "wheels", brand: "Fulcrum", name: "Racing 5", price: 38000, weight: 1.65, speed: 5, comfort: 5, durability: 7, style: 5, rim: 3, rimColor: "#1b1b1b", note: "最初のホイール交換の鉄板。" },
  { id: "ksyrium", slot: "wheels", brand: "MAVIC", name: "Ksyrium S", price: 85000, weight: 1.55, speed: 7, comfort: 4, durability: 6, style: 6, rim: 3, rimColor: "#d8d8d8", note: "シルバーリムがノスタルジック。" },
  { id: "bora", slot: "wheels", brand: "Campagnolo", name: "BORA WTO 45", price: 330000, weight: 1.4, speed: 10, comfort: 4, durability: 5, style: 10, rim: 5, rimColor: "#141414", note: "ディープリムの風切り音。向かい風には注意。" },

  // タイヤ
  { id: "pasela", slot: "tires", brand: "Panaracer", name: "パセラ 28C", price: 0, weight: 0.6, speed: 3, comfort: 6, durability: 6, style: 6, width: 3, tireColor: "#2b2b2b", wall: "#b88a52", note: "あめ色サイドのクラシック。" },
  { id: "gp5000", slot: "tires", brand: "Continental", name: "GRAND PRIX 5000", price: 18000, weight: 0.44, speed: 8, comfort: 5, durability: 5, style: 6, width: 2, tireColor: "#1e1e1e", wall: null, note: "よく転がる。パンクには少し弱い。" },
  { id: "gravelking", slot: "tires", brand: "Panaracer", name: "GravelKing SK", price: 14000, weight: 0.8, speed: 4, comfort: 8, durability: 8, style: 7, width: 4, tireColor: "#262626", wall: "#a37540", note: "砂利道でも安心。" },
  { id: "marathon", slot: "tires", brand: "SCHWALBE", name: "MARATHON PLUS", price: 12000, weight: 1.6, speed: 1, comfort: 6, durability: 10, style: 3, width: 4, tireColor: "#232323", wall: null, note: "ほぼパンクしない。そのぶん重い。" },

  // コンポ
  { id: "claris", slot: "group", brand: "SHIMANO", name: "CLARIS", price: 0, weight: 2.9, speed: 2, comfort: 5, durability: 7, style: 2, metal: "#9aa0a6", note: "8速。素朴に回る。" },
  { id: "105", slot: "group", brand: "SHIMANO", name: "105", price: 60000, weight: 2.6, speed: 5, comfort: 6, durability: 7, style: 5, metal: "#3c3f44", note: "坂で困らない12速。" },
  { id: "ultegra", slot: "group", brand: "SHIMANO", name: "ULTEGRA", price: 140000, weight: 2.4, speed: 7, comfort: 6, durability: 7, style: 7, metal: "#55585e", note: "変速がスッと決まる。" },
  { id: "rival", slot: "group", brand: "SRAM", name: "RIVAL AXS", price: 150000, weight: 2.5, speed: 7, comfort: 6, durability: 6, style: 8, metal: "#1f1f22", note: "無線変速。未来っぽい。" },
  { id: "duraace", slot: "group", brand: "SHIMANO", name: "DURA-ACE", price: 380000, weight: 2.2, speed: 10, comfort: 6, durability: 6, style: 9, metal: "#2a2c30", note: "頂点。持っているだけでうれしい。" },

  // ハンドル
  { id: "flatbar", slot: "bar", brand: "GIANT", name: "フラットバー", price: 0, weight: 0.3, speed: 2, comfort: 7, durability: 8, style: 3, shape: "flat", tape: "#2a2a2a", note: "楽な姿勢。風は受ける。" },
  { id: "nitto-drop", slot: "bar", brand: "NITTO", name: "B105 ドロップ", price: 9000, weight: 0.35, speed: 6, comfort: 5, durability: 8, style: 7, shape: "drop", tape: "#b88a52", note: "メイドイン日本。革巻きが似合う。" },
  { id: "deda-drop", slot: "bar", brand: "DEDA", name: "ZERO100", price: 16000, weight: 0.27, speed: 7, comfort: 4, durability: 7, style: 6, shape: "drop", tape: "#151515", note: "前傾をとってスピードに乗る。" },
  { id: "bullhorn", slot: "bar", brand: "NITTO", name: "RM-3 ブルホーン", price: 8000, weight: 0.32, speed: 5, comfort: 6, durability: 8, style: 8, shape: "bullhorn", tape: "#a9824f", note: "街乗りにも旅にも。" },

  // サドル
  { id: "velo", slot: "saddle", brand: "VELO", name: "スポーツサドル", price: 0, weight: 0.4, speed: 2, comfort: 6, durability: 7, style: 2, saddleColor: "#202020", note: "付属品。お尻はそのうち慣れる。" },
  { id: "brooks", slot: "saddle", brand: "BROOKS", name: "B17", price: 22000, weight: 0.52, speed: 2, comfort: 9, durability: 9, style: 10, saddleColor: "#7a4a24", note: "革が育つ。旅人の定番。" },
  { id: "slr", slot: "saddle", brand: "Selle Italia", name: "SLR BOOST", price: 28000, weight: 0.18, speed: 6, comfort: 4, durability: 6, style: 6, saddleColor: "#111111", note: "軽さが正義。" },
  { id: "antares", slot: "saddle", brand: "fi'zi:k", name: "ANTARES", price: 18000, weight: 0.23, speed: 5, comfort: 6, durability: 7, style: 7, saddleColor: "#efefef", note: "白サドルはおしゃれの証。" },
];

export const OUTFITS = [
  // ヘルメット
  { id: "kabuto", slot: "helmet", brand: "OGK KABUTO", name: "CANVAS-SPORTS", price: 0, comfort: 6, aero: 3, style: 4, colors: ["#e6e6e6", "#2a2a2a"], note: "日本人の頭の形に合う。" },
  { id: "giro", slot: "helmet", brand: "Giro", name: "AGILIS", price: 16000, comfort: 6, aero: 5, style: 6, colors: ["#e8622c", "#1f1f1f"], note: "目立つオレンジ。" },
  { id: "kask", slot: "helmet", brand: "KASK", name: "PROTONE", price: 38000, comfort: 6, aero: 8, style: 9, colors: ["#141414", "#d9b24c"], note: "プロ集団っぽさ。" },

  // トップス
  { id: "tshirt", slot: "top", brand: "UNIQLO", name: "ドライEX Tシャツ", price: 0, comfort: 5, aero: 2, style: 3, colors: ["#4b7bd1", "#4b7bd1"], note: "とりあえずこれで走れる。" },
  { id: "pearl-jersey", slot: "top", brand: "PEARL IZUMI", name: "プリントジャージ", price: 13000, comfort: 7, aero: 6, style: 6, colors: ["#f0c419", "#1d1d1d"], note: "背中のポケットが便利。" },
  { id: "montbell-jersey", slot: "top", brand: "mont-bell", name: "サイクルジャージ", price: 9000, comfort: 8, aero: 5, style: 5, colors: ["#2f8f5b", "#e9e3cf"], note: "旅人の味方。" },
  { id: "rapha-jersey", slot: "top", brand: "Rapha", name: "Pro Team ジャージ", price: 28000, comfort: 7, aero: 8, style: 10, colors: ["#d8417a", "#161616"], note: "胸のラインで映えが跳ねる。" },

  // ボトムス
  { id: "shorts", slot: "bottom", brand: "UNIQLO", name: "ハーフパンツ", price: 0, comfort: 4, aero: 2, style: 3, colors: ["#5d5a52", "#5d5a52"], note: "長距離ではお尻が痛い。" },
  { id: "pearl-pants", slot: "bottom", brand: "PEARL IZUMI", name: "レーサーパンツ", price: 11000, comfort: 8, aero: 6, style: 5, colors: ["#151515", "#151515"], note: "パッドで別世界。" },
  { id: "rapha-bib", slot: "bottom", brand: "Rapha", name: "Pro Team ビブショーツ", price: 32000, comfort: 9, aero: 8, style: 9, colors: ["#1b1b1b", "#d8417a"], note: "一度はいたら戻れない。" },

  // シューズ
  { id: "sneaker", slot: "shoes", brand: "CONVERSE", name: "オールスター", price: 0, comfort: 5, aero: 1, style: 6, colors: ["#f2f2f2", "#c8282e"], note: "フラペで気楽に。" },
  { id: "rc3", slot: "shoes", brand: "SHIMANO", name: "RC3", price: 13000, comfort: 6, aero: 5, style: 5, colors: ["#e9e9e9", "#1a1a1a"], note: "ビンディングデビューに。" },
  { id: "sidi", slot: "shoes", brand: "SIDI", name: "GENIUS 10", price: 34000, comfort: 7, aero: 6, style: 8, colors: ["#d4232b", "#f0f0f0"], note: "イタリアの赤。" },
];

export const ALL_ITEMS = [...PARTS, ...OUTFITS];
export const itemById = (id) => ALL_ITEMS.find((it) => it.id === id);

export const STARTER = {
  money: 30000,
  owned: ALL_ITEMS.filter((it) => it.price === 0).map((it) => it.id),
  bike: { frame: "giant-escape", wheels: "wh-rs100", tires: "pasela", group: "claris", bar: "flatbar", saddle: "velo" },
  outfit: { helmet: "kabuto", top: "tshirt", bottom: "shorts", shoes: "sneaker" },
  followers: 0, // SNSのフォロワー
  likes: 0, // これまでのいいね合計
  earnings: 0, // SNSとバイトで稼いだ合計
  posts: [], // SNSに投稿した写真（新しい順）
  trips: [],
  recycle: null, // リサイクルショップの品ぞろえ
  day: 1, // 旅やバイトをすると1日進む
};
