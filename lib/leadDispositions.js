/**
 * Lead Dispositions & Dynamic Stage Management
 * Provides canonical CRM pipeline stages, sub-dispositions, and normalization
 * for full parity with NeoDove and Enterprise Telecalling workflows.
 */

export const CANONICAL_STAGES = [
  'New',
  'Contacted',
  'Interested',
  'Callback Scheduled',
  'Follow-up',
  'Not Interested',
  'Converted',
  'Lost'
];

export const STAGE_MAPPINGS = {
  // New / Fresh
  'new': 'New',
  'fresh': 'New',
  'fresh inquiry': 'New',
  'fresh lead': 'New',
  'assigned': 'New',
  'uncontacted': 'New',

  // Contacted / In-Progress
  'contacted': 'Contacted',
  'connected': 'Contacted',
  'in-progress': 'Contacted',
  'in progress': 'Contacted',
  'ringing': 'Contacted',

  // Interested
  'interested': 'Interested',
  'distributor interested': 'Interested',
  'trader interested': 'Interested',
  'dss interested': 'Interested',
  'rss interested': 'Interested',
  'ss interested': 'Interested',
  'warm lead': 'Interested',
  'hot lead': 'Interested',

  // Callback
  'callback': 'Callback Scheduled',
  'callback scheduled': 'Callback Scheduled',
  'call back': 'Callback Scheduled',
  'scheduled': 'Callback Scheduled',

  // Follow-up
  'follow up': 'Follow-up',
  'follow-up': 'Follow-up',
  'followup': 'Follow-up',
  'in negotiation': 'Follow-up',

  // Not Interested
  'not interested': 'Not Interested',
  'rejected': 'Not Interested',
  'not required': 'Not Interested',
  'price issue': 'Not Interested',

  // Converted / Won
  'converted': 'Converted',
  'closed': 'Converted',
  'won': 'Converted',
  'deal closed': 'Converted',

  // Lost
  'lost': 'Lost',
  'wrong number': 'Lost',
  'not connected': 'Lost',
  'unreachable': 'Lost',
  'invalid': 'Lost',
  'switched off': 'Lost'
};

export const STAGE_SUB_DISPOSITIONS = {
  'New': [
    'Fresh Ingestion',
    'Re-assigned to Agent',
    'High Priority Inflow'
  ],
  'Contacted': [
    'Introduction Made',
    'Discussion Underway',
    'Decision Maker Identified',
    'Requested More Info'
  ],
  'Interested': [
    'Distributor Dealership Inquiry',
    'Trader / Wholesaler Inquiry',
    'Bulk Order (15L Tin)',
    'Super Stockist (SS) Partnership',
    'Retail Chain Placement',
    'Sample Tin Requested'
  ],
  'Callback Scheduled': [
    'Prospect Busy / In Meeting',
    'Call During Evening',
    'Call Next Day Morning',
    'Consulting Business Partner',
    'Specific Time Requested'
  ],
  'Follow-up': [
    'Catalog & Brochure Shared on WhatsApp',
    'Price Quotation Shared',
    'Margin Structure Under Discussion',
    'Field Visit / Meeting Planned',
    'GST & Dealership Docs Requested'
  ],
  'Not Interested': [
    'Profit Margin Expectations High',
    'Competitor Exclusive Contract',
    'Out of Distribution Area',
    'No Financial Budget',
    'Not In Oil Business',
    'Casual Inquiry / No Current Need'
  ],
  'Converted': [
    'Advance Payment Received',
    'First Consignment Dispatched',
    'Dealership Agreement Executed',
    'Security Deposit Received',
    'Authorized Distributor Appointed'
  ],
  'Lost': [
    'Wrong Number / Not User',
    'Switched Off Repeatedly',
    'Continuous Ringing No Response',
    'Language / Communication Barrier',
    'Duplicate / Spam Submission'
  ]
};

export function normalizeStage(rawStatus) {
  if (!rawStatus) return 'New';
  const clean = String(rawStatus).trim().toLowerCase();
  return STAGE_MAPPINGS[clean] || rawStatus;
}

export function getSubDispositionsForStage(stage) {
  const norm = normalizeStage(stage);
  return STAGE_SUB_DISPOSITIONS[norm] || [];
}

export function getStageColor(stage) {
  const norm = normalizeStage(stage);
  switch (norm) {
    case 'New': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'Contacted': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'Interested': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'Callback Scheduled': return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' };
    case 'Follow-up': return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case 'Not Interested': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    case 'Converted': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'Lost': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
  }
}
