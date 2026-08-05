import React, { useState, useMemo } from 'react';
import { TimeStudyRecord, getSlotDurationMinutes } from '../types';
import { DEPARTMENTS, AGE_GROUPS, PRESET_TASKS } from '../constants';
import { exportRecordsToCSV } from '../utils/exportCsv';
import { exportDashboardToPPTX } from '../utils/exportPptx';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Download,
  Printer,
  PieChart,
  RefreshCw,
  CalendarRange,
  Filter,
  Users,
  Search,
  BarChart2,
  FileText,
  Presentation,
  X,
  Check,
  Stethoscope,
  HeartHandshake,
  Lightbulb,
  TrendingUp,
  Copy,
  User,
  Building,
  Clock,
  ArrowRightLeft,
  Zap,
} from 'lucide-react';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface DashboardProps {
  records: TimeStudyRecord[];
  onGenerateMockData: () => void;
  onRefreshRecords?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  records,
  onGenerateMockData,
  onRefreshRecords,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [searchName, setSearchName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [viewMode, setViewMode] = useState<'standard' | 'annual'>('standard');
  const [dedupeMode, setDedupeMode] = useState<'latest' | 'all'>('latest');
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isExportingPptx, setIsExportingPptx] = useState<boolean>(false);

  // データ内に存在する全調査対象日を抽出（降順）
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    records.forEach((rec) => {
      if (rec.user && rec.user.targetDate) {
        datesSet.add(rec.user.targetDate);
      }
    });
    return Array.from(datesSet).sort().reverse();
  }, [records]);

  // 同一人物（職員ID + 調査対象日）の複数提出データを自動デデュープ（入力内容がある有効なデータを優先選択）
  const processedRecords = useMemo(() => {
    if (dedupeMode === 'all') return records;

    const bestMap = new Map<string, TimeStudyRecord>();

    const getFilledCount = (r: TimeStudyRecord) =>
      r.slots ? r.slots.filter((s) => s.selectedTaskIds && s.selectedTaskIds.length > 0).length : 0;

    records.forEach((rec) => {
      const key = `${rec.user.staffId || rec.user.name}_${rec.user.targetDate || ''}`;
      const existing = bestMap.get(key);

      if (!existing) {
        bestMap.set(key, rec);
      } else {
        const existingFilled = getFilledCount(existing);
        const currentFilled = getFilledCount(rec);

        // 入力コマ数が多い（有効なデータが入っている）方を優先採用！
        if (currentFilled > existingFilled) {
          bestMap.set(key, rec);
        }
      }
    });

    return Array.from(bestMap.values());
  }, [records, dedupeMode]);

  // フィルタリング処理
  const filteredRecords = useMemo(() => {
    return processedRecords.filter((rec) => {
      const matchRole =
        selectedRole === 'ALL' || (rec.user.role || '看護師') === selectedRole;
      const matchDept =
        selectedDepartment === 'ALL' || rec.user.department === selectedDepartment;
      const matchAge =
        selectedAgeGroup === 'ALL' || rec.user.ageGroup === selectedAgeGroup;
      const matchDate =
        selectedDate === 'ALL' || rec.user.targetDate === selectedDate;
      const matchName =
        !searchName ||
        rec.user.name.toLowerCase().includes(searchName.toLowerCase()) ||
        (rec.user.staffId && rec.user.staffId.includes(searchName));
      return matchRole && matchDept && matchAge && matchDate && matchName;
    });
  }, [processedRecords, selectedRole, selectedDepartment, selectedAgeGroup, selectedDate, searchName]);


  // 実人数 (ユニーク職員数) の算出
  const uniqueUserCount = useMemo(() => {
    const set = new Set<string>();
    filteredRecords.forEach((rec) => {
      set.add(rec.user.staffId || rec.user.name);
    });
    return set.size;
  }, [filteredRecords]);

  const taskMap = useMemo(() => {
    return new Map(PRESET_TASKS.map((t) => [t.id, t]));
  }, []);

  // 総時間・大分類ごとの集計
  const summaryStats = useMemo(() => {
    let directCount = 0;
    let indirectCount = 0;
    let otherCount = 0;

    filteredRecords.forEach((rec) => {
      rec.slots.forEach((slot) => {
        const mins = getSlotDurationMinutes(slot);
        slot.selectedTaskIds.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') directCount += mins;
            else if (task.category === '間接看護業務') indirectCount += mins;
            else otherCount += mins;
          }
        });
      });
    });

    const totalMinutes = directCount + indirectCount + otherCount || 1;
    return {
      directMinutes: directCount,
      indirectMinutes: indirectCount,
      otherMinutes: otherCount,
      totalMinutes,
      directPercent: Math.round((directCount / totalMinutes) * 100),
      indirectPercent: Math.round((indirectCount / totalMinutes) * 100),
      otherPercent: Math.round((otherCount / totalMinutes) * 100),
    };
  }, [filteredRecords, taskMap]);

  // 看護師・看護補助者それぞれの別々集計・分析要約算出
  const roleStats = useMemo(() => {
    const calcForRole = (targetRole?: '看護師' | '看護補助者') => {
      const recs = filteredRecords.filter((r) =>
        targetRole ? (r.user.role || '看護師') === targetRole : true
      );
      const uniqueUsers = new Set(recs.map((r) => r.user.staffId || r.user.name)).size;
      let directMins = 0;
      let indirectMins = 0;
      let otherMins = 0;

      recs.forEach((rec) => {
        rec.slots.forEach((slot) => {
          const mins = getSlotDurationMinutes(slot);
          slot.selectedTaskIds.forEach((tId) => {
            const t = taskMap.get(tId);
            if (t) {
              if (t.category === '直接看護業務') directMins += mins;
              else if (t.category === '間接看護業務') indirectMins += mins;
              else otherMins += mins;
            }
          });
        });
      });

      const totalMins = directMins + indirectMins + otherMins || 1;
      return {
        userCount: uniqueUsers,
        recordCount: recs.length,
        directMinutes: directMins,
        indirectMinutes: indirectMins,
        otherMinutes: otherMins,
        totalMinutes: totalMins,
        directPercent: Math.round((directMins / totalMins) * 100),
        indirectPercent: Math.round((indirectMins / totalMins) * 100),
        otherPercent: Math.round((otherMins / totalMins) * 100),
        avgDirectHours: (uniqueUsers > 0 ? directMins / 60 / uniqueUsers : 0).toFixed(1),
        avgTotalHours: (uniqueUsers > 0 ? totalMins / 60 / uniqueUsers : 0).toFixed(1),
      };
    };

    return {
      nurse: calcForRole('看護師'),
      aid: calcForRole('看護補助者'),
    };
  }, [filteredRecords, taskMap]);

  // 職種別（看護師 vs 看護補助者）の比較棒グラフデータ
  const roleComparisonChartData = useMemo(() => {
    return {
      labels: ['直接看護業務', '間接看護業務', 'その他・管理業務'],
      datasets: [
        {
          label: '🩺 看護師 (%)',
          data: [
            roleStats.nurse.directPercent,
            roleStats.nurse.indirectPercent,
            roleStats.nurse.otherPercent,
          ],
          backgroundColor: '#0284c7',
        },
        {
          label: '🤝 看護補助者 (%)',
          data: [
            roleStats.aid.directPercent,
            roleStats.aid.indirectPercent,
            roleStats.aid.otherPercent,
          ],
          backgroundColor: '#10b981',
        },
      ],
    };
  }, [roleStats]);

  // 各定型業務（タスク）への所要時間集計とランキング算出
  const taskTimeStats = useMemo(() => {
    const taskMinsMap = new Map<string, number>();

    filteredRecords.forEach((rec) => {
      rec.slots.forEach((slot) => {
        const mins = getSlotDurationMinutes(slot);
        slot.selectedTaskIds.forEach((tId) => {
          taskMinsMap.set(tId, (taskMinsMap.get(tId) || 0) + mins);
        });
      });
    });

    const totalAllMins = summaryStats.totalMinutes || 1;

    return PRESET_TASKS.map((task) => {
      const mins = taskMinsMap.get(task.id) || 0;
      return {
        ...task,
        totalMinutes: mins,
        totalHours: (mins / 60).toFixed(1),
        percent: ((mins / totalAllMins) * 100).toFixed(1),
        avgMinsPerUser: uniqueUserCount > 0 ? (mins / uniqueUserCount).toFixed(0) : '0',
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [filteredRecords, summaryStats.totalMinutes, uniqueUserCount]);

  // ⚡ 看護師×看護補助者 タスクシフト・シェアの移管可能時間および生産性創出試算
  const taskShiftSimulation = useMemo(() => {
    const shiftCandidates = [
      { id: 'env_prep', name: '環境整備・消毒', shiftRatio: 0.8, desc: '病室環境整備・消毒・ベッドメイクの補助者完全移管' },
      { id: 'supply_prep', name: '物品・薬品準備・補充', shiftRatio: 0.7, desc: '定時物品補充・リネン整理・備品点検の定常業務化' },
      { id: 'transport', name: '患者搬送・移動補助', shiftRatio: 0.75, desc: '検査・リハビリ・退院時搬送の補助者主体運用' },
      { id: 'meal_service', name: '配膳・下膳・食事配膳', shiftRatio: 0.85, desc: '配膳下膳・お茶配り等の完全補助者化' },
      { id: 'paperwork', name: '事務連絡・伝票整理', shiftRatio: 0.6, desc: '書類スキャン・伝票ファイル整理のクラーク/補助者化' },
    ];

    let totalShiftableMins = 0;
    const items = shiftCandidates.map((c) => {
      const nurseRecs = filteredRecords.filter((r) => (r.user.role || '看護師') === '看護師');
      let rnTaskMins = 0;

      nurseRecs.forEach((rec) => {
        rec.slots.forEach((slot) => {
          const mins = getSlotDurationMinutes(slot);
          if (slot.selectedTaskIds.includes(c.id)) {
            rnTaskMins += mins;
          }
        });
      });

      const shiftableMins = Math.round(rnTaskMins * c.shiftRatio);
      totalShiftableMins += shiftableMins;

      return {
        ...c,
        rnTaskHours: (rnTaskMins / 60).toFixed(1),
        shiftableHours: (shiftableMins / 60).toFixed(1),
      };
    });

    const totalShiftableHours = (totalShiftableMins / 60).toFixed(1);
    const freedMinsPerNursePerDay = roleStats.nurse.userCount > 0 ? (totalShiftableMins / roleStats.nurse.userCount).toFixed(0) : '0';

    return {
      items,
      totalShiftableHours,
      freedMinsPerNursePerDay,
    };
  }, [filteredRecords, roleStats.nurse.userCount]);

  // AI要約＆生産性向上提案テキストの生成
  const generateTextSummaryReport = () => {
    const today = new Date().toLocaleDateString('ja-JP');
    const top5Tasks = taskTimeStats.slice(0, 5).map((t, i) => `${i + 1}. ${t.name} (${t.category}): ${t.totalHours}時間 [${t.percent}%]`).join('\n  ');
    const shiftItemsText = taskShiftSimulation.items.map((it) => `  ・${it.name}: 看護師所要 ${it.rnTaskHours}時間 ➔ 補助者へ移管可能: ${it.shiftableHours}時間 (${it.desc})`).join('\n');

    return `【看護業務タイムスタディ・タスクシフト/シェア戦略＆生産性向上総合レポート】
作成日時: ${today}
対象データ: 全${filteredRecords.length}件 (実提出人数: ${uniqueUserCount}名)

==================================================
1. 各業務への所要時間ランキング (Top 5)
==================================================
  ${top5Tasks}

==================================================
2. 看護師 (RN) vs 看護補助者 (NA) 業務比較
==================================================
■ 看護師 (RN): 対象 ${roleStats.nurse.userCount}名
  ・直接看護: ${roleStats.nurse.directPercent}% (${Math.round(roleStats.nurse.directMinutes / 60)}h) / 間接: ${roleStats.nurse.indirectPercent}% / その他: ${roleStats.nurse.otherPercent}%
■ 看護補助者 (NA): 対象 ${roleStats.aid.userCount}名
  ・直接ケア: ${roleStats.aid.directPercent}% (${Math.round(roleStats.aid.directMinutes / 60)}h) / 間接サポート: ${roleStats.aid.indirectPercent}% / その他: ${roleStats.aid.otherPercent}%

==================================================
3. 看護師×看護補助者 タスクシフト・タスクシェア戦略 (移管試算)
==================================================
⚡ 看護師から看護補助者への移管可能時間総計: 【${taskShiftSimulation.totalShiftableHours} 時間】
⚡ 看護師1人あたり創出可能な直接患者ケア時間: 【1日あたり 約 ${taskShiftSimulation.freedMinsPerNursePerDay} 分】

【移管対象業務の内訳とアクション】:
${shiftItemsText}

==================================================
4. 生産性向上・業務効率化ロードマップ (短期・中期・長期)
==================================================
🚀 【短期施策 (1ヶ月)】 タスクシフト初期導入と5S活動
  ・配膳・下膳、環境整備、リネン補充の完全補助者化。
  ・共有備品・医療機器の定位置管理による探索時間カット。

🚀 【中期施策 (3ヶ月)】 カンファレンス縮小・記録テンプレート化
  ・申し送り事項の要約化、電子カルテ定型文（テンプレート）活用。
  ・処置・検温ピーク時間帯（10時・14時）への補助者重点配置。

🚀 【長期施策 (6ヶ月〜)】 ICT/DX活用と構造的変革
  ・モバイル端末やカルテ音声入力の定着によるリアルタイム入力完結。
  ・重症度・看護必要度に応じた最適要員配置の確立。`;
  };

  // ★ 年単位（年別）での業務量・直接看護率比較データの算出
  const annualComparisonData = useMemo(() => {
    const yearStats: Record<
      string,
      { direct: number; indirect: number; other: number }
    > = {};

    filteredRecords.forEach((rec) => {
      const year = rec.user.targetDate ? rec.user.targetDate.split('-')[0] : '2026';
      if (!yearStats[year]) {
        yearStats[year] = { direct: 0, indirect: 0, other: 0 };
      }
      rec.slots.forEach((slot) => {
        const hours = getSlotDurationMinutes(slot) / 60;
        slot.selectedTaskIds.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') yearStats[year].direct += hours;
            else if (task.category === '間接看護業務') yearStats[year].indirect += hours;
            else yearStats[year].other += hours;
          }
        });
      });
    });

    const sortedYears = Object.keys(yearStats).sort();

    return {
      labels: sortedYears.map((y) => `${y}年`),
      datasets: [
        {
          label: '直接看護時間 (合計)',
          data: sortedYears.map((y) => Math.round(yearStats[y].direct)),
          backgroundColor: '#0284c7',
        },
        {
          label: '間接看護時間 (合計)',
          data: sortedYears.map((y) => Math.round(yearStats[y].indirect)),
          backgroundColor: '#10b981',
        },
        {
          label: 'その他管理時間 (合計)',
          data: sortedYears.map((y) => Math.round(yearStats[y].other)),
          backgroundColor: '#a855f7',
        },
      ],
    };
  }, [filteredRecords, taskMap]);

  // 円グラフ
  const pieChartData = {
    labels: ['直接看護業務', '間接看護業務', 'その他・管理業務'],
    datasets: [
      {
        data: [
          summaryStats.directMinutes / 60,
          summaryStats.indirectMinutes / 60,
          summaryStats.otherMinutes / 60,
        ],
        backgroundColor: ['#0284c7', '#10b981', '#a855f7'],
        borderColor: ['#ffffff', '#ffffff', '#ffffff'],
        borderWidth: 2,
      },
    ],
  };

  // 部署別
  const deptBarChartData = useMemo(() => {
    const deptStats: Record<
      string,
      { direct: number; indirect: number; other: number }
    > = {};

    DEPARTMENTS.forEach((d) => {
      deptStats[d] = { direct: 0, indirect: 0, other: 0 };
    });

    filteredRecords.forEach((rec) => {
      const dept = rec.user.department;
      if (!deptStats[dept]) {
        deptStats[dept] = { direct: 0, indirect: 0, other: 0 };
      }
      rec.slots.forEach((slot) => {
        const hours = getSlotDurationMinutes(slot) / 60;
        slot.selectedTaskIds.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') deptStats[dept].direct += hours;
            else if (task.category === '間接看護業務') deptStats[dept].indirect += hours;
            else deptStats[dept].other += hours;
          }
        });
      });
    });

    const activeDepts = DEPARTMENTS.filter(
      (d) => selectedDepartment === 'ALL' || selectedDepartment === d
    );

    return {
      labels: activeDepts,
      datasets: [
        {
          label: '直接看護(時間)',
          data: activeDepts.map((d) => Math.round(deptStats[d].direct)),
          backgroundColor: '#0284c7',
        },
        {
          label: '間接看護(時間)',
          data: activeDepts.map((d) => Math.round(deptStats[d].indirect)),
          backgroundColor: '#10b981',
        },
        {
          label: 'その他・管理(時間)',
          data: activeDepts.map((d) => Math.round(deptStats[d].other)),
          backgroundColor: '#a855f7',
        },
      ],
    };
  }, [filteredRecords, selectedDepartment, taskMap]);

  // 年齢階層別
  const ageBarChartData = useMemo(() => {
    const ageStats: Record<
      string,
      { direct: number; indirect: number; other: number }
    > = {};

    AGE_GROUPS.forEach((a) => {
      ageStats[a] = { direct: 0, indirect: 0, other: 0 };
    });

    filteredRecords.forEach((rec) => {
      const age = rec.user.ageGroup;
      if (!ageStats[age]) {
        ageStats[age] = { direct: 0, indirect: 0, other: 0 };
      }
      rec.slots.forEach((slot) => {
        const hours = getSlotDurationMinutes(slot) / 60;
        slot.selectedTaskIds.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') ageStats[age].direct += hours;
            else if (task.category === '間接看護業務') ageStats[age].indirect += hours;
            else ageStats[age].other += hours;
          }
        });
      });
    });

    return {
      labels: AGE_GROUPS,
      datasets: [
        {
          label: '直接看護率 (%)',
          data: AGE_GROUPS.map((a) => {
            const total =
              ageStats[a].direct + ageStats[a].indirect + ageStats[a].other || 1;
            return Math.round((ageStats[a].direct / total) * 100);
          }),
          backgroundColor: '#3b82f6',
        },
      ],
    };
  }, [filteredRecords, taskMap]);

  return (
    <div className="dashboard-container">
      {/* ダッシュボードヘッダー */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title text-rose-900 flex items-center gap-2 flex-wrap">
            <PieChart className="w-6 h-6 text-pink-600 inline-icon" />
            <span>看護業務量 視覚化・集計ダッシュボード</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700 border border-pink-300">
              📊 管理者モード
            </span>
          </h2>
          <p className="dash-sub">
            病棟別・個人別・年齢層および年単位（経年トレンド）での業務時間比較
          </p>
        </div>

        <div className="dash-actions flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="py-2.5 px-4 rounded-xl font-black text-xs text-white bg-purple-600 hover:bg-purple-700 shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            onClick={() => setShowSummaryModal(true)}
            title="看護師・看護補助者それぞれの分析要約＆生産性向上提案レポートを表示"
          >
            <FileText className="w-4 h-4" />
            <span>要約＆生産性向上提案レポート</span>
          </button>
          {onRefreshRecords && (
            <button
              type="button"
              disabled={isUpdating}
              className={`py-2.5 px-4 rounded-xl font-black text-xs text-white shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isUpdating ? 'bg-sky-400 opacity-80 cursor-wait' : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700'
              }`}
              onClick={async () => {
                setIsUpdating(true);
                setSyncStatusMsg('');
                try {
                  await onRefreshRecords();
                  setSyncStatusMsg(`✅ クラウドから最新データ (${records.length}件) を読み込んでダッシュボードを更新しました！`);
                } catch (err: any) {
                  setSyncStatusMsg(`⚠️ 同期エラー: ${err?.message || '最新データの読み込みに失敗しました'}`);
                } finally {
                  setTimeout(() => setIsUpdating(false), 500);
                }
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? '最新データを同期中...' : '🔄 クラウドの最新データを同期してダッシュボードを更新'}</span>
            </button>
          )}

          {/* 年単位比較表示切替ボタン */}
          <button
            className={`btn-dash ${viewMode === 'annual' ? 'btn-active-annual' : 'btn-mock'}`}
            onClick={() => setViewMode(viewMode === 'standard' ? 'annual' : 'standard')}
          >
            <CalendarRange className="w-4 h-4 text-purple-600" />
            <span>{viewMode === 'annual' ? '通常分析表示に戻る' : '年単位での業務量比較モード'}</span>
          </button>

          <button className="btn-dash btn-csv" onClick={() => exportRecordsToCSV(filteredRecords)}>
            <Download className="w-4 h-4" />
            <span>CSV出力</span>
          </button>

          {/* 📊 PowerPoint (.pptx) 出力ボタン */}
          <button
            type="button"
            disabled={isExportingPptx}
            className={`btn-dash font-extrabold shadow-sm active:scale-95 transition-all border-0 flex items-center gap-1.5 cursor-pointer text-white ${
              isExportingPptx
                ? 'bg-amber-400 opacity-80 cursor-wait'
                : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'
            }`}
            onClick={async () => {
              setIsExportingPptx(true);
              try {
                await exportDashboardToPPTX(filteredRecords, {
                  selectedDepartment,
                  selectedRole,
                  selectedAgeGroup,
                  selectedDate,
                });
              } catch (err: any) {
                alert(`PowerPointの出力中にエラーが発生しました: ${err?.message || err}`);
              } finally {
                setTimeout(() => setIsExportingPptx(false), 500);
              }
            }}
          >
            <Presentation className={`w-4 h-4 text-amber-100 ${isExportingPptx ? 'animate-spin' : ''}`} />
            <span>{isExportingPptx ? 'PowerPoint作成中...' : 'PowerPoint出力 (.pptx)'}</span>
          </button>

          <button className="btn-dash btn-print" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            <span>レポート印刷</span>
          </button>
        </div>
      </div>

      {/* 年単位比較ビューモードの時 */}
      {viewMode === 'annual' ? (
        <div className="admin-section">
          <h3 className="chart-title text-purple-800">
            <CalendarRange className="w-5 h-5 text-purple-600 inline-icon" />
            年単位（年度・年別）看護業務量の経年比較分析
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            過去数年間の直接看護・間接看護・その他業務時間の推移を可視化します。
          </p>
          <div className="chart-wrapper bar-wrapper">
            <Bar
              data={annualComparisonData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { stacked: false },
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      ) : null}

      {/* フィルタバー */}
      <div className="filter-bar">
        <div className="filter-item">
          <CalendarRange className="w-4 h-4 text-purple-600" />
          <label>調査対象日絞り込み:</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="font-bold text-slate-800"
          >
            <option value="ALL">全期間・全対象日 ({availableDates.length}日分)</option>
            {availableDates.map((dateStr) => (
              <option key={dateStr} value={dateStr}>
                {dateStr}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <Filter className="w-4 h-4 text-slate-500" />
          <label>職種絞り込み:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="ALL">全職種 (全体)</option>
            <option value="看護師">看護師</option>
            <option value="看護補助者">看護補助者</option>
          </select>
        </div>

        <div className="filter-item">
          <Filter className="w-4 h-4 text-slate-500" />
          <label>部署絞り込み:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="ALL">全18部署 (全体)</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <Users className="w-4 h-4 text-slate-500" />
          <label>年齢層絞り込み:</label>
          <select
            value={selectedAgeGroup}
            onChange={(e) => setSelectedAgeGroup(e.target.value)}
          >
            <option value="ALL">全年齢階層</option>
            {AGE_GROUPS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <label>重複データ処理:</label>
          <select
            value={dedupeMode}
            onChange={(e) => setDedupeMode(e.target.value as 'latest' | 'all')}
          >
            <option value="latest">最新提出のみ (重複除外・推奨)</option>
            <option value="all">全提出履歴を含む</option>
          </select>
        </div>

        <div className="filter-item search-item">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="氏名または職員ID(6桁)で検索..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>

        <div className="filter-count">
          対象人数: <strong>{uniqueUserCount}</strong> 人 （集計: {filteredRecords.length} 件）
        </div>
      </div>

      {/* 4つのサマリーKPIカード */}
      <div className="kpi-grid">
        <div className="kpi-card border-sky">
          <div className="kpi-label">実提出人数 (重複除外済)</div>
          <div className="kpi-value text-sky-700">{uniqueUserCount} 人</div>
          <div className="kpi-sub">集計データ: {filteredRecords.length} 件</div>
        </div>

        <div className="kpi-card border-blue">
          <div className="kpi-label">直接看護割合</div>
          <div className="kpi-value text-blue-600">{summaryStats.directPercent}%</div>
          <div className="kpi-sub">合計: {Math.round(summaryStats.directMinutes / 60)} 時間</div>
        </div>

        <div className="kpi-card border-emerald">
          <div className="kpi-label">間接看護割合</div>
          <div className="kpi-value text-emerald-600">{summaryStats.indirectPercent}%</div>
          <div className="kpi-sub">合計: {Math.round(summaryStats.indirectMinutes / 60)} 時間</div>
        </div>

        <div className="kpi-card border-purple">
          <div className="kpi-label">その他・管理業務割合</div>
          <div className="kpi-value text-purple-600">{summaryStats.otherPercent}%</div>
          <div className="kpi-sub">合計: {Math.round(summaryStats.otherMinutes / 60)} 時間</div>
        </div>
      </div>

      {/* 🩺 看護師 vs 🤝 看護補助者 それぞれの集計・分析要約カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* 看護師サマリーカード */}
        <div className="bg-sky-50/80 border-2 border-sky-300 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-sky-200 pb-2">
            <div className="flex items-center gap-2 font-black text-sky-950 text-base">
              <Stethoscope className="w-5 h-5 text-sky-600" />
              <span>🩺 看護師 (RN) 集計・分析要約</span>
            </div>
            <span className="bg-sky-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full">
              対象 {roleStats.nurse.userCount} 名
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-sky-200">
              <div className="text-[11px] font-bold text-slate-500">直接看護率</div>
              <div className="text-lg font-black text-sky-700">{roleStats.nurse.directPercent}%</div>
              <div className="text-[10px] text-slate-400">{Math.round(roleStats.nurse.directMinutes / 60)}時間</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-sky-200">
              <div className="text-[11px] font-bold text-slate-500">間接看護率</div>
              <div className="text-lg font-black text-emerald-700">{roleStats.nurse.indirectPercent}%</div>
              <div className="text-[10px] text-slate-400">{Math.round(roleStats.nurse.indirectMinutes / 60)}時間</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-sky-200">
              <div className="text-[11px] font-bold text-slate-500">その他管理率</div>
              <div className="text-lg font-black text-purple-700">{roleStats.nurse.otherPercent}%</div>
              <div className="text-[10px] text-slate-400">{Math.round(roleStats.nurse.otherMinutes / 60)}時間</div>
            </div>
          </div>

          <div className="text-xs text-sky-900 font-semibold bg-white/80 p-2.5 rounded-xl border border-sky-200">
            💡 看護師1人あたりの平均直接看護時間: <strong>{roleStats.nurse.avgDirectHours} 時間</strong>
          </div>
        </div>

        {/* 看護補助者サマリーカード */}
        <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
            <div className="flex items-center gap-2 font-black text-emerald-950 text-base">
              <HeartHandshake className="w-5 h-5 text-emerald-600" />
              <span>🤝 看護補助者 (NA) 集計・分析要約</span>
            </div>
            <span className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full">
              対象 {roleStats.aid.userCount} 名
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-bold text-slate-500">直接ケア率</div>
              <div className="text-lg font-black text-sky-700">{roleStats.aid.directPercent}%</div>
              <div className="text-[10px] text-slate-400">{Math.round(roleStats.aid.directMinutes / 60)}時間</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-bold text-slate-500">間接サポート</div>
              <div className="text-lg font-black text-emerald-700">{roleStats.aid.indirectPercent}%</div>
              <div className="text-[10px] text-slate-400">{Math.round(roleStats.aid.indirectMinutes / 60)}時間</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-bold text-slate-500">その他管理率</div>
              <div className="text-lg font-black text-purple-700">{roleStats.aid.otherPercent}%</div>
              <div className="text-[10px] text-slate-400">{Math.round(roleStats.aid.otherMinutes / 60)}時間</div>
            </div>
          </div>

          <div className="text-xs text-emerald-900 font-semibold bg-white/80 p-2.5 rounded-xl border border-emerald-200">
            💡 看護補助者1人あたりの平均ケア時間: <strong>{roleStats.aid.avgDirectHours} 時間</strong>
          </div>
        </div>
      </div>

      {/* 💡 生産性向上の検討・タスクシフト提案カード */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 md:p-5 shadow-sm space-y-3 mb-6">
        <div className="flex items-center gap-2 text-amber-950 font-black text-base md:text-lg border-b border-amber-200 pb-2">
          <Lightbulb className="w-6 h-6 text-amber-600 shrink-0" />
          <span>🚀 生産性向上の検討・タスクシフト具体的提案</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1.5 shadow-xs">
            <div className="text-xs font-black text-amber-900 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>① 看護師から補助者へのタスクシフト</span>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              環境整備・リネン交換・患者搬送・配膳下膳を看護補助者へ集約。看護師の直接看護時間を <strong>15〜20% 拡大</strong>。
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1.5 shadow-xs">
            <div className="text-xs font-black text-amber-900 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>② DX/ICTツールによる間接短縮</span>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              モバイル端末や記録省力化ツールの導入により、書類・カルテ作成時間を1日あたり <strong>30分/人 削減</strong>。
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1.5 shadow-xs">
            <div className="text-xs font-black text-amber-900 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>③ ピーク時間帯の配置最適化</span>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              申し送り・検温・処置ピーク時間（10:00, 14:00等）への看護補助者シフト配置による <strong>残業削減・定時退勤促進</strong>。
            </p>
          </div>
        </div>
      </div>

      {/* ⚡ 看護師×看護補助者 タスクシフト・タスクシェア戦略＆生産性向上シミュレーション */}
      <div className="bg-white border-2 border-purple-300 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between border-b border-purple-200 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base md:text-lg">
            <ArrowRightLeft className="w-5 h-5 text-purple-600 shrink-0" />
            <span>⚡ 看護師×看護補助者 タスクシフト・シェア戦略 ＆ 生産性向上シミュレーション</span>
          </div>
          <span className="bg-purple-100 text-purple-800 font-extrabold text-xs px-3 py-1 rounded-full border border-purple-300">
            創出可能直接ケア時間: 看護師1人あたり1日 <strong>約{taskShiftSimulation.freedMinsPerNursePerDay}分</strong>
          </span>
        </div>

        {/* タスクシフト対象業務の一覧と移管可能時間の試算テーブル */}
        <div className="table-responsive">
          <table className="dash-table">
            <thead>
              <tr className="bg-slate-900 text-white text-xs">
                <th>タスクシフト対象業務</th>
                <th>現在看護師が費やしている時間</th>
                <th>補助者へ移管可能な時間 (試算)</th>
                <th>移管・連携のアクション・期待効果</th>
              </tr>
            </thead>
            <tbody>
              {taskShiftSimulation.items.map((item) => (
                <tr key={item.id} className="text-xs">
                  <td className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{item.name}</span>
                  </td>
                  <td className="text-rose-700 font-bold text-right">{item.rnTaskHours} 時間</td>
                  <td className="text-emerald-700 font-black text-right bg-emerald-50">{item.shiftableHours} 時間</td>
                  <td className="text-slate-700 font-semibold">{item.desc}</td>
                </tr>
              ))}
              <tr className="bg-purple-50 font-black text-xs">
                <td className="text-purple-950">合 計（移管可能な業務時間総枠）</td>
                <td className="text-right text-slate-500">-</td>
                <td className="text-right text-emerald-800 text-sm font-black">{taskShiftSimulation.totalShiftableHours} 時間</td>
                <td className="text-purple-900">
                  看護補助者チームへ移管完了時、看護師の直接患者ケア時間を <strong>+{taskShiftSimulation.totalShiftableHours}時間</strong> 拡大可能！
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 生産性向上ロードマップ (短期・中期・長期) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-sky-50/80 border border-sky-200 p-3.5 rounded-xl space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 font-black text-sky-950 text-xs">
              <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>【短期施策 (1ヶ月)】 タスクシフト初期導入</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              配膳・下膳・環境整備・リネン補充の完全補助者化および5S活動（物品定位置管理）による検索時間の短縮。
            </p>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 font-black text-emerald-950 text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
              <span>【中期施策 (3ヶ月)】 カンファレンス＆記録効率化</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              申し送り事項の要約化・電子カルテ定型文（テンプレート）活用および処置ピーク時間（10時/14時）の補助者重点配置。
            </p>
          </div>

          <div className="bg-purple-50/80 border border-purple-200 p-3.5 rounded-xl space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 font-black text-purple-950 text-xs">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
              <span>【長期施策 (6ヶ月〜)】 ICT/DX活用と構造変革</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              モバイル端末・音声記録入力の定着によるリアルタイム入力完結、および重症度・看護必要度に応じた最適要員配置。
            </p>
          </div>
        </div>
      </div>

      {/* ⏱️ 各業務への所要時間ランキング ＆ 改善点分析 (個人視点 ＆ 病棟視点) */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 mb-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base md:text-lg">
            <Clock className="w-5 h-5 text-sky-600 shrink-0" />
            <span>⏱️ 各業務への所要時間ランキング ＆ 改善点分析</span>
          </div>
          <span className="text-xs text-slate-500 font-bold">
            全{taskTimeStats.length}業務の所要時間を集計
          </span>
        </div>

        {/* 所要時間Top6カードグリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {taskTimeStats.slice(0, 6).map((task, idx) => (
            <div key={task.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-400">#{idx + 1}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-md font-bold"
                  style={{ backgroundColor: task.badgeBg, color: task.color }}
                >
                  {task.category}
                </span>
              </div>
              <div className="font-extrabold text-sm text-slate-900 truncate">{task.name}</div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-lg font-black text-sky-700">{task.totalHours} <span className="text-xs font-normal">時間</span></span>
                <span className="text-xs font-bold text-slate-500">全体 {task.percent}%</span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold">1人平均: 約{task.avgMinsPerUser}分</div>
            </div>
          ))}
        </div>

        {/* 個人視点 ＆ 病棟視点 改善点カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* 個人視点での改善点 */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-blue-950 font-black text-sm border-b border-blue-200 pb-1.5">
              <User className="w-4 h-4 text-blue-600 shrink-0" />
              <span>👤 個人視点（Personal）での改善点</span>
            </div>
            <ul className="text-xs text-slate-700 space-y-1.5 font-medium list-disc pl-4 leading-relaxed">
              <li>
                <strong>記録のリアルタイム化</strong>: 処置・バイタル測定直後の即時入力で、勤務終盤へのカルテ入力集中（残業化）を防止。
              </li>
              <li>
                <strong>タイムマネジメントの意識</strong>: 急変や割り込みに備え、定常的な事務・整理作業を事前にスケジュール枠固定化。
              </li>
              <li>
                <strong>事前の物品準備徹底</strong>: 訪室前に必要薬剤・器具をマルチカートに集約し、病室〜ステーション間往復を短縮。
              </li>
            </ul>
          </div>

          {/* 病棟視点での改善点 */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-purple-950 font-black text-sm border-b border-purple-200 pb-1.5">
              <Building className="w-4 h-4 text-purple-600 shrink-0" />
              <span>🏥 病棟的視点（Ward/System）での改善点</span>
            </div>
            <ul className="text-xs text-slate-700 space-y-1.5 font-medium list-disc pl-4 leading-relaxed">
              <li>
                <strong>タスクシフトの組織的標準化</strong>: リネン交換・環境整備・患者搬送・配膳を看護補助者チームへ集約（看護師ケア時間+15%）。
              </li>
              <li>
                <strong>5S活動による動線短縮</strong>: 共有備品・医療機器の定位置化と定時補充ルールの統一で捜索時間を病棟全体でカット。
              </li>
              <li>
                <strong>ピーク時間帯の配置平準化</strong>: 10時・14時の検温・申し送りピークへ合わせた応援配置とカンファレンス短縮。
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* グラフエリア */}
      <div className="charts-grid">
        {/* 職種別（看護師 vs 看護補助者）業務構成比較グラフ */}
        <div className="chart-card">
          <h3 className="chart-title">
            <BarChart2 className="w-4 h-4 text-sky-600" />
            職種別 (看護師 vs 看護補助者) 業務構成比較 (%)
          </h3>
          <div className="chart-wrapper">
            <Bar
              data={roleComparisonChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { max: 100, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>

        {/* 円グラフ */}
        <div className="chart-card">
          <h3 className="chart-title">
            <PieChart className="w-4 h-4 text-sky-600" />
            全体 業務大分類の構成比 (%)
          </h3>
          <div className="chart-wrapper pie-wrapper">
            <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* 年齢階層別 */}
        <div className="chart-card">
          <h3 className="chart-title">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            年齢階層別 (20歳〜5歳刻み) 直接看護率 (%)
          </h3>
          <div className="chart-wrapper">
            <Bar
              data={ageBarChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { max: 100, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>

        {/* 部署別 */}
        <div className="chart-card full-width-chart">
          <h3 className="chart-title">
            <BarChart2 className="w-4 h-4 text-purple-600" />
            部署別 (18部署) 業務時間分布 (積み上げ時間)
          </h3>
          <div className="chart-wrapper bar-wrapper">
            <Bar
              data={deptBarChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { stacked: true },
                  y: { stacked: true },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* 個人別集計データテーブル */}
      <div className="table-card">
        <h3 className="table-title">
          <Users className="w-4 h-4 text-slate-600" />
          個人別 業務量詳細一覧
        </h3>

        <div className="table-responsive">
          <table className="dash-table">
            <thead>
              <tr>
                <th>職員ID</th>
                <th>氏名</th>
                <th>職種</th>
                <th>部署</th>
                <th>年齢層</th>
                <th>対象日</th>
                <th>直接看護時間</th>
                <th>間接看護時間</th>
                <th>その他時間</th>
                <th>データID</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.slice(0, 50).map((rec) => {
                let dMin = 0;
                let iMin = 0;
                let oMin = 0;

                rec.slots.forEach((slot) => {
                  slot.selectedTaskIds.forEach((tId) => {
                    const task = taskMap.get(tId);
                    if (task) {
                      if (task.category === '直接看護業務') dMin += 15;
                      else if (task.category === '間接看護業務') iMin += 15;
                      else oMin += 15;
                    }
                  });
                });

                return (
                  <tr key={rec.id}>
                    <td className="font-mono text-slate-700 font-bold">{rec.user.staffId || '-'}</td>
                    <td className="font-bold">{rec.user.name}</td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${rec.user.role === '看護補助者' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                        {rec.user.role || '看護師'}
                      </span>
                    </td>
                    <td><span className="dept-tag">{rec.user.department}</span></td>
                    <td>{rec.user.ageGroup}</td>
                    <td>{rec.user.targetDate}</td>
                    <td className="text-sky-700 font-semibold">{(dMin / 60).toFixed(1)} 時間</td>
                    <td className="text-emerald-700 font-semibold">{(iMin / 60).toFixed(1)} 時間</td>
                    <td className="text-purple-700 font-semibold">{(oMin / 60).toFixed(1)} 時間</td>
                    <td className="text-xs text-slate-400">{rec.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* 要約・生産性向上提案レポートモーダル */}
      {showSummaryModal && (
        <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className="modal-card max-w-2xl w-full p-6 space-y-4 animate-scaleUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-black text-slate-900 text-lg">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>職種別集計分析＆生産性向上検討提案レポート</span>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                onClick={() => setShowSummaryModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-y-auto max-h-[60vh] whitespace-pre-wrap leading-relaxed">
              {generateTextSummaryReport()}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs"
                onClick={() => setShowSummaryModal(false)}
              >
                閉じる
              </button>

              <button
                type="button"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(generateTextSummaryReport());
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2500);
                }}
              >
                {copiedText ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>コピー完了！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>レポート全文をコピー</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
