import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name:                    { type: String, required: true, trim: true },
  mobile:                  { type: String, unique: true, trim: true },
  email:                   { type: String, unique: true, trim: true, lowercase: true },
  employee_id:             { type: String, unique: true },
  password:                { type: String, required: true },
  role:                    { type: String, enum: ['admin', 'manager', 'telecaller'], default: 'telecaller' },
  team:                    { type: String, default: 'North Region Sales', trim: true },
  status:                  { type: String, enum: ['active', 'disabled'], default: 'active' },
  on_leave:                { type: Boolean, default: false },
  shift_status:            { type: String, enum: ['Clocked In', 'On Break', 'Clocked Out'], default: 'Clocked In' },
  last_clock_in:           { type: Date, default: Date.now },
  last_clock_out:          { type: Date, default: null },
  last_active_at:          { type: Date, default: Date.now },
  daily_call_target:       { type: Number, default: 50 },
  daily_conversion_target: { type: Number, default: 5 },
  failed_login_attempts:   { type: Number, default: 0 },
  locked_until:            { type: Date, default: null },
  token_version:           { type: Number, default: 0 },
  last_login_at:           { type: Date, default: null },
  last_login_ip:           { type: String, default: '' },
  password_changed_at:     { type: Date, default: null }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
