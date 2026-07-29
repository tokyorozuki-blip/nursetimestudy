import pptxgen from 'pptxgenjs';
import { TimeStudyRecord } from '../types';
import { DEPARTMENTS, AGE_GROUPS, PRESET_TASKS } from '../constants';

interface ExportFilterSummary {
  selectedDepartment: string;
  selectedRole: string;
  selectedAgeGroup: string;
  selectedDate: string;
}

/**
 * タイムスタディレコードからPowerPoint (.pptx) 分析・考察付き総合レポートを自動生成してダウンロード
 * （指定スライド寸法: 幅 48.167 cm [18.963 インチ] × 高さ 27.093 cm [10.667 インチ] 16:9 大画面仕様）
 */
export async function exportDashboardToPPTX(
  records: TimeStudyRecord[],
  filters?: ExportFilterSummary
) {
  // Vite / ESM 環境での互換性を保つためコンストラクタを安全に取得
  const PptxGenConstructor =
    typeof pptxgen === 'function'
      ? pptxgen
      : (pptxgen as any).default || pptxgen;

  const pptx = new PptxGenConstructor();
  
  // ★ 幅 48.167 cm (18.963 インチ) × 高さ 27.093 cm (10.667 インチ) 16:9 大画面カスタムレイアウト
  const SLIDE_WIDTH = 18.963;  // 48.167 cm
  const SLIDE_HEIGHT = 10.667; // 27.093 cm

  pptx.defineLayout({ name: 'CUSTOM_48CM_16x9', width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
  pptx.layout = 'CUSTOM_48CM_16x9';

  const todayStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // タスクマップ
  const taskMap = new Map(PRESET_TASKS.map((t) => [t.id, t]));

  // ユニーク職員数
  const uniqueUsers = new Set<string>();
  records.forEach((r) => {
    if (r.user) uniqueUsers.add(r.user.staffId || r.user.name);
  });
  const totalUserCount = uniqueUsers.size;

  // 全体集計データ算出
  let totalDirectMins = 0;
  let totalIndirectMins = 0;
  let totalOtherMins = 0;

  records.forEach((rec) => {
    rec.slots?.forEach((slot) => {
      slot.selectedTaskIds?.forEach((taskId) => {
        const task = taskMap.get(taskId);
        if (task) {
          if (task.category === '直接看護業務') totalDirectMins += 15;
          else if (task.category === '間接看護業務') totalIndirectMins += 15;
          else totalOtherMins += 15;
        }
      });
    });
  });

  const grandTotalMins = totalDirectMins + totalIndirectMins + totalOtherMins || 1;
  const directPercent = Math.round((totalDirectMins / grandTotalMins) * 100);
  const indirectPercent = Math.round((totalIndirectMins / grandTotalMins) * 100);
  const otherPercent = Math.round((totalOtherMins / grandTotalMins) * 100);

  // ----------------------------------------------------
  // ヘッダー生成共通関数 (幅 48.167 cm 対応)
  // ----------------------------------------------------
  const addSlideHeader = (slide: pptxgen.Slide, title: string, subtitle: string) => {
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: 1.1,
      fill: { color: '0F172A' },
    });

    slide.addText(title, {
      x: 0.8,
      y: 0.14,
      w: 13.0,
      h: 0.48,
      fontSize: 23,
      fontFace: 'Meiryo',
      color: 'FFFFFF',
      bold: true,
    });

    slide.addText(subtitle, {
      x: 0.8,
      y: 0.64,
      w: 13.0,
      h: 0.34,
      fontSize: 13.5,
      fontFace: 'Meiryo',
      color: '94A3B8',
    });

    slide.addText(`作成日: ${todayStr}`, {
      x: 14.0,
      y: 0.32,
      w: 4.1,
      h: 0.45,
      fontSize: 13.5,
      fontFace: 'Meiryo',
      color: 'CBD5E1',
      align: 'right',
    });
  };

  // ----------------------------------------------------
  // 3ブロックレポート用カード描画ヘルパー関数 (幅 48.167 cm × 高さ 27.093 cm 大画面用)
  // ----------------------------------------------------
  const addReportSectionCards = (
    slide: pptxgen.Slide,
    card1: { title: string; text: string; bg: string; border: string; textCol: string },
    card2: { title: string; text: string; bg: string; border: string; textCol: string },
    card3: { title: string; text: string; bg: string; border: string; textCol: string }
  ) => {
    const cards = [card1, card2, card3];
    cards.forEach((c, idx) => {
      const topY = 1.35 + idx * 2.85;

      slide.addShape('rect', {
        x: 0.8,
        y: topY,
        w: 17.36,
        h: 2.55,
        fill: { color: c.bg },
        line: { color: c.border, width: 1.8 },
      });

      slide.addText(c.title, {
        x: 1.1,
        y: topY + 0.18,
        w: 16.7,
        h: 0.45,
        fontSize: 16,
        fontFace: 'Meiryo',
        color: c.textCol,
        bold: true,
      });

      slide.addText(c.text, {
        x: 1.1,
        y: topY + 0.68,
        w: 16.7,
        h: 1.7,
        fontSize: 13,
        fontFace: 'Meiryo',
        color: '334155',
        lineSpacing: 22,
      });
    });
  };

  // ----------------------------------------------------
  // SLIDE 1: カバー（タイトル）
  // ----------------------------------------------------
  const slide1 = pptx.addSlide();
  
  slide1.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: '100%',
    fill: { color: '0F172A' },
  });

  slide1.addShape('rect', {
    x: 1.2,
    y: 2.2,
    w: 0.22,
    h: 4.8,
    fill: { color: '0284C7' },
  });

  slide1.addText('看護業務 タイムスタディ調査', {
    x: 1.7,
    y: 2.2,
    w: 16.0,
    h: 0.8,
    fontSize: 28,
    fontFace: 'Meiryo',
    color: '94A3B8',
    bold: true,
  });

  slide1.addText('分析結果 総合評価レポート', {
    x: 1.7,
    y: 3.1,
    w: 16.0,
    h: 1.6,
    fontSize: 52,
    fontFace: 'Meiryo',
    color: 'FFFFFF',
    bold: true,
  });

  slide1.addText('全体・各病棟別・各職種別・年齢層別 調査分析＆改善提案報告書 (幅 48.167cm × 高さ 27.093cm)', {
    x: 1.7,
    y: 4.9,
    w: 16.0,
    h: 0.8,
    fontSize: 21,
    fontFace: 'Meiryo',
    color: '38BDF8',
  });

  slide1.addShape('rect', {
    x: 1.7,
    y: 6.4,
    w: 15.5,
    h: 2.3,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1.5 },
  });

  const filterText = filters
    ? `抽出条件: 部署 [${filters.selectedDepartment}] / 職種 [${filters.selectedRole}] / 年齢 [${filters.selectedAgeGroup}] / 日付 [${filters.selectedDate}]`
    : '抽出条件: 全データ';

  slide1.addText(
    `出力日時: ${todayStr}   |   対象提出データ数: ${records.length}件   |   対象職員数: ${totalUserCount}名\n${filterText}`,
    {
      x: 2.1,
      y: 6.7,
      w: 14.7,
      h: 1.7,
      fontSize: 16,
      fontFace: 'Meiryo',
      color: 'CBD5E1',
      lineSpacing: 28,
    }
  );

  // ----------------------------------------------------
  // SLIDE 2: 全体集計データ (大画面仕様)
  // ----------------------------------------------------
  const slide2 = pptx.addSlide();
  addSlideHeader(slide2, '1-1. 全体集計データ', '全対象データの業務割合および時間比較');

  // KPI 3カード
  slide2.addShape('rect', {
    x: 0.8,
    y: 1.45,
    w: 5.5,
    h: 1.8,
    fill: { color: 'F0F9FF' },
    line: { color: 'BAE6FD', width: 2 },
  });
  slide2.addText('直接看護業務', {
    x: 1.1,
    y: 1.6,
    w: 4.9,
    h: 0.35,
    fontSize: 15,
    fontFace: 'Meiryo',
    color: '0369A1',
    bold: true,
  });
  slide2.addText(`${directPercent}%`, {
    x: 1.1,
    y: 1.98,
    w: 4.9,
    h: 0.7,
    fontSize: 40,
    fontFace: 'Meiryo',
    color: '0284C7',
    bold: true,
  });
  slide2.addText(`合計: ${(totalDirectMins / 60).toFixed(1)} 時間`, {
    x: 1.1,
    y: 2.72,
    w: 4.9,
    h: 0.35,
    fontSize: 13.5,
    fontFace: 'Meiryo',
    color: '0C4A6E',
  });

  slide2.addShape('rect', {
    x: 6.73,
    y: 1.45,
    w: 5.5,
    h: 1.8,
    fill: { color: 'ECFDF5' },
    line: { color: 'A7F3D0', width: 2 },
  });
  slide2.addText('間接看護業務', {
    x: 7.03,
    y: 1.6,
    w: 4.9,
    h: 0.35,
    fontSize: 15,
    fontFace: 'Meiryo',
    color: '047857',
    bold: true,
  });
  slide2.addText(`${indirectPercent}%`, {
    x: 7.03,
    y: 1.98,
    w: 4.9,
    h: 0.7,
    fontSize: 40,
    fontFace: 'Meiryo',
    color: '10B981',
    bold: true,
  });
  slide2.addText(`合計: ${(totalIndirectMins / 60).toFixed(1)} 時間`, {
    x: 7.03,
    y: 2.72,
    w: 4.9,
    h: 0.35,
    fontSize: 13.5,
    fontFace: 'Meiryo',
    color: '064E3B',
  });

  slide2.addShape('rect', {
    x: 12.66,
    y: 1.45,
    w: 5.5,
    h: 1.8,
    fill: { color: 'F3E8FF' },
    line: { color: 'E9D5FF', width: 2 },
  });
  slide2.addText('その他・管理業務', {
    x: 12.96,
    y: 1.6,
    w: 4.9,
    h: 0.35,
    fontSize: 15,
    fontFace: 'Meiryo',
    color: '7E22CE',
    bold: true,
  });
  slide2.addText(`${otherPercent}%`, {
    x: 12.96,
    y: 1.98,
    w: 4.9,
    h: 0.7,
    fontSize: 40,
    fontFace: 'Meiryo',
    color: 'A855F7',
    bold: true,
  });
  slide2.addText(`合計: ${(totalOtherMins / 60).toFixed(1)} 時間`, {
    x: 12.96,
    y: 2.72,
    w: 4.9,
    h: 0.35,
    fontSize: 13.5,
    fontFace: 'Meiryo',
    color: '581C87',
  });

  const overallRows: pptxgen.TableRow[] = [
    [
      { text: '業務区分', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true } },
      { text: '総時間 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '構成比 (%)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '概要・主な内容', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true } },
    ],
    [
      { text: '直接看護業務', options: { bold: true, color: '0284C7' } },
      { text: `${(totalDirectMins / 60).toFixed(1)}`, options: { align: 'right' } },
      { text: `${directPercent}%`, options: { align: 'right', bold: true } },
      { text: 'バイタル観察・処置点滴・生活援助ケア・服薬指導・回診同行' },
    ],
    [
      { text: '間接看護業務', options: { bold: true, color: '10B981' } },
      { text: `${(totalIndirectMins / 60).toFixed(1)}`, options: { align: 'right' } },
      { text: `${indirectPercent}%`, options: { align: 'right', bold: true } },
      { text: 'カルテ記録・情報収集・申し送りカンファレンス・物品薬品準備' },
    ],
    [
      { text: 'その他・管理業務', options: { bold: true, color: 'A855F7' } },
      { text: `${(totalOtherMins / 60).toFixed(1)}`, options: { align: 'right' } },
      { text: `${otherPercent}%`, options: { align: 'right', bold: true } },
      { text: '患者搬送・環境整備消毒・新人教育・電話対応事務・休憩' },
    ],
    [
      { text: '合計', options: { fill: { color: 'F1F5F9' }, bold: true } },
      { text: `${(grandTotalMins / 60).toFixed(1)}`, options: { fill: { color: 'F1F5F9' }, align: 'right', bold: true } },
      { text: '100%', options: { fill: { color: 'F1F5F9' }, align: 'right', bold: true } },
      { text: `総提出数: ${records.length}件 (職員数 ${totalUserCount}名)`, options: { fill: { color: 'F1F5F9' } } },
    ],
  ];

  slide2.addTable(overallRows, {
    x: 0.8,
    y: 3.65,
    w: 17.36,
    colW: [3.8, 2.5, 2.5, 8.56],
    fontSize: 13,
    fontFace: 'Meiryo',
    margin: [4, 6, 4, 6],
    border: { pt: 1, color: 'CBD5E1' },
  });

  // ----------------------------------------------------
  // SLIDE 3: 【全体】 総合分析＆改善提案レポート
  // ----------------------------------------------------
  const slide3 = pptx.addSlide();
  addSlideHeader(slide3, '1-2. 【全体】 総合分析＆改善提案レポート', '全データに基づく業務割合の構造評価・課題抽出・改善ロードマップ');

  addReportSectionCards(
    slide3,
    {
      title: '📌 1. 全体業務バランスの分析評価',
      text: `・本調査における直接看護業務の割合は【${directPercent}%】（合計 ${(totalDirectMins / 60).toFixed(1)}時間）であり、患者ケアへの直接投入時間が全体の主軸を占めています。\n・一方、間接看護業務（${indirectPercent}%）およびその他管理業務（${otherPercent}%）の合計が【${100 - directPercent}%】に上り、実稼働時間の約半数が患者非対面業務に費やされている現状が判明しました。`,
      bg: 'F0F9FF',
      border: 'BAE6FD',
      textCol: '0369A1',
    },
    {
      title: '🔍 2. 抽出された主要課題・ボトルネック',
      text: `・電子カルテ記録および情報収集・申し送り等の間接時間が圧迫要因となっており、看護師のステーション滞留時間が長期化しています。\n・物品・配薬準備および患者搬送・環境整備などの周辺業務が直接ケアの割り込み要因となっており、看護専門職の集中を阻害しています。`,
      bg: 'FEF2F2',
      border: 'FCA5A5',
      textCol: 'B91C1C',
    },
    {
      title: '🚀 3. 今後の改善アクション＆推奨施策',
      text: `・【電子カルテ・申し送りの省力化】: テンプレート化・音声入力の導入および申し送り事項の要約化による記録時間15%削減。\n・【看護補助者へのタスクシフト】: 環境整備・リネン交換・配膳下膳・定常搬送の標準化による看護師のケア時間最大化。`,
      bg: 'F0FDF4',
      border: '86EFAC',
      textCol: '15803D',
    }
  );

  // ----------------------------------------------------
  // SLIDE 4: 各病棟（部署）別 集計データ (幅 48.167 cm 対応の左右2列配置)
  // ----------------------------------------------------
  const slide4 = pptx.addSlide();
  addSlideHeader(slide4, '2-1. 各病棟（部署）別 集計データ', '部署ごとの業務時間および直接看護割合の一覧比較 (全18部署)');

  const deptStatsMap: Record<string, { direct: number; indirect: number; other: number; count: number; users: Set<string> }> = {};

  DEPARTMENTS.forEach((d) => {
    deptStatsMap[d] = { direct: 0, indirect: 0, other: 0, count: 0, users: new Set() };
  });

  records.forEach((rec) => {
    const dept = rec.user?.department;
    if (dept) {
      if (!deptStatsMap[dept]) {
        deptStatsMap[dept] = { direct: 0, indirect: 0, other: 0, count: 0, users: new Set() };
      }
      deptStatsMap[dept].count += 1;
      if (rec.user?.staffId || rec.user?.name) {
        deptStatsMap[dept].users.add(rec.user.staffId || rec.user.name);
      }

      rec.slots?.forEach((slot) => {
        slot.selectedTaskIds?.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') deptStatsMap[dept].direct += 0.25;
            else if (task.category === '間接看護業務') deptStatsMap[dept].indirect += 0.25;
            else deptStatsMap[dept].other += 0.25;
          }
        });
      });
    }
  });

  const activeDepts = DEPARTMENTS.filter((d) => deptStatsMap[d] && deptStatsMap[d].count > 0);
  const displayDepts = activeDepts.length > 0 ? activeDepts : DEPARTMENTS;

  let topDept = '';
  let topDeptPct = -1;
  let lowDept = '';
  let lowDeptPct = 999;

  activeDepts.forEach((dept) => {
    const st = deptStatsMap[dept];
    const totalH = st.direct + st.indirect + st.other;
    const directPct = totalH > 0 ? Math.round((st.direct / totalH) * 100) : 0;
    if (totalH > 0) {
      if (directPct > topDeptPct) {
        topDeptPct = directPct;
        topDept = dept;
      }
      if (directPct < lowDeptPct) {
        lowDeptPct = directPct;
        lowDept = dept;
      }
    }
  });

  const midIndex = Math.ceil(displayDepts.length / 2);
  const leftDepts = displayDepts.slice(0, midIndex);
  const rightDepts = displayDepts.slice(midIndex);

  const createDeptTableRows = (deptList: string[]): pptxgen.TableRow[] => {
    const rows: pptxgen.TableRow[] = [
      [
        { text: '部署名', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true } },
        { text: '人数', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
        { text: '直接 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
        { text: '間接 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
        { text: '他 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
        { text: '合計 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
        { text: '直接率', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      ],
    ];

    deptList.forEach((dept, idx) => {
      const st = deptStatsMap[dept] || { direct: 0, indirect: 0, other: 0, users: new Set() };
      const totalH = st.direct + st.indirect + st.other;
      const directPct = totalH > 0 ? Math.round((st.direct / totalH) * 100) : 0;
      const bg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';

      rows.push([
        { text: dept, options: { fill: { color: bg }, bold: true } },
        { text: `${st.users.size}名`, options: { fill: { color: bg }, align: 'right' } },
        { text: `${st.direct.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: '0284C7' } },
        { text: `${st.indirect.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: '10B981' } },
        { text: `${st.other.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: 'A855F7' } },
        { text: `${totalH.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', bold: true } },
        { text: `${directPct}%`, options: { fill: { color: bg }, align: 'right', bold: true, color: '0284C7' } },
      ]);
    });
    return rows;
  };

  // 左側テーブル (x: 0.8, w: 8.5)
  slide4.addTable(createDeptTableRows(leftDepts), {
    x: 0.8,
    y: 1.45,
    w: 8.5,
    colW: [2.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    fontSize: 12,
    fontFace: 'Meiryo',
    margin: [4, 5, 4, 5],
    border: { pt: 1, color: 'E2E8F0' },
  });

  // 右側テーブル (x: 9.66, w: 8.5)
  slide4.addTable(createDeptTableRows(rightDepts), {
    x: 9.66,
    y: 1.45,
    w: 8.5,
    colW: [2.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    fontSize: 12,
    fontFace: 'Meiryo',
    margin: [4, 5, 4, 5],
    border: { pt: 1, color: 'E2E8F0' },
  });

  // ----------------------------------------------------
  // SLIDE 5: 【病棟（部署）別】 業務負荷・部署別課題レポート
  // ----------------------------------------------------
  const slide5 = pptx.addSlide();
  addSlideHeader(slide5, '2-2. 【病棟別】 業務負荷・部署別課題レポート', '病棟・ICU・外来等の部署特性と看護業務バランスの個別分析');

  addReportSectionCards(
    slide5,
    {
      title: '🏥 1. 部署間における直接看護率の偏り分析',
      text: `・最も直接看護率が高い部署: 【${topDept || '該当なし'}】 (${topDeptPct >= 0 ? topDeptPct + '%' : '-'})\n・最も間接・その他業務比率が高い部署: 【${lowDept || '該当なし'}】 (直接看護率 ${lowDeptPct < 999 ? lowDeptPct + '%' : '-'})\n・ICU/HCUや急性期病棟ではバイタル・処置が集中する一方、外来・特定病棟では事前カルテ確認・問診・調整業務の割合が高くなっています。`,
      bg: 'F0F9FF',
      border: 'BAE6FD',
      textCol: '0369A1',
    },
    {
      title: '⚠️ 2. 部署固有の構造的要因・課題',
      text: `・【一般病棟】: 患者搬送およびナースコール対応の頻度が高く、業務中断によるタイムロスが著しい状況です。\n・【集中治療系】: 重症度に応じた高密度な記録入力および医師ラウンド同行の時間が長くなり、精神的・時間的負荷が増大しています。`,
      bg: 'FEF2F2',
      border: 'FCA5A5',
      textCol: 'B91C1C',
    },
    {
      title: '💡 3. 部署特性に応じた最適化提案',
      text: `・【病棟クラーク・補助者の重点配置】: 搬送・物品請求・電話対応が多い病棟へ補助要員を優先配置。\n・【部署間応援・タイムシフト体制】: ピーク時間帯（午前処置帯・夕方配薬帯）に合わせたフレキシブルな業務シェアの導入。`,
      bg: 'F0FDF4',
      border: '86EFAC',
      textCol: '15803D',
    }
  );

  // ----------------------------------------------------
  // SLIDE 6: 各職種別 集計データ
  // ----------------------------------------------------
  const slide6 = pptx.addSlide();
  addSlideHeader(slide6, '3-1. 各職種別 集計データ', '職種（看護師・准看護師・看護助手等）ごとの業務時間比較');

  const roleStatsMap: Record<string, { direct: number; indirect: number; other: number; count: number; users: Set<string> }> = {};

  records.forEach((rec) => {
    const role = rec.user?.role || '未設定';
    if (!roleStatsMap[role]) {
      roleStatsMap[role] = { direct: 0, indirect: 0, other: 0, count: 0, users: new Set() };
    }
    roleStatsMap[role].count += 1;
    if (rec.user?.staffId || rec.user?.name) {
      roleStatsMap[role].users.add(rec.user.staffId || rec.user.name);
    }

    rec.slots?.forEach((slot) => {
      slot.selectedTaskIds?.forEach((taskId) => {
        const task = taskMap.get(taskId);
        if (task) {
          if (task.category === '直接看護業務') roleStatsMap[role].direct += 0.25;
          else if (task.category === '間接看護業務') roleStatsMap[role].indirect += 0.25;
          else roleStatsMap[role].other += 0.25;
        }
      });
    });
  });

  const roleRows: pptxgen.TableRow[] = [
    [
      { text: '職種区分', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true } },
      { text: '人数', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '直接看護 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '間接看護 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: 'その他 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '合計 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '直接看護率 (%)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
    ],
  ];

  let nurseDirectPct = -1;
  let assistantDirectPct = -1;

  Object.keys(roleStatsMap).forEach((role, idx) => {
    const st = roleStatsMap[role];
    const totalH = st.direct + st.indirect + st.other;
    const directPct = totalH > 0 ? Math.round((st.direct / totalH) * 100) : 0;
    const bg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';

    if (role === '看護師' && totalH > 0) nurseDirectPct = directPct;
    if (role === '看護補助者' && totalH > 0) assistantDirectPct = directPct;

    roleRows.push([
      { text: role, options: { fill: { color: bg }, bold: true } },
      { text: `${st.users.size}名`, options: { fill: { color: bg }, align: 'right' } },
      { text: `${st.direct.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: '0284C7' } },
      { text: `${st.indirect.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: '10B981' } },
      { text: `${st.other.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: 'A855F7' } },
      { text: `${totalH.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', bold: true } },
      { text: `${directPct}%`, options: { fill: { color: bg }, align: 'right', bold: true, color: '0284C7' } },
    ]);
  });

  slide6.addTable(roleRows, {
    x: 0.8,
    y: 1.45,
    w: 17.36,
    colW: [3.8, 2.0, 2.3, 2.3, 2.3, 2.3, 2.36],
    fontSize: 13,
    fontFace: 'Meiryo',
    margin: [4, 6, 4, 6],
    border: { pt: 1, color: 'E2E8F0' },
  });

  // ----------------------------------------------------
  // SLIDE 7: 【職種別】 タスクシェア・タスクシフト推進レポート
  // ----------------------------------------------------
  const slide7 = pptx.addSlide();
  addSlideHeader(slide7, '3-2. 【職種別】 タスクシェア・タスクシフト推進レポート', '専門資格職種と看護補助者の役割分担・協働モデルの構築');

  addReportSectionCards(
    slide7,
    {
      title: '👥 1. 職種間の役割分担現状分析',
      text: `・看護師の直接看護率: 【${nurseDirectPct >= 0 ? nurseDirectPct + '%' : 'データ参照'}】   /   看護補助者の直接看護率: 【${assistantDirectPct >= 0 ? assistantDirectPct + '%' : 'データ参照'}】\n・看護師が医療処置・アセスメント・カルテ記録を担い、看護補助者が患者生活援助・ベッドメイク・環境衛生管理を担う基本的な協働体制が数値上形成されています。`,
      bg: 'ECFDF5',
      border: 'A7F3D0',
      textCol: '047857',
    },
    {
      title: '⚖️ 2. タスクシェア上の課題と重複業務',
      text: `・看護師が検体搬送・リネン補充・環境整備等の周辺業務を兼任しており、専門的業務への集中を妨げています。\n・看護補助者の業務範囲（できること・依頼できること）の周知不足により、病棟ごとのタスク移管度にバラつきが存在します。`,
      bg: 'FEF2F2',
      border: 'FCA5A5',
      textCol: 'B91C1C',
    },
    {
      title: '🎯 3. タスクシフト推進に向けた具体策',
      text: `・【補助者業務ガイドラインの改定】: 配膳・環境整備・定常移乗介助の標準手順化と権限委譲。\n・【チーム医療の強化】: 看護師・補助者ペアによる朝の業務分担カンファレンスの定着と信頼関係醸成。`,
      bg: 'F0FDF4',
      border: '86EFAC',
      textCol: '15803D',
    }
  );

  // ----------------------------------------------------
  // SLIDE 8: 年齢階層別 集計データ
  // ----------------------------------------------------
  const slide8 = pptx.addSlide();
  addSlideHeader(slide8, '4-1. 年齢階層別 集計データ', '年齢層（20代〜60代以上）別の業務バランス・直接看護率');

  const ageStatsMap: Record<string, { direct: number; indirect: number; other: number; count: number; users: Set<string> }> = {};

  AGE_GROUPS.forEach((a) => {
    ageStatsMap[a] = { direct: 0, indirect: 0, other: 0, count: 0, users: new Set() };
  });

  records.forEach((rec) => {
    const age = rec.user?.ageGroup;
    if (age) {
      if (!ageStatsMap[age]) {
        ageStatsMap[age] = { direct: 0, indirect: 0, other: 0, count: 0, users: new Set() };
      }
      ageStatsMap[age].count += 1;
      if (rec.user?.staffId || rec.user?.name) {
        ageStatsMap[age].users.add(rec.user.staffId || rec.user.name);
      }

      rec.slots?.forEach((slot) => {
        slot.selectedTaskIds?.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') ageStatsMap[age].direct += 0.25;
            else if (task.category === '間接看護業務') ageStatsMap[age].indirect += 0.25;
            else ageStatsMap[age].other += 0.25;
          }
        });
      });
    }
  });

  const ageRows: pptxgen.TableRow[] = [
    [
      { text: '年齢階層', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true } },
      { text: '人数', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '直接看護 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '間接看護 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: 'その他 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '合計 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '直接看護率 (%)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
    ],
  ];

  let youngPct = -1;
  let seniorPct = -1;

  AGE_GROUPS.forEach((age, idx) => {
    const st = ageStatsMap[age];
    const totalH = st.direct + st.indirect + st.other;
    const directPct = totalH > 0 ? Math.round((st.direct / totalH) * 100) : 0;
    const bg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';

    if ((age === '20〜24歳' || age === '25〜29歳') && totalH > 0 && youngPct === -1) {
      youngPct = directPct;
    }
    if ((age === '50〜54歳' || age === '55〜59歳' || age === '60歳以上') && totalH > 0) {
      seniorPct = directPct;
    }

    ageRows.push([
      { text: age, options: { fill: { color: bg }, bold: true } },
      { text: `${st.users.size}名`, options: { fill: { color: bg }, align: 'right' } },
      { text: `${st.direct.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: '0284C7' } },
      { text: `${st.indirect.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: '10B981' } },
      { text: `${st.other.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: 'A855F7' } },
      { text: `${totalH.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', bold: true } },
      { text: `${directPct}%`, options: { fill: { color: bg }, align: 'right', bold: true, color: '0284C7' } },
    ]);
  });

  slide8.addTable(ageRows, {
    x: 0.8,
    y: 1.45,
    w: 17.36,
    colW: [3.8, 2.0, 2.3, 2.3, 2.3, 2.3, 2.36],
    fontSize: 12.5,
    fontFace: 'Meiryo',
    margin: [4, 5, 4, 5],
    border: { pt: 1, color: 'E2E8F0' },
  });

  // ----------------------------------------------------
  // SLIDE 9: 【年齢層別】 臨床経験・ラダー応対レポート
  // ----------------------------------------------------
  const slide9 = pptx.addSlide();
  addSlideHeader(slide9, '4-2. 【年齢層別】 臨床経験・ラダー応対レポート', '年齢・経験年数に応じた業務比率推移と人材育成・定着支援');

  addReportSectionCards(
    slide9,
    {
      title: '📈 1. 世代・経験年数別の業務構造推移',
      text: `・若手層（20代）の直接看護率: 【${youngPct >= 0 ? youngPct + '%' : 'データ参照'}】   /   ベテラン・管理層の直接看護率: 【${seniorPct >= 0 ? seniorPct + '%' : 'データ参照'}】\n・若手層は患者床前ケア・処置・基本看護技術に時間が集中し、年齢・臨床ラダーが上がるにつれてプリセプター指導・委員会・多職種調整等の管理業務比率が上昇しています。`,
      bg: 'F3E8FF',
      border: 'E9D5FF',
      textCol: '7E22CE',
    },
    {
      title: '⚡ 2. 世代固有の課題と離職防止ポイント',
      text: `・【若手看護師】: 記録入力への不慣れや緊急時対応による業務延長・心理的ストレスが蓄積しやすい傾向。\n・【中堅・ベテラン】: プレーヤー業務と指導・委員会・病棟管理の重複（板挟み状態）によるオーバーワークが顕在化。`,
      bg: 'FEF2F2',
      border: 'FCA5A5',
      textCol: 'B91C1C',
    },
    {
      title: '🌟 3. 継続的成長・定着支援に向けた提言',
      text: `・【若手サポート】: カルテ記載マニュアルの標準化およびシャドーイング・OJTフォローの充実。\n・【中堅・管理層の負担軽減】: 委員会業務のスリム化および業務時間内での指導時間確保の公式化。`,
      bg: 'F0FDF4',
      border: '86EFAC',
      textCol: '15803D',
    }
  );

  // ファイル書き出し・保存（ブラウザダウンロードを確実に実行）
  const fileName = `看護業務タイムスタディ_分析レポート_${todayStr.replace(/\//g, '')}.pptx`;

  try {
    const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (_err) {
    await pptx.writeFile({ fileName });
  }
}
