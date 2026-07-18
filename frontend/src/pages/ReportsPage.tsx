import { motion } from 'framer-motion';
import { Download, FileText, BarChart3, Shield, TrendingUp, Lightbulb, Map, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { useReportDownload, useDashboard, useScore } from '../hooks/useAnalytics';
import { formatCurrency, getScoreColor } from '../lib/utils';

const SECTIONS = [
  { icon: FileText, title: 'Executive Summary', description: 'High-level overview of cloud spend, savings, and ROI' },
  { icon: Lightbulb, title: 'Savings Opportunities', description: 'Breakdown by service with annual projections' },
  { icon: BarChart3, title: 'Recommendation Breakdown', description: 'Prioritized optimization actions by category' },
  { icon: TrendingUp, title: 'Prophet Forecast', description: 'Three-month cost projections with confidence intervals' },
  { icon: Shield, title: 'FinOps Score', description: 'Cloud efficiency score with improvement roadmap' },
  { icon: Map, title: 'Implementation Roadmap', description: 'Phased execution plan from quick wins to strategic actions' },
];

export default function ReportsPage() {
  const download = useReportDownload();
  const dashboard = useDashboard();
  const score = useScore();

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate and download executive optimization reports"
        actions={
          <button
            onClick={() => download.mutate()}
            disabled={download.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
          >
            {download.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {download.isPending ? 'Generating...' : 'Download PDF Report'}
          </button>
        }
      />

      <div className="space-y-6">
        {/* Report preview card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-8"
        >
          <div className="flex items-start gap-6">
            <div className="rounded-xl bg-blue-600/10 p-4">
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-zinc-100 mb-1">Cloud Optimization Report</h2>
              <p className="text-sm text-zinc-500 mb-4">
                Comprehensive analysis of your cloud infrastructure with actionable recommendations
              </p>

              {/* Quick stats */}
              {dashboard.data && score.data && (
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs text-zinc-500">Monthly Spend</span>
                    <p className="text-sm font-semibold text-zinc-200">{formatCurrency(dashboard.data.monthlySpend)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Potential Savings</span>
                    <p className="text-sm font-semibold text-emerald-400">{formatCurrency(dashboard.data.potentialSavings)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">FinOps Score</span>
                    <p className="text-sm font-semibold" style={{ color: getScoreColor(score.data.score) }}>
                      {score.data.score}/100
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Report sections */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Report Sections</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTIONS.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors"
              >
                <section.icon className="h-5 w-5 text-zinc-500 mb-3" />
                <h4 className="text-sm font-medium text-zinc-200 mb-1">{section.title}</h4>
                <p className="text-xs text-zinc-500">{section.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Download success */}
        {download.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-2"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">Report downloaded successfully</span>
          </motion.div>
        )}
      </div>
    </>
  );
}
