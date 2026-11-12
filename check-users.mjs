import connectDB from './lib/db.js';
import User from './lib/models/User.js';
import AuthSession from './lib/models/AuthSession.js';

async function main() {
  await connectDB();
  const users = await User.find({}).lean();
  console.log('TOTAL USERS:', users.length);
  users.forEach(u => console.log(`- ${u.name} | Role: ${u.role} | Mobile: ${u.mobile} | Email: ${u.email} | EmpID: ${u.employee_id}`));
  
  const sessions = await AuthSession.find({}).sort({ createdAt: -1 }).limit(5).lean();
  console.log('RECENT SESSIONS:', sessions.length);
  sessions.forEach(s => console.log(`- Session: ${s.session_id} | User: ${s.user} | Device: ${s.device_label} | Revoked: ${s.revoked}`));
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
