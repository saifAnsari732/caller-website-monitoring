import mongoose from 'mongoose';

const followupSchema = new mongoose.Schema({
  lead:      { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  caller:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:      { type: String, required: true },
  time:      { type: String, required: true },
  notes:     { type: String, default: '' },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Followup || mongoose.model('Followup', followupSchema);
