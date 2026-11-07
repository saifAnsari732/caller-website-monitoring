import mongoose from 'mongoose';

const authSessionSchema = new mongoose.Schema({
  session_id:     { type: String, required: true, unique: true, index: true },
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  device_label:   { type: String, default: 'Web Browser' },
  user_agent:     { type: String, default: '' },
  ip_address:     { type: String, default: '' },
  remember_me:    { type: Boolean, default: false },
  revoked:        { type: Boolean, default: false },
  revoked_at:     { type: Date, default: null },
  last_active_at: { type: Date, default: Date.now },
  expires_at:     { type: Date, required: true }
}, { timestamps: true });

export default mongoose.models.AuthSession || mongoose.model('AuthSession', authSessionSchema);
