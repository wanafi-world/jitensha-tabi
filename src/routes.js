// ルートのデータ。距離はゲーム用に丸めた目安。
// kind: town（街）/ island（島の道）/ bridge（橋）/ ferry（渡船）
// bridge.type: suspension（吊り橋）/ stayed（斜張橋）/ arch（アーチ橋）/ triple（三連吊り橋）
// scenery: その区間に並ぶ景色の種類
// shop: 休憩できる店と名物（体力の回復量と値段）
// photo: 撮影スポット（at は区間内の位置 0〜1、fame は「いいね」の付きやすさ）

export const ROUTES = [
  {
    id: "shimanami",
    name: "しまなみ海道",
    from: "尾道",
    to: "今治",
    type: "line", // 直進ルート（往復か輪行）
    rinkoFare: 2600, // 今治から尾道へバスで輪行して帰る運賃
    rinkoName: "しまなみライナー（高速バス）",
    summary: "尾道 → 今治・約66km・6つの橋と島をつなぐ",
    available: true,
    segments: [
      { name: "尾道", kind: "town", km: 1.5, scenery: ["houses", "temple"],
        shop: { name: "尾道の商店街", items: [{ name: "尾道ラーメン", price: 800, stamina: 40 }] } },
      { name: "尾道水道（渡船）", kind: "ferry", km: 0.5,
        photo: { name: "尾道水道", at: 0.5, fame: 0.9 } },
      { name: "向島", kind: "island", km: 8, scenery: ["houses", "citrus", "crane"],
        shop: { name: "後藤鉱泉所", items: [{ name: "瓶のマルゴサイダー", price: 200, stamina: 10, drink: true }] } },
      { name: "因島大橋", kind: "bridge", km: 1.3, bridge: { type: "suspension", color: "#e8eef2" },
        photo: { name: "因島大橋", at: 0.45, fame: 1.0 } },
      { name: "因島", kind: "island", km: 9, scenery: ["crane", "citrus", "houses"],
        shop: { name: "はっさく屋", items: [{ name: "はっさく大福", price: 250, stamina: 15 }] } },
      { name: "生口橋", kind: "bridge", km: 0.8, bridge: { type: "stayed", color: "#e8eef2" } },
      { name: "生口島", kind: "island", km: 12, scenery: ["lemon", "beach", "houses"],
        shop: { name: "瀬戸田の港町", items: [{ name: "レモンケーキ", price: 300, stamina: 15 }, { name: "ジェラート", price: 450, stamina: 18 }] },
        photo: { name: "瀬戸田サンセットビーチ", at: 0.6, fame: 1.1 } },
      { name: "多々羅大橋", kind: "bridge", km: 1.5, bridge: { type: "stayed", color: "#dfe8ee" },
        photo: { name: "多々羅大橋", at: 0.5, fame: 1.3 } },
      { name: "大三島", kind: "island", km: 4, scenery: ["torii", "citrus"],
        shop: { name: "道の駅 多々羅しまなみ公園", items: [{ name: "みかんジュース", price: 300, stamina: 12, drink: true }] } },
      { name: "大三島橋", kind: "bridge", km: 0.3, bridge: { type: "arch", color: "#e8eef2" } },
      { name: "伯方島", kind: "island", km: 4, scenery: ["salt", "houses"],
        shop: { name: "伯方の塩の店", items: [{ name: "塩ソフトクリーム", price: 350, stamina: 15 }] } },
      { name: "伯方・大島大橋", kind: "bridge", km: 1.2, bridge: { type: "suspension", color: "#e8eef2" } },
      { name: "大島", kind: "island", km: 12, scenery: ["citrus", "houses", "beach"],
        shop: { name: "よしうみいきいき館", items: [{ name: "海鮮七輪バーベキュー", price: 1500, stamina: 45 }] } },
      { name: "来島海峡大橋", kind: "bridge", km: 4.1, bridge: { type: "triple", color: "#eef2f4" },
        photo: { name: "来島海峡大橋", at: 0.55, fame: 1.5 } },
      { name: "今治", kind: "town", km: 6, scenery: ["houses", "towel"],
        shop: { name: "今治の焼き鳥屋", items: [{ name: "今治焼き鳥", price: 900, stamina: 35 }] },
        photo: { name: "サンライズ糸山", at: 0.08, fame: 1.2 } },
    ],
  },
  { id: "biwaichi", name: "ビワイチ", summary: "琵琶湖一周・約200km・周回", type: "loop", available: false },
  { id: "rinrin", name: "つくば霞ヶ浦りんりんロード", summary: "霞ヶ浦一周・約90km・周回", type: "loop", available: false },
  { id: "fuji5", name: "富士五湖めぐり", summary: "五湖をつなぐ・約100km・周回", type: "loop", available: false },
  { id: "hakone", name: "東京 → 箱根", summary: "国道1号・約90km・直進（往復／輪行）", type: "line", available: false },
];

export const routeById = (id) => ROUTES.find((r) => r.id === id);

// 帰り道用に区間を逆にしたルート
export function reversed(route) {
  const segs = [...route.segments].reverse().map((s) => ({
    ...s,
    photo: s.photo ? { ...s.photo, at: 1 - s.photo.at } : undefined,
  }));
  return { ...route, segments: segs, from: route.to, to: route.from, returning: true };
}

export function totalKm(route) {
  return route.segments.reduce((s, x) => s + x.km, 0);
}
