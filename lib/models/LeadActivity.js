import mongoose from 'mongoose';

const leadActivitySchema = new mongoose.Schema({
  lead:           { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  admin_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  performed_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  performer_name: { type: String, default: 'System' },
  performer_role: {
    type: String,
    enum: ['admin', 'manager', 'telecaller', 'system', 'webhook', 'neodove'],
    default: 'system'
  },
  type: {
    type: String,
    enum: [
      'LEAD_CREATED',
      'LEAD_ASSIGNED',
      'LEAD_RESUBMITTED',
      'STATUS_CHANGE',
      'DISPOSITION_LOGGED',
      'CALL_LOGGED',
      'FOLLOWUP_SCHEDULED',
      'WHATSAPP_SENT',
      'SMS_SENT',
      'NOTE_ADDED',
      'NEODOVE_SYNC'
    ],
    required: true,
    index: true
  },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  metadata:    { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

leadActivitySchema.index({ lead: 1, createdAt: -1 });
leadActivitySchema.index({ type: 1, createdAt: -1 });

export default mongoose.models.LeadActivity || mongoose.model('LeadActivity', leadActivitySchema);
