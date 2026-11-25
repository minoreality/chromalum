import type { AutomataRule } from "../automata/model";
import type { AutomataPreset } from "../automata/presets";
import type { Language } from "./types";

type ViewingNote = Readonly<Record<Language, string>>;

const blackField: ViewingNote = {
  ja: "第0世代と第64世代を見比べても、中心も四隅も同じ黒です。次の色を生むきっかけになる1点がありません。",
  en: "Compare generations 0 and 64. The center and corners share the same black, with no first point of color to set another alight.",
};

const darkRosette: ViewingNote = {
  ja: "青い芯、斜めの赤、外側の緑を見てから1世代進めると、小花の9点が一度に消えます。",
  en: "Take in the blue center, the diagonal red dots and the outer green tips. All nine lights go out in one step.",
};

const darkCross: ViewingNote = {
  ja: "中心に近い緑から先端の青まで、十字の12点が最初の1世代でいっせいに消えます。",
  en: "From the inner green dots to the blue tips, all twelve lights of the cross go out on the first step.",
};

const whiteField: ViewingNote = {
  ja: "世代を進めても、四隅の白と中心の白は同じ明るさのまま、盤面いっぱいに続いています。",
  en: "Compare a corner with the center as you step forward. The same unbroken white fills the entire view.",
};

const notesByPreset = {
  "overlapping-squares": {
    4: {
      ja: "1世代進めると、三枚が重なった白い中心が黒く抜け、緑・赤・青が四角い面の縁に残ります。",
      en: "Take one step. The white overlap opens into black, and the green, red and blue of the squares trace their edges.",
    },
    5: {
      ja: "左上の緑の辺は外側へ一本伸び、重なりの中心は第1世代でも白く光っています。",
      en: "Look just above the top edge of the green square for a new green line. The central overlap is still white after one step.",
    },
    diagonal: {
      ja: "第1世代には広い色面が消え、それぞれの正方形の四隅に、その色の小さな塊が残ります。",
      en: "After one step, look at the former corners. Each solid square has broken into four little patches of its color.",
    },
    "diagonal-center": {
      ja: "第0世代と第1世代を往復すると、平らな色面の四隅だけに小さな切れ込みと突起が見えます。",
      en: "Step back and forth once. Small notches and protrusions appear at the four corners of each flat square.",
    },
    8: {
      ja: "第8世代の一番上では、7セル幅の緑の横線が、黒い1セルを挟んで3本並びます。",
      en: "At generation 8, look along the very top of the pattern. Three green bars, each seven cells long, sit one black cell apart.",
    },
    9: {
      ja: "三色が重なる中心を追うと、第1世代までは白く、第2世代で黒い穴が開きます。",
      en: "Follow the very center of the overlap. It stays white for the first step, then opens into a black hole on the second.",
    },
    or: {
      ja: "三枚が重なった白い部分に注目すると、世代ごとに白が色の境目を越えて広がります。",
      en: "Start with the small white patch where all three squares overlap. Watch it grow across the original color boundaries.",
    },
    and: {
      ja: "三枚の正方形は縁から細り、第3世代には、それぞれの中心を示す緑・赤・青の1点ずつが残ります。",
      en: "The squares recede from their edges. At generation 3 a single green, red or blue dot marks the center of each one.",
    },
    majority: {
      ja: "角で色が変わる場所を一つ選んでみてください。世代を進めても、三枚のずれも重なりの色もその位置に留まります。",
      en: "Pick a corner where two colors meet. The offset between the three squares and the colors of their overlap hold in place.",
    },
    hamming: {
      ja: "重なりの中心だけを追うと、最初の白は1世代残り、第2世代で緑、第3世代で黄に変わります。",
      en: "Watch the center of the overlap. White holds for one step, turns green at generation 2, then yellow at generation 3.",
    },
    life: {
      ja: "第5世代と第6世代を行き来すると、三枚の広い色面が残した短い線が、向きを交互に変えます。",
      en: "Step between generations 5 and 6. The broad squares have given way to short strokes that alternate in direction.",
    },
    rug: {
      ja: "第1世代で色が正方形のすぐ外側に縁を描き、三色が重なっていた中心は黒く抜けます。",
      en: "In the first step, color outlines each square just beyond its old edges. The former three-color overlap opens into black.",
    },
    seeds: {
      ja: "第1世代と第2世代を見比べると、緑・赤・青の点が、もとの四隅のまわりで二通りの位置を行き来します。",
      en: "Compare generations 1 and 2. Green, red and blue dots alternate between two sets of positions around the former corners.",
    },
    "day-night": {
      ja: "白く重なった中心は、第1世代の白から緑、シアン、また緑へと移ります。",
      en: "The center stays white on the first step. Over the next three it turns green, cyan, then green again.",
    },
  },
  rosette: {
    4: {
      ja: "第1世代では青い芯が黒く抜け、その上下左右にシアンの4点が灯ります。",
      en: "In the first step the blue center goes dark. Four cyan dots light up just above, below and beside it.",
    },
    5: {
      ja: "第8世代では青い芯を目印に、元の小花を中央と上下左右の5か所で見つけられます。",
      en: "At generation 8, use the blue centers to find the original rosette in five places, one in the middle and four around it in a cross.",
    },
    diagonal: {
      ja: "最初の1世代で中央を通る縦横の線が黒く空き、小花の色が斜めの四方に分かれます。",
      en: "One step opens a black cross through the middle, separating the colors of the flower into four diagonal groups.",
    },
    "diagonal-center": {
      ja: "第8世代には、青い芯を持つ小花がさいころの五の目のように並びます。",
      en: "At generation 8 five little flowers with blue centers take the same positions as the five pips on a die.",
    },
    8: {
      ja: "第8世代で、元の一輪と同じ小花が八方に並び、中央には一輪ぶんの黒い空間が空きます。",
      en: "At generation 8 eight copies of the flower surround a dark space just where the first flower stood.",
    },
    9: {
      ja: "第8世代で青い芯を数えると、縦にも横にも3輪ずつ小花が並んでいます。",
      en: "Count the blue centers at generation 8. The same little flower appears in three rows of three.",
    },
    or: {
      ja: "第1世代では青い芯の上下左右に白が灯り、第2世代になると芯そのものも白くなります。",
      en: "White lights up on four sides of the blue center in generation 1. In generation 2 the center itself turns white.",
    },
    and: darkRosette,
    majority: darkRosette,
    hamming: {
      ja: "青い芯の上下左右にシアンが、少し外側には黄が現れ、第1世代の小花に二色が加わります。",
      en: "The first step adds two colors to the flower. Cyan sits on four sides of the blue center, with yellow farther out.",
    },
    life: darkRosette,
    rug: {
      ja: "第1世代で青い芯が赤い十字に変わり、緑の4点はその十字のあいだに収まります。",
      en: "In generation 1 the blue center gives way to a red cross, with four green dots tucked between its arms.",
    },
    seeds: {
      ja: "青い芯が消えてから、赤と緑だけで花の輪郭が数回描き直され、第5世代で黒に戻ります。",
      en: "The blue center disappears. Red and green redraw the flower several times before the last lights go out at generation 5.",
    },
    "day-night": darkRosette,
  },
  corolla: {
    4: {
      ja: "第1世代で十字の四本の腕が太くなり、青い先端の一つ内側には、青に挟まれた赤が見えます。",
      en: "The four arms broaden in generation 1. Look one cell in from each blue tip for a red dot flanked by blue.",
    },
    5: {
      ja: "最初の1世代で、十字の一本の腕に白、マゼンタ、青が中心から外へ順に並びます。",
      en: "After one step, follow an arm outward. A white cell, a magenta cell and a blue tip line up in succession.",
    },
    diagonal: {
      ja: "第1世代では十字があった中央の縦横が黒く抜け、いちばん上の青い先端が左右二つに分かれます。",
      en: "In the first step the two axes of the cross go dark. At the top, the single blue tip splits into a pair.",
    },
    "diagonal-center": {
      ja: "第1世代の中央の横一列には、斜めに開いた色のあいだから元の十字の腕がそのまま見えます。",
      en: "Look along the middle row after one step. The original arms of the cross are still visible between the colors spreading diagonally.",
    },
    8: {
      ja: "第8世代には、中央を囲む八つの十字が、どれも青い先端を上下左右に向けています。",
      en: "At generation 8 eight crosses surround the center, each with its blue tips pointing up, down, left and right.",
    },
    9: {
      ja: "第1世代の上の腕をたどると、白、マゼンタ、青が三つずつ横に並び、色の横帯になります。",
      en: "Follow the upper arm in generation 1. Rows of three white, three magenta and three blue cells form little bands across it.",
    },
    or: {
      ja: "十字の中心には、内側の緑、ひとつ外の赤、先端の青が1世代ずつ遅れて届きます。黒かった1マスが緑、黄、白と変わります。",
      en: "Green, red and blue reach the center one generation apart. The black cell in the cross turns green, then yellow, then white.",
    },
    and: darkCross,
    majority: {
      ja: "第1世代では緑が十字の中心に1点だけ灯り、次の世代にはその点も消えます。",
      en: "One green dot lights up at the very center in generation 1. One more step puts it out.",
    },
    hamming: {
      ja: "第1世代には内側の緑が消え、黒く空いた中心のまわりに赤と青だけで四本の腕が浮かびます。",
      en: "All the green disappears on the first step. Four arms in red and blue stand out around the dark center.",
    },
    life: {
      ja: "1世代進めると赤と青が消え、黒い中心を囲む緑の4点が残ります。その先も、4点は同じ場所に灯り続けます。",
      en: "After one step, red and blue vanish. Four green dots surround the black center and stay lit in those same places.",
    },
    rug: {
      ja: "最初の1世代で細い十字がたたまれ、中央の緑1点と、それを斜めに囲む黄の4点になります。",
      en: "The thin cross folds down in one step to a green center with four yellow dots diagonally around it.",
    },
    seeds: {
      ja: "第1世代では三色の腕が消え、四隅に黄だけが灯ります。第5世代にはその模様も黒に戻ります。",
      en: "Four yellow dots mark the corners of a little square where the three-color arms stood. By generation 5 the pattern has gone dark.",
    },
    "day-night": darkCross,
  },
  luminous: {
    4: {
      ja: "白い芯が最初の1世代で抜け、第8世代には、その白を芯に持つ菱形が上下左右に一つずつ現れます。",
      en: "The white center goes dark in the first step. At generation 8, look for a white-centered diamond in each of the four compass directions.",
    },
    5: {
      ja: "第8世代では中央の菱形を見本に、同じ色順の輪をその上下左右にもたどれます。",
      en: "At generation 8, trace the rings of the central diamond. The same sequence of colors appears above, below, left and right.",
    },
    diagonal: {
      ja: "第8世代で中央を横切る黒い帯の両側に、青い縁の菱形が斜めの四方に一つずつ見えます。",
      en: "At generation 8 a dark band crosses the middle. Four blue-edged diamonds sit on the diagonals beyond it.",
    },
    "diagonal-center": {
      ja: "中央の白を起点に第8世代の対角線をたどると、左右の斜め先にも同じ白い芯が見つかります。",
      en: "Start at the white center in generation 8 and follow either diagonal. Another white-centered diamond waits at each end.",
    },
    8: {
      ja: "第8世代では青で縁取られた八つの菱形が、元の菱形があった黒い空間を囲みます。",
      en: "At generation 8 eight blue-edged diamonds surround a dark space where the first diamond stood.",
    },
    9: {
      ja: "第8世代では白い芯が3行3列に並び、それぞれに青い外周が一周ずつ見えます。",
      en: "At generation 8 the white centers form three rows of three. Trace a separate blue outline around each one.",
    },
    or: {
      ja: "1世代進めると白い芯が面に広がり、中心を横に横切ると、青、マゼンタ、白の順に奥へ入れます。",
      en: "One step opens the white center into a patch. Follow the middle row inward from either edge through blue, magenta and white.",
    },
    and: {
      ja: "何重もあった菱形が、第1世代では緑の芯1点になり、第2世代でその点も消えます。",
      en: "All the rings contract to a single green light in generation 1. A second step puts it out.",
    },
    majority: {
      ja: "白かった芯は緑、赤と一度ずつ色を変え、第3世代で輪も芯もすべて消えます。",
      en: "The white center turns green and then red. By generation 3 both the rings and their center have gone dark.",
    },
    hamming: {
      ja: "最初の1世代で青い外周がほどけます。四方の先端だけは、元の菱形からさらに1セル外に光ります。",
      en: "The blue outer ring breaks up on the first step. At the four tips, blue lights up one cell beyond the original diamond.",
    },
    life: {
      ja: "白かった芯が第1世代で黒く抜け、その斜め四方に白が移って、小さな四角の角を描きます。",
      en: "The white center opens into black in generation 1. Four white dots now mark the corners of a little square around it.",
    },
    rug: {
      ja: "最初に芯が黒く抜け、第2世代ではそこに黄が灯ります。周りの輪と芯が別々の拍で明滅します。",
      en: "The center goes dark on the first step and lights up yellow on the second. Watch the rings change around that returning light.",
    },
    seeds: {
      ja: "第3世代まで進めると、菱形から斜め四方の青い4点だけが残り、もう1世代ですべて消えます。",
      en: "At generation 3 just four blue dots remain, one on each diagonal. They vanish on the next step.",
    },
    "day-night": {
      ja: "最初の1世代で白い芯が黄に変わり、次には白へ戻ります。そのまわりで青い四方の先端が形を変えます。",
      en: "The white center turns yellow for one step, then returns to white. Watch the four blue tips change around it.",
    },
  },
  weave: {
    4: {
      ja: "第1世代で中央のシアンの四角が黒く抜け、白、マゼンタ、青の二筋ずつの線が四方に伸びます。",
      en: "The cyan center opens into a black square on the first step. Four double-width arms run outward through white, magenta and blue.",
    },
    5: {
      ja: "中央のシアン4セルから上下左右へ同じシアンが伸び、第1世代では太い十字の織り目になります。",
      en: "In generation 1, cyan extends from the four middle cells into a thick cross, like threads running in two directions.",
    },
    diagonal: {
      ja: "第1世代で中央のシアン4セルは緑に変わり、黄色とマゼンタが外側に帯を織ります。",
      en: "The four cyan middle cells turn green on the first step, with bands of yellow and magenta woven farther out.",
    },
    "diagonal-center": {
      ja: "最初の1世代では中央が青い四角に変わり、その周りに緑の段が四方へ重なります。",
      en: "After one step the center is a blue square, with green steps laid around it on four sides.",
    },
    8: {
      ja: "最初の1世代で上端の青い2点が左右に分かれ、黒い2マスを挟んで向かい合います。",
      en: "Watch the two blue cells along the very top. After one step they sit on opposite sides of a two-cell gap.",
    },
    9: {
      ja: "第1世代では四つの中央セルが青に変わり、すぐ外側をマゼンタが縁取ります。",
      en: "In generation 1 the four middle cells turn blue, with magenta bordering the little square on four sides.",
    },
    or: {
      ja: "シアンの中心に第1世代で白が入り、白い面が育つにつれて、青い外縁とマゼンタの帯が目立ってきます。",
      en: "White fills the cyan center on the first step. As that white patch grows, look for the blue rim and the magenta band inside it.",
    },
    and: {
      ja: "中央にシアンが4セル固まっていても、1世代進めると織り目は端から芯までいっせいに消えます。",
      en: "Find the four-cell cyan square at the heart of the weave. It goes dark with the rest of the pattern on the first step.",
    },
    majority: {
      ja: "第1世代で赤い帯が消え、青に囲まれたシアンの四角が、それからは動かずに残ります。",
      en: "The red band drops out in generation 1. A cyan square surrounded by blue stays in place from then on.",
    },
    hamming: {
      ja: "中央のシアン4セルを目印にすると、最初に上下左右の青い端だけが、2セル幅のまま外へ伸びます。",
      en: "Take the four cyan middle cells as a landmark. On the first step the blue tips extend outward, two cells wide.",
    },
    life: {
      ja: "青い外縁を追うと、第4世代には青が消え、緑の四角とそれを囲む赤だけが残って静止します。",
      en: "Follow the blue rim. By generation 4 it has disappeared, leaving a still green square framed by red.",
    },
    rug: {
      ja: "第1世代で中央のシアン4セルが赤へ、次に緑へ変わります。外側には青い縁が一段ずつ加わります。",
      en: "The four cyan center cells turn red, then green. Outside them, the blue tips mark each new step outward.",
    },
    seeds: {
      ja: "最初の1世代で中央の4セルが黒く抜け、その空きを囲んで緑、赤、青の帯が外へ開きます。",
      en: "The four middle cells go dark in the first step. Bands of green, red and blue open outward around the hole.",
    },
    "day-night": {
      ja: "第1世代でシアンの四角と斜めの青4点にほどけます。4世代進めて見比べると同じ並びが戻ります。",
      en: "The weave opens into a cyan square with four diagonal blue dots at generation 1. Look again four steps later for the same arrangement.",
    },
  },
  glider: {
    4: {
      ja: "第4世代では初めの模様が上下左右に四つ現れます。どれも緑の先端を上に向けています。",
      en: "At generation 4 the starting shape appears in four places, above, below, left and right. Its green tip points up in every copy.",
    },
    5: {
      ja: "第8世代で上端の緑と下端の青を手がかりにすると、中央にも四方にも同じ向きの模様を見つけられます。",
      en: "At generation 8, use the green top and blue bottom to match the central shape with the four facing the same way around it.",
    },
    diagonal: {
      ja: "第4世代では四つの小さな模様が斜めに離れます。左上と右下を見比べると、色の並びは同じ向きです。",
      en: "Four small shapes sit apart on the diagonals at generation 4. Compare upper left with lower right and match the order of the colors.",
    },
    "diagonal-center": {
      ja: "第4世代で中央に残る小さな模様を見本に、さいころの五の目の位置に同じ配色を探せます。",
      en: "Use the central shape as a guide at generation 4. The same colors sit in the five positions of the pips on a die.",
    },
    8: {
      ja: "第8世代では八つの模様が黒い中心を囲みます。一つずつ上の緑から下の青へたどると、向きがそろっています。",
      en: "Eight shapes ring the dark center at generation 8. Follow any one from its green top to its blue bottom to see their common orientation.",
    },
    9: {
      ja: "第4世代では同じ配色が縦横に三つずつ並び、それぞれの白い2セルが同じ側で光ります。",
      en: "At generation 4 nine copies line up in a square. The pair of white cells in each one shines on the same side.",
    },
    or: {
      ja: "初めは2セルだった白が、最初の1世代で12セルまで広がります。色のついた点はその白い面の縁に見えます。",
      en: "Two white cells become a patch of twelve on the first step. The individual colors stand out along its edge.",
    },
    and: {
      ja: "右側に並ぶ白い2セルも、その周りの小さな色の集まりも、最初の1世代でいっせいに消えます。",
      en: "Find the pair of white cells on the right. They go dark with the little cluster of colors around them on the first step.",
    },
    majority: {
      ja: "模様は8点から4点、2点と半分ずつに減り、第3世代で消えます。",
      en: "Watch the cluster halve from eight lit cells to four, then two. It disappears on the third step.",
    },
    hamming: {
      ja: "第1世代でいちばん上に緑、いちばん下に青が一つずつ飛び出し、元の模様の傾きが見えてきます。",
      en: "On the first step a green dot reaches up and a blue dot reaches down. Together they mark the tilt of the starting cluster.",
    },
    life: {
      ja: "第0世代と第4世代を見比べると、同じ配色の姿が右下へ1セル進んでいます。白い2点が移動の目印です。",
      en: "Compare generations 0 and 4. The same colored shape sits one cell down and to the right. The pair of white dots makes the shift easy to see.",
    },
    rug: {
      ja: "第1世代では右側に白が縦に二つ並び、下端には青い2点が横に並びます。小さな縦線と横線が目印です。",
      en: "At generation 1 look for two white cells stacked on the right and a pair of blue cells side by side along the bottom.",
    },
    seeds: {
      ja: "第1世代では、上の赤と緑の対と、下端の青い対のあいだに黒い余白が開きます。",
      en: "After one step, black space opens between the red-and-green pair at the top and the blue pair along the bottom.",
    },
    "day-night": {
      ja: "中央の1マスは青、黄、シアン、緑、青と色を渡り、第6世代で模様ごと消えます。",
      en: "The center runs through blue, yellow, cyan, green and blue before the whole pattern goes dark at generation 6.",
    },
  },
  pulse: {
    4: {
      ja: "模様の一番上にある赤い2点を追うと、第1・第2世代では間隔を保ったまま1段ずつ上に現れます。",
      en: "Follow the two highest red dots. In generations 1 and 2 each new pair sits a row higher, with the same gap between them.",
    },
    5: {
      ja: "第16世代では、輪唱の模様が中央と上下左右に一つずつ離れて並びます。黒い筋も白い点も、五つとも同じ向きです。",
      en: "At generation 16 five pulsars sit apart in a cross. The dark lines and white dots have the same orientation in all five.",
    },
    diagonal: {
      ja: "最初は離れていた上端の赤い2点が、第1世代で二組の対になり、斜めの広がりを描きます。",
      en: "The two red dots along the top become two pairs in generation 1. Their separation marks the diagonal spread.",
    },
    "diagonal-center": {
      ja: "第8世代では斜め四方に模様が現れ、中央にも元の配色が重なって見えます。",
      en: "In generation 8 look between the four diagonal repetitions. The colors of the original pulsar are woven through the middle.",
    },
    8: {
      ja: "第1世代では上端の赤い2点が、横に3セルずつ並ぶ二本の短い線に変わります。",
      en: "The two red dots at the very top become two short horizontal strokes in generation 1, each three cells long.",
    },
    9: {
      ja: "第8世代の上の縁を横にたどると、元の赤い2点が三組並び、途中の黒い間隔が伸び縮みして見えます。",
      en: "Read the upper edge of generation 8 across. Three copies of the original red pair make alternating wide and narrow gaps.",
    },
    or: {
      ja: "四方の色の帯が内へも広がり、第3世代で空いていた中央の1マスに初めて白が届きます。",
      en: "Watch the colored bands close in from four sides. White first reaches the empty center at generation 3.",
    },
    and: {
      ja: "輪唱のあちこちに光る白い点も、周りの色も、第1世代で一斉に消えます。",
      en: "Pick out the white lights scattered through the pulsar. They go dark with the rest of the design in a single step.",
    },
    majority: {
      ja: "第3世代には斜めに並ぶ青の4点だけが残ります。第4世代で、その小さな四角も消えます。",
      en: "At generation 3 four blue dots mark the corners of a square. A step later even that little square disappears.",
    },
    hamming: {
      ja: "第1世代で上下左右の外縁に赤い点が飛び出します。中心を横切る黒い線と見比べてみてください。",
      en: "Red dots reach beyond the four outer edges on the first step. Compare them with the dark line through the middle.",
    },
    life: {
      ja: "黒いすき間と白い点を目印にすると、輪郭が留まったまま色だけが巡り、3世代で初めの配色に戻ります。",
      en: "Use the black gaps and white dots as landmarks. The outline holds still while the colors cycle, returning after three generations.",
    },
    rug: {
      ja: "中央の1マスは最初の7世代を黒いまま過ごし、第8世代で緑、第9世代で赤がそこに届きます。",
      en: "The very center stays dark through generation 7. Green reaches it at generation 8, followed by red at generation 9.",
    },
    seeds: {
      ja: "第1世代で中央に小さな白い枠が現れます。真ん中だけを黒く残して、8セルが一周します。",
      en: "Look at the middle of generation 1. Eight white cells make a little square frame with a single black cell inside.",
    },
    "day-night": {
      ja: "第6世代だけ中央に赤が灯り、前後の世代では黒く空きます。周りの動きの中に短い一拍が見つかります。",
      en: "Watch generations 5, 6 and 7. A single red beat lights up the center between two moments of black.",
    },
  },
  "phase-clock": {
    4: {
      ja: "上端にある赤い2点は、第1・第2世代で間の黒い6マスを保ったまま外へ移ります。",
      en: "Track the two red dots at the top through the first two steps. They move outward with six black cells still between them.",
    },
    5: {
      ja: "第1世代では色が四方へ張り出します。いちばん外の赤い2点の間隔は、第0世代と同じです。",
      en: "On the first step color reaches outward on four sides. The outermost red pair keeps the spacing it had on the clock face.",
    },
    diagonal: {
      ja: "第1世代で上端の赤い2点がそれぞれ二つに分かれ、対になった先端のあいだに黒い1マスが開きます。",
      en: "On the first step each red dot at the top splits in two, with a single black gap between the tips of each pair.",
    },
    "diagonal-center": {
      ja: "第8世代では花暦の輪郭が斜め四方に開き、中央で元の模様と重なります。",
      en: "At generation 8 four clock faces spread out on the diagonals. A fifth remains in the middle where the designs overlap.",
    },
    8: {
      ja: "第1世代の上端で、離れていた赤い2点が横3セルずつの線になります。黒い間隔は6マスから4マスに縮みます。",
      en: "Along the top edge in generation 1, two red dots become bars of three cells. The black gap between them narrows from six cells to four.",
    },
    9: {
      ja: "第8世代の上端では、赤が1点、2点、2点、1点と並びます。花暦の模様が横に繰り返された跡です。",
      en: "Read the red marks along the very top of generation 8. The groups of one, two, two and one show where the repeated faces meet.",
    },
    or: {
      ja: "四方の花が内側にもふくらみ、第9世代で初めて中央の1マスに青が灯ります。",
      en: "The four flowers swell inward as well as outward. At generation 9 the first light in the empty center is blue.",
    },
    and: {
      ja: "第1世代では四方に赤い点が二つずつ残り、もう1世代進めるとその8点も消えます。",
      en: "The first step leaves a pair of red dots on each of the four sides. One more step extinguishes all eight.",
    },
    majority: {
      ja: "第3世代になると、黒い中心の四方に赤と青の小さな長方形が残り、それからは静止します。",
      en: "At generation 3 little red and blue rectangles settle on four sides of the dark center. They hold their positions from then on.",
    },
    hamming: {
      ja: "第1世代では一番外に赤が飛び出し、その内側には白が残ります。四方の花に同じ色の並びを探せます。",
      en: "At generation 1 red reaches out at the tips and white remains farther in. Look for the same sequence in all four flowers.",
    },
    life: {
      ja: "第0・5・10世代では同じ輪郭に違う色が灯ります。第15世代で花暦は配色まで元に戻ります。",
      en: "Compare generations 0, 5 and 10. The same outline lights up in different colors, and at generation 15 even the original colors return.",
    },
    rug: {
      ja: "四方の花のあいだを見ていると、第9世代で初めて中心に青がひとつ灯ります。",
      en: "Watch the gap between the four flowers. A blue light appears at the very center for the first time in generation 9.",
    },
    seeds: {
      ja: "第1世代で白やシアンの重なりがほどけ、緑・赤・青の離れた点だけで四方の花が描き直されます。",
      en: "The white and cyan overlaps come apart on the first step. Separate green, red and blue marks redraw the four flowers.",
    },
    "day-night": {
      ja: "第1世代で白い重なりは消えます。花の先には赤が残り、その内側に黄やシアンが現れます。",
      en: "The white overlaps disappear on the first step. Red stays at the tips, with yellow and cyan appearing farther in.",
    },
  },
  fireworks: {
    4: {
      ja: "上端の赤い横線は4セル幅のまま、第1・第2世代で一段ずつ上に現れます。",
      en: "Follow the red bar at the top. It appears one row higher in each of the first two steps and keeps its four-cell width.",
    },
    5: {
      ja: "第8世代では、上下左右に開いた模様のあいだに元の花火も重なります。中央を通る黒い1点が目印です。",
      en: "In generation 8 the original burst overlaps the four spreading to its sides. The black cell at the exact center is a useful landmark.",
    },
    diagonal: {
      ja: "上端の赤い4セルは、第1世代では2セルずつに分かれ、第2世代には横8セルの一本の線につながります。",
      en: "The four red cells along the top split into two pairs on the first step. On the second step the top edge becomes one bar of eight.",
    },
    "diagonal-center": {
      ja: "第8世代では上端に赤い線が二本並び、そのあいだに黒い12マスが開きます。元の花火は中央にも重なります。",
      en: "At generation 8 two red bars along the upper edge have twelve black cells between them. The original burst also runs through the middle.",
    },
    8: {
      ja: "第1世代の上端を横に読むと、赤は1点、2点、1点の三つに分かれ、両側に黒い切れ目が入ります。",
      en: "Read the highest red line after one step. Two dark notches break it into a single dot, a pair and another single dot.",
    },
    9: {
      ja: "第8世代の最上段では、もとの赤い4セルの線が、同じ長さの黒いすき間を挟んで三本並びます。",
      en: "At generation 8 three red bars of four cells line up along the top, with equally wide black gaps between them.",
    },
    or: {
      ja: "四方から色が広がると、第5世代で中央に赤が届き、第8世代で黄、第9世代で白へ変わります。",
      en: "Four fronts move inward. Red reaches the center at generation 5, yellow at generation 8 and white at generation 9.",
    },
    and: {
      ja: "白い火花も緑の芯も1世代で消え、残った赤と青の線も第2世代でいっせいに消えます。",
      en: "The white sparks and green centers go dark in one step. The remaining red and blue strokes vanish together in the next.",
    },
    majority: {
      ja: "第3世代で動きが止まると、四方に赤のかたまりが残り、青とマゼンタがその縁に小さく灯ります。",
      en: "Motion settles at generation 3. Four red masses remain, with small blue and magenta marks at their edges.",
    },
    hamming: {
      ja: "第1世代には四方の赤い先端から白へ、さらにシアンへとたどれます。緑一色の点は姿を消します。",
      en: "After one step, trace inward from the red tips to white and cyan. The pure green lights have disappeared.",
    },
    life: {
      ja: "第0世代と第3世代の上端を見比べると、赤かった4点が同じ位置で緑に変わり、四方の花火が呼応します。",
      en: "Compare the upper edge in generations 0 and 3. Four red cells turn green in the same places, echoed on the other three sides.",
    },
    rug: {
      ja: "四方から寄ってくる火花のあいだで、第5世代に中央が赤く灯り、次の世代にはまた黒く空きます。",
      en: "Between the four bursts the exact center lights up red at generation 5. On the next step it opens into black again.",
    },
    seeds: {
      ja: "第1世代では白い光がほどけ、第2世代には緑と青だけで、四方に小さな火花が散っています。",
      en: "The white lights scatter in the first step. By generation 2 only green and blue mark the sparks on four sides.",
    },
    "day-night": {
      ja: "上端で4セル並んでいた赤は、第4世代で8セルの横線になります。四方の外縁に同じ広がりが見えます。",
      en: "The four red cells along the upper rim become a bar of eight at generation 4. The other three outer edges widen in the same way.",
    },
  },
  "all-white": {
    4: {
      ja: "第1世代では内側と四隅が黒く抜け、白は四辺に1セル幅の線となって残ります。四隅で線が途切れます。",
      en: "In generation 1 four one-cell-wide white lines outline the field. The interior and the four corner cells go dark.",
    },
    5: {
      ja: "第1世代では四辺に黒い線が入り、四隅には白が一つずつ、内側には広い白が残ります。",
      en: "Four dark cuts run along the edges on the first step, leaving a white dot at each corner and a broad white field inside.",
    },
    diagonal: {
      ja: "第1世代の白は四隅の4点だけです。次の世代には、それぞれの点が小さな白い正方形になって見えます。",
      en: "Only the four corners are white in the first step. In the second, each corner lights up as a small white square.",
    },
    "diagonal-center": {
      ja: "最初に黒くなるのは四隅の1セルずつです。第2世代には、その黒が四隅で2×2の正方形になります。",
      en: "Black first appears as a single cell at each corner. In generation 2 the four dark marks become two-by-two squares.",
    },
    8: {
      ja: "白い面は第1世代で、四隅まで切れ目なくつながった白い額縁になります。",
      en: "After one step the solid field becomes a white frame, one cell wide and joined at all four corners.",
    },
    9: {
      ja: "白い正方形は最初の2世代で一回りずつ小さくなります。第3世代では、いったん黒くなった外側にも白が戻ります。",
      en: "The white square shrinks for two steps. In generation 3 white also returns to the outer region that had gone dark.",
    },
    or: whiteField,
    and: {
      ja: "白い正方形が四辺から1セルずつ縮み、第24世代で中央に白が1点だけ残ります。次の1世代でその点も消えます。",
      en: "The white square recedes one cell from each side per step. At generation 24 a single white center remains. One more step puts it out.",
    },
    majority: whiteField,
    hamming: whiteField,
    life: {
      ja: "第1世代には四隅に白が1点ずつ残り、第2世代には、その四隅を結ぶ白い線が四辺に戻ります。",
      en: "One white dot stays at each corner in generation 1. In generation 2 white lines reappear along the four edges, joining the corners.",
    },
    rug: {
      ja: "第1世代では見える範囲が真っ黒になります。もう1世代進めると、視野の外から白が戻り、四辺を縁取ります。",
      en: "The whole view goes dark at generation 1. Step once more and white returns from beyond the viewing window to trace its four edges.",
    },
    seeds: {
      ja: "第1世代で盤面が黒くなったあと、もう1世代進めると、四隅に白が1点ずつ戻ります。",
      en: "The field goes dark on the first step. Take one more, and a single white light returns at each of the four corners.",
    },
    "day-night": {
      ja: "第1世代では白い四隅を残して四辺が黒くなり、第2世代には角のすぐ横にも白と黒の切れ目が現れます。",
      en: "The edges turn black on the first step while the corners stay white. In the second, short breaks appear beside those corners.",
    },
  },
} satisfies Record<Exclude<AutomataPreset, "black">, Record<AutomataRule, ViewingNote>>;

export function getAutomataViewingNote(preset: AutomataPreset, rule: AutomataRule, lang: Language): string {
  return (preset === "black" ? blackField : notesByPreset[preset][rule])[lang];
}
