import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'LOW': return 'text-emerald-400';
    case 'MEDIUM': return 'text-amber-400';
    case 'HIGH': return 'text-red-400';
    default: return 'text-zinc-400';
  }
}

export function getRiskBg(risk: string): string {
  switch (risk) {
    case 'LOW': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'HIGH': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#059669';
  if (score >= 70) return '#2563eb';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'Active': return 'bg-emerald-500/10 text-emerald-400';
    case 'Moderate': return 'bg-blue-500/10 text-blue-400';
    case 'Underutilized': return 'bg-amber-500/10 text-amber-400';
    case 'Idle': return 'bg-red-500/10 text-red-400';
    case 'Orphaned': return 'bg-red-500/10 text-red-400';
    case 'Cold': return 'bg-sky-500/10 text-sky-400';
    case 'Warm': return 'bg-orange-500/10 text-orange-400';
    default: return 'bg-zinc-500/10 text-zinc-400';
  }
}
