import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Shield, TrendingUp, FileText, ArrowRight, CloudLightning, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { UploadWizard } from '../components/upload/UploadWizard';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Cost Intelligence',
    description: 'Real-time visibility into your cloud spend across EC2, S3, EBS, and RDS.',
  },
  {
    icon: Shield,
    title: 'FinOps Health Score',
    description: 'Automated scoring with actionable penalties and rewards.',
  },
  {
    icon: TrendingUp,
    title: 'Prophet Forecasting',
    description: 'Meta Prophet-powered cost projections with confidence intervals.',
  },
  {
    icon: FileText,
    title: 'Executive Reports',
    description: 'One-click PDF reports with savings roadmap and recommendations.',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'csv' | 'aws'>('csv');
  const [awsLoading, setAwsLoading] = useState(false);
  const [awsError, setAwsError] = useState<string | null>(null);
  const [awsSuccess, setAwsSuccess] = useState(false);

  const handleConnectAWS = async () => {
    setAwsLoading(true);
    setAwsError(null);
    setAwsSuccess(false);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/aws/dashboard`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'AWS credentials not configured.');
      }
      setAwsSuccess(true);
      localStorage.setItem('cloudsight_live_mode', 'true');
      setTimeout(() => {
        navigate('/aws/dashboard');
      }, 1500);
    } catch (err: any) {
      setAwsError(err.message || 'Could not connect to AWS. Please check your credentials.');
    } finally {
      setAwsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 mb-6">
              <span className="text-xs font-medium text-blue-400">Cloud Cost Intelligence Platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-zinc-100 tracking-tight mb-4">
              Optimize your cloud.
              <br />
              <span className="text-blue-400">Save with confidence.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400 mb-8">
              CloudSight AI analyzes your AWS infrastructure, identifies savings opportunities,
              and delivers explainable recommendations backed by Meta Prophet forecasting.
            </p>
            <button
              onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl px-6 py-12"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="rounded-lg bg-blue-500/10 p-2.5 w-fit mb-4">
                <feature.icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">{feature.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Upload/Connect Section */}
      <div id="upload-section" className="mx-auto max-w-3xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8">
            <div className="flex border-b border-zinc-800 pb-4 mb-6 gap-6">
              <button
                onClick={() => setActiveTab('csv')}
                className={`text-lg font-semibold pb-2 border-b-2 transition-all ${
                  activeTab === 'csv'
                    ? 'border-blue-500 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Upload CSV Data
              </button>
              <button
                onClick={() => setActiveTab('aws')}
                className={`text-lg font-semibold pb-2 border-b-2 transition-all ${
                  activeTab === 'aws'
                    ? 'border-blue-500 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Live AWS Integration
              </button>
            </div>

            {activeTab === 'csv' ? (
              <>
                <p className="text-sm text-zinc-500 mb-6">
                  Upload your AWS resource CSVs to receive cost analysis, optimization recommendations, and forecasts.
                </p>
                <UploadWizard />
              </>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-zinc-500">
                  Connect CloudSight AI directly to your live AWS account to analyze real-time resources and active billing data.
                </p>
                
                {awsError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Connection Failed</h4>
                      <p className="text-xs text-red-500/90 leading-relaxed mb-2">
                        {awsError}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Please define the environment variables inside your backend <code className="bg-zinc-950 px-1 py-0.5 rounded text-zinc-300 text-[10px]">.env</code> file:
                      </p>
                      <pre className="mt-2 bg-zinc-950 p-2 rounded text-zinc-400 text-xs overflow-x-auto leading-relaxed border border-zinc-800 font-mono">
{`AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_REGION=ap-south-1`}
                      </pre>
                    </div>
                  </div>
                )}

                {awsSuccess && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Successfully Connected!</p>
                      <p className="text-xs text-emerald-500/80">Redirecting to live dashboard...</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleConnectAWS}
                    disabled={awsLoading || awsSuccess}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {awsLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <CloudLightning className="h-4 w-4" />
                        Connect Live AWS
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Existing data shortcut */}
      <div className="mx-auto max-w-3xl px-6 pb-20 text-center">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4"
        >
          Already have data? Go to Dashboard
        </button>
      </div>
    </div>
  );
}
