import mongoose from 'mongoose';
import Counter from './Counter.js';

const LEAD_STATUSES = [
  'Fresh Inquiry', 'Fresh Lead', 'Assigned', 'In-Progress', 'Follow Up', 'Callback',
  'Interested', 'Distributor Interested', 'Trader Interested',
  'DSS Interested', 'RSS Interested', 'SS Interested',
  'Connected', 'Wrong Number', 'Not Connected', 'Closed', 'Rejected'
];

const leadSchema = new mongoose.Schema({
  lead_id:            { type: String, unique: true },
  name:               { type: String, required: true, trim: true },
  mobile:             { type: String, required: true, trim: true },
  email:              { type: String, trim: true, lowercase: true },
  city:               { type: String, trim: true },
  state:              { type: String, trim: true },
  business_type:      { type: String, trim: true },
  product_interest:   { type: String, trim: true },
  join_as:            { type: String, trim: true, default: '' },
  start_timeline:     { type: String, trim: true, default: '' },
  deal_amount:        { type: Number, default: 0 },
  follow_up_time:     { type: Date, default: null },
  lead_status:        { type: String, default: 'In-Progress' },
  lead_source:        { type: String, default: 'Facebook Meta Lead Ads' },
  meta_lead_id:       { type: String, trim: true, default: '', index: true },
  meta_form_id:       { type: String, trim: true, default: '', index: true },
  campaign_name:      { type: String, default: '' },
  status:             { type: String, default: 'Fresh Inquiry' },
  priority:           { type: String, enum: ['Low', 'Normal', 'High', 'VIP'], default: 'Normal' },
  tags:               [{ type: String, trim: true }],
  assigned_to:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  admin_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  assigned_at:        { type: Date, default: null },
  first_contacted_at: { type: Date, default: null },
  last_contacted_at:  { type: Date, default: null },
  call_attempts:      { type: Number, default: 0 },
  notes:              { type: String, default: '' }
}, { timestamps: true });

leadSchema.pre('save', async function () {
  if (this.lead_id) return;
  const LeadModel = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
  for (let attempt = 0; attempt < 10; attempt++) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'leadId' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const candidate = `L-${counter.seq}`;
    const exists = await LeadModel.exists({ lead_id: candidate });
    if (!exists) {
      this.lead_id = candidate;
      return;
    }
    // Fast-forward counter past highest existing L-XXXX
    const latest = await LeadModel.findOne({ lead_id: /^L-\d+$/ }).sort({ createdAt: -1 }).select('lead_id').lean();
    if (latest?.lead_id) {
      const num = parseInt(latest.lead_id.replace('L-', ''), 10);
      if (!isNaN(num) && num >= counter.seq) {
        await Counter.updateOne({ _id: 'leadId' }, { $max: { seq: num } });
      }
    }
  }
  this.lead_id = `L-${Date.now().toString().slice(-6)}`;
});

export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);
