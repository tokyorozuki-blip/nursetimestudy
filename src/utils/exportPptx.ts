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
 * タイムスタディレコードからPowerPoint (.pptx) 分析レポートを自動生成してダウンロード
 * （各結果スライドに動的サマリ・考察テキストカードを追加）
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
  pptx.layout = 'LAYOUT_16x9';

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
  // SLIDE 1: カバー（タイトル）
  // ----------------------------------------------------
  const slide1 = pptx.addSlide();
  
  // 背景スタイル (濃紺)
  slide1.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: '100%',
    fill: { color: '0F172A' },
  });

  // アクセントライン
  slide1.addShape('rect', {
    x: 0.8,
    y: 1.8,
    w: 0.15,
    h: 3.2,
    fill: { color: '0284C7' },
  });

  // タイトルテキスト
  slide1.addText('看護業務 タイムスタディ調査', {
    x: 1.2,
    y: 1.8,
    w: 11,
    h: 0.6,
    fontSize: 22,
    fontFace: 'Meiryo',
    color: '94A3B8',
    bold: true,
  });

  slide1.addText('分析結果 総合レポート', {
    x: 1.2,
    y: 2.5,
    w: 11,
    h: 1.2,
    fontSize: 40,
    fontFace: 'Meiryo',
    color: 'FFFFFF',
    bold: true,
  });

  slide1.addText('全体・各病棟別・各職種別・年齢層別 集計分析・サマリ', {
    x: 1.2,
    y: 3.8,
    w: 11,
    h: 0.6,
    fontSize: 18,
    fontFace: 'Meiryo',
    color: '38BDF8',
  });

  // メタデータカード
  slide1.addShape('rect', {
    x: 1.2,
    y: 4.8,
    w: 10.8,
    h: 1.6,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
  });

  const filterText = filters
    ? `抽出条件: 部署 [${filters.selectedDepartment}] / 職種 [${filters.selectedRole}] / 年齢 [${filters.selectedAgeGroup}] / 日付 [${filters.selectedDate}]`
    : '抽出条件: 全データ';

  slide1.addText(
    `出力日時: ${todayStr}   |   対象提出データ数: ${records.length}件   |   対象職員数: ${totalUserCount}名\n${filterText}`,
    {
      x: 1.5,
      y: 5.0,
      w: 10.2,
      h: 1.2,
      fontSize: 13,
      fontFace: 'Meiryo',
      color: 'CBD5E1',
      lineSpacing: 22,
    }
  );

  // ----------------------------------------------------
  // ヘッダー生成共通関数
  // ----------------------------------------------------
  const addSlideHeader = (slide: pptxgen.Slide, title: string, subtitle: string) => {
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: 1.0,
      fill: { color: '0F172A' },
    });

    slide.addText(title, {
      x: 0.6,
      y: 0.15,
      w: 8,
      h: 0.45,
      fontSize: 20,
      fontFace: 'Meiryo',
      color: 'FFFFFF',
      bold: true,
    });

    slide.addText(subtitle, {
      x: 0.6,
      y: 0.6,
      w: 8,
      h: 0.3,
      fontSize: 12,
      fontFace: 'Meiryo',
      color: '94A3B8',
    });

    slide.addText(`作成日: ${todayStr}`, {
      x: 9.5,
      y: 0.3,
      w: 3.2,
      h: 0.4,
      fontSize: 11,
      fontFace: 'Meiryo',
      color: 'CBD5E1',
      align: 'right',
    });
  };

  // ----------------------------------------------------
  // SLIDE 2: 全体集計サマリー
  // ----------------------------------------------------
  const slide2 = pptx.addSlide();
  addSlideHeader(slide2, '1. 全体集計サマリー', '全対象データの業務割合および時間比較');

  // KPIカード 1: 直接看護
  slide2.addShape('rect', {
    x: 0.6,
    y: 1.2,
    w: 3.7,
    h: 1.5,
    fill: { color: 'F0F9FF' },
    line: { color: 'BAE6FD', width: 2 },
  });
  slide2.addText('直接看護業務', {
    x: 0.8,
    y: 1.3,
    w: 3.3,
    h: 0.3,
    fontSize: 13,
    fontFace: 'Meiryo',
    color: '0369A1',
    bold: true,
  });
  slide2.addText(`${directPercent}%`, {
    x: 0.8,
    y: 1.6,
    w: 3.3,
    h: 0.6,
    fontSize: 32,
    fontFace: 'Meiryo',
    color: '0284C7',
    bold: true,
  });
  slide2.addText(`合計: ${(totalDirectMins / 60).toFixed(1)} 時間`, {
    x: 0.8,
    y: 2.25,
    w: 3.3,
    h: 0.3,
    fontSize: 11,
    fontFace: 'Meiryo',
    color: '0C4A6E',
  });

  // KPIカード 2: 間接看護
  slide2.addShape('rect', {
    x: 4.8,
    y: 1.2,
    w: 3.7,
    h: 1.5,
    fill: { color: 'ECFDF5' },
    line: { color: 'A7F3D0', width: 2 },
  });
  slide2.addText('間接看護業務', {
    x: 5.0,
    y: 1.3,
    w: 3.3,
    h: 0.3,
    fontSize: 13,
    fontFace: 'Meiryo',
    color: '047857',
    bold: true,
  });
  slide2.addText(`${indirectPercent}%`, {
    x: 5.0,
    y: 1.6,
    w: 3.3,
    h: 0.6,
    fontSize: 32,
    fontFace: 'Meiryo',
    color: '10B981',
    bold: true,
  });
  slide2.addText(`合計: ${(totalIndirectMins / 60).toFixed(1)} 時間`, {
    x: 5.0,
    y: 2.25,
    w: 3.3,
    h: 0.3,
    fontSize: 11,
    fontFace: 'Meiryo',
    color: '064E3B',
  });

  // KPIカード 3: その他・管理
  slide2.addShape('rect', {
    x: 9.0,
    y: 1.2,
    w: 3.7,
    h: 1.5,
    fill: { color: 'F3E8FF' },
    line: { color: 'E9D5FF', width: 2 },
  });
  slide2.addText('その他・管理業務', {
    x: 9.2,
    y: 1.3,
    w: 3.3,
    h: 0.3,
    fontSize: 13,
    fontFace: 'Meiryo',
    color: '7E22CE',
    bold: true,
  });
  slide2.addText(`${otherPercent}%`, {
    x: 9.2,
    y: 1.6,
    w: 3.3,
    h: 0.6,
    fontSize: 32,
    fontFace: 'Meiryo',
    color: 'A855F7',
    bold: true,
  });
  slide2.addText(`合計: ${(totalOtherMins / 60).toFixed(1)} 時間`, {
    x: 9.2,
    y: 2.25,
    w: 3.3,
    h: 0.3,
    fontSize: 11,
    fontFace: 'Meiryo',
    color: '581C87',
  });

  // 内訳テーブル
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
    x: 0.6,
    y: 2.9,
    w: 12.1,
    colW: [2.5, 1.8, 1.8, 6.0],
    fontSize: 11,
    fontFace: 'Meiryo',
    border: { pt: 1, color: 'CBD5E1' },
  });

  // 全体分析サマリカード
  slide2.addShape('rect', {
    x: 0.6,
    y: 5.4,
    w: 12.1,
    h: 1.6,
    fill: { color: 'F8FAFC' },
    line: { color: 'CBD5E1', width: 1 },
  });

  slide2.addText('💡 全体分析サマリ・考察ポイント', {
    x: 0.8,
    y: 5.5,
    w: 11.7,
    h: 0.3,
    fontSize: 12,
    fontFace: 'Meiryo',
    color: '0F172A',
    bold: true,
  });

  const overallSummaryText = `・直接看護業務の割合は【${directPercent}%】であり、本調査対象全体の主要な時間を占めています。
・間接看護業務（${indirectPercent}%）および管理・その他業務（${otherPercent}%）の合計は【${100 - directPercent}%】です。
・記録入力やカンファレンス・物品準備などの間接業務時間の効率化を図ることで、さらなる患者直接ケア時間の確保が期待されます。`;

  slide2.addText(overallSummaryText, {
    x: 0.8,
    y: 5.85,
    w: 11.7,
    h: 1.0,
    fontSize: 11,
    fontFace: 'Meiryo',
    color: '334155',
    lineSpacing: 18,
  });

  // ----------------------------------------------------
  // SLIDE 3: 各病棟（部署）別 集計分析
  // ----------------------------------------------------
  const slide3 = pptx.addSlide();
  addSlideHeader(slide3, '2. 各病棟（部署）別 集計分析', '部署ごとの業務時間および直接看護割合の一覧比較');

  // 病棟別集計
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

  const deptRows: pptxgen.TableRow[] = [
    [
      { text: '部署名', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true } },
      { text: '人数', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '直接看護 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '間接看護 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: 'その他 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '合計 (h)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
      { text: '直接看護率 (%)', options: { fill: { color: '334155' }, color: 'FFFFFF', bold: true, align: 'right' } },
    ],
  ];

  const activeDepts = DEPARTMENTS.filter((d) => deptStatsMap[d] && deptStatsMap[d].count > 0);

  let topDept = '';
  let topDeptPct = -1;
  let lowDept = '';
  let lowDeptPct = 999;

  activeDepts.forEach((dept, idx) => {
    const st = deptStatsMap[dept];
    const totalH = st.direct + st.indirect + st.other;
    const directPct = totalH > 0 ? Math.round((st.direct / totalH) * 100) : 0;
    const bg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';

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

    deptRows.push([
      { text: dept, options: { fill: { color: bg }, bold: true } },
      { text: `${st.users.size}名`, options: { fill: { color: bg }, align: 'right' } },
      { text: `${st.direct.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: '0284C7' } },
      { text: `${st.indirect.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: '10B981' } },
      { text: `${st.other.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', color: 'A855F7' } },
      { text: `${totalH.toFixed(1)}`, options: { fill: { color: bg }, align: 'right', bold: true } },
      { text: `${directPct}%`, options: { fill: { color: bg }, align: 'right', bold: true, color: '0284C7' } },
    ]);
  });

  slide3.addTable(deptRows, {
    x: 0.6,
    y: 1.2,
    w: 12.1,
    colW: [2.5, 1.2, 1.6, 1.6, 1.6, 1.8, 1.8],
    fontSize: 10,
    fontFace: 'Meiryo',
    border: { pt: 1, color: 'E2E8F0' },
  });

  // 病棟別分析サマリカード
  slide3.addShape('rect', {
    x: 0.6,
    y: 5.4,
    w: 12.1,
    h: 1.6,
    fill: { color: 'F0F9FF' },
    line: { color: 'BAE6FD', width: 1 },
  });

  slide3.addText('💡 病棟（部署）別分析サマリ・特徴', {
    x: 0.8,
    y: 5.5,
    w: 11.7,
    h: 0.3,
    fontSize: 12,
    fontFace: 'Meiryo',
    color: '0369A1',
    bold: true,
  });

  const deptSummaryText = `・最も直接看護率が高い部署: 【${topDept || '該当なし'}】 (${topDeptPct >= 0 ? topDeptPct + '%' : '-'})
・最も間接・その他業務比率が高い部署: 【${lowDept || '該当なし'}】 (直接看護率 ${lowDeptPct < 999 ? lowDeptPct + '%' : '-'})
・病棟やICU・外来などの部署ごとに患者重症度や記録・搬送負担が異なり、各病棟の特性に応じた人員配置・タスク運用の検討が有効です。`;

  slide3.addText(deptSummaryText, {
    x: 0.8,
    y: 5.85,
    w: 11.7,
    h: 1.0,
    fontSize: 11,
    fontFace: 'Meiryo',
    color: '0C4A6E',
    lineSpacing: 18,
  });

  // ----------------------------------------------------
  // SLIDE 4: 各職種別 集計分析
  // ----------------------------------------------------
  const slide4 = pptx.addSlide();
  addSlideHeader(slide4, '3. 各職種別 集計分析', '職種（看護師・准看護師・看護助手等）ごとの業務時間比較');

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

  slide4.addTable(roleRows, {
    x: 0.6,
    y: 1.2,
    w: 12.1,
    colW: [2.5, 1.2, 1.6, 1.6, 1.6, 1.8, 1.8],
    fontSize: 11,
    fontFace: 'Meiryo',
    border: { pt: 1, color: 'E2E8F0' },
  });

  // 職種別分析サマリカード
  slide4.addShape('rect', {
    x: 0.6,
    y: 5.4,
    w: 12.1,
    h: 1.6,
    fill: { color: 'ECFDF5' },
    line: { color: 'A7F3D0', width: 1 },
  });

  slide4.addText('💡 職種別分析サマリ・タスクシフト考察', {
    x: 0.8,
    y: 5.5,
    w: 11.7,
    h: 0.3,
    fontSize: 12,
    fontFace: 'Meiryo',
    color: '047857',
    bold: true,
  });

  const roleSummaryText = `・看護師の直接看護率は【${nurseDirectPct >= 0 ? nurseDirectPct + '%' : 'データなし'}】、看護補助者の直接看護率は【${assistantDirectPct >= 0 ? assistantDirectPct + '%' : 'データなし'}】です。
・看護師の医療処置・記録業務と、看護補助者の身体ケア・環境整備等の役割分担（タスクシフト）が数値に表れています。
・看護補助者への周辺・環境業務の委譲を推進することで、看護師が高度な専門的ケアに集中できる体制構築が推奨されます。`;

  slide4.addText(roleSummaryText, {
    x: 0.8,
    y: 5.85,
    w: 11.7,
    h: 1.0,
    fontSize: 11,
    fontFace: 'Meiryo',
    color: '064E3B',
    lineSpacing: 18,
  });

  // ----------------------------------------------------
  // SLIDE 5: 年齢階層別 集計分析
  // ----------------------------------------------------
  const slide5 = pptx.addSlide();
  addSlideHeader(slide5, '4. 年齢階層別 集計分析', '年齢層（20代〜60代以上）別の業務バランス・直接看護率');

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

  slide5.addTable(ageRows, {
    x: 0.6,
    y: 1.2,
    w: 12.1,
    colW: [2.5, 1.2, 1.6, 1.6, 1.6, 1.8, 1.8],
    fontSize: 10,
    fontFace: 'Meiryo',
    border: { pt: 1, color: 'E2E8F0' },
  });

  // 年齢層別分析サマリカード
  slide5.addShape('rect', {
    x: 0.6,
    y: 5.4,
    w: 12.1,
    h: 1.6,
    fill: { color: 'F3E8FF' },
    line: { color: 'E9D5FF', width: 1 },
  });

  slide5.addText('💡 年齢層別分析サマリ・傾向', {
    x: 0.8,
    y: 5.5,
    w: 11.7,
    h: 0.3,
    fontSize: 12,
    fontFace: 'Meiryo',
    color: '7E22CE',
    bold: true,
  });

  const ageSummaryText = `・若手層（20代）の直接看護率は【${youngPct >= 0 ? youngPct + '%' : 'データなし'}】、ベテラン・管理層の直接看護率は【${seniorPct >= 0 ? seniorPct + '%' : 'データなし'}】です。
・若手層は患者直接ケア・処置のウェイトが高く、年齢・臨床ラダーが上昇するにつれて指導・管理・チーム調整業務の割合が増加する傾向にあります。
・年代・経験年数に応じた適切な業務配分と、若手へのプリセプター指導体制のバランス調整が効果的です。`;

  slide5.addText(ageSummaryText, {
    x: 0.8,
    y: 5.85,
    w: 11.7,
    h: 1.0,
    fontSize: 11,
    fontFace: 'Meiryo',
    color: '581C87',
    lineSpacing: 18,
  });

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
  } catch (err) {
    console.warn('Blob export fallback, trying writeFile:', err);
    await pptx.writeFile({ fileName });
  }
}
