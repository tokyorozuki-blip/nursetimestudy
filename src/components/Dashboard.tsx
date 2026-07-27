import React, { useState, useMemo } from 'react';
import { TimeStudyRecord } from '../types';
import { DEPARTMENTS, AGE_GROUPS, PRESET_TASKS } from '../constants';
import { exportRecordsToCSV } from '../utils/exportCsv';
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
  const [searchName, setSearchName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [viewMode, setViewMode] = useState<'standard' | 'annual'>('standard');

  // フィルタリング処理
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchRole =
        selectedRole === 'ALL' || (rec.user.role || '看護師') === selectedRole;
      const matchDept =
        selectedDepartment === 'ALL' || rec.user.department === selectedDepartment;
      const matchAge =
        selectedAgeGroup === 'ALL' || rec.user.ageGroup === selectedAgeGroup;
      const matchName =
        !searchName ||
        rec.user.name.toLowerCase().includes(searchName.toLowerCase()) ||
        (rec.user.staffId && rec.user.staffId.includes(searchName));
      return matchRole && matchDept && matchAge && matchName;
    });
  }, [records, selectedRole, selectedDepartment, selectedAgeGroup, searchName]);

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
        slot.selectedTaskIds.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') directCount += 15;
            else if (task.category === '間接看護業務') indirectCount += 15;
            else otherCount += 15;
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
        slot.selectedTaskIds.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') yearStats[year].direct += 0.25;
            else if (task.category === '間接看護業務') yearStats[year].indirect += 0.25;
            else yearStats[year].other += 0.25;
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
        slot.selectedTaskIds.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') deptStats[dept].direct += 0.25;
            else if (task.category === '間接看護業務') deptStats[dept].indirect += 0.25;
            else deptStats[dept].other += 0.25;
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
        slot.selectedTaskIds.forEach((taskId) => {
          const task = taskMap.get(taskId);
          if (task) {
            if (task.category === '直接看護業務') ageStats[age].direct += 0.25;
            else if (task.category === '間接看護業務') ageStats[age].indirect += 0.25;
            else ageStats[age].other += 0.25;
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
              📊 管理者モード (ピンク)
            </span>
          </h2>
          <p className="dash-sub">
            病棟別・個人別・年齢層および年単位（経年トレンド）での業務時間比較
          </p>
        </div>

        <div className="dash-actions flex items-center gap-2 flex-wrap">
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
          対象件数: <strong>{filteredRecords.length}</strong> 件
        </div>
      </div>

      {/* 4つのサマリーKPIカード */}
      <div className="kpi-grid">
        <div className="kpi-card border-sky">
          <div className="kpi-label">総提出人数 / データ件数</div>
          <div className="kpi-value text-sky-700">{filteredRecords.length} 人</div>
          <div className="kpi-sub">対象部署・属性の集計</div>
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

      {/* グラフエリア */}
      <div className="charts-grid">
        {/* 円グラフ */}
        <div className="chart-card">
          <h3 className="chart-title">
            <PieChart className="w-4 h-4 text-sky-600" />
            業務大分類の構成比 (%)
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
    </div>
  );
};
