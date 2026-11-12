import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  lead:          { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  caller:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admin_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  status:        { type: String, required: true },
  notes:         { type: String, default: '' },
  start_time:    { type: Date, required: true },
  end_time:      { type: Date, required: true },
  duration:      { type: Number, required: true },
  recording_url: { type: String, default: null },
  followup_date: { type: String, default: null },
  followup_time: { type: String, default: null }
}, { timestamps: true });

export default mongoose.models.Call || mongoose.model('Call', callSchema);
