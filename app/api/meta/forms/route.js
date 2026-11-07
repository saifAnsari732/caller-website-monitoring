import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import { getOrInitSettings } from '../../../../lib/settings';

export const dynamic = 'force-dynamic';

function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET() {
  try {
    await connectDB();
    const settings = await getOrInitSettings();
    const token = settings.metaConfig?.accessToken || process.env.META_PAGE_ACCESS_TOKEN || '';
    const pageId = settings.metaConfig?.pageId || process.env.META_PAGE_ID || '933429549844450';
    const pageName = settings.metaConfig?.pageName || 'Kisan Choice';

    let graphForms = [];
    if (token && token.trim().length > 15) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,questions&limit=100&access_token=${encodeURIComponent(token.trim())}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          graphForms = data.data.map(form => ({
            id: String(form.id),
            name: form.name,
            pageName,
            status: form.status || 'ACTIVE',
            leadsCount: Number(form.leads_count) || 0,
            questions: Array.isArray(form.questions)
              ? form.questions.map(q => ({
                  key: q.key || q.id,
                  label: q.label || q.key,
                  type: q.type || 'CUSTOM',
                  options: q.options || [],
                  mappedTo:
                    (q.key || '').includes('name') ? 'name' :
                    (q.key || '').includes('phone') || (q.key || '').includes('mobile') ? 'mobile' :
                    (q.key || '').includes('city') ? 'city' :
                    (q.key || '').includes('state') ? 'state' :
                    (q.key || '').includes('email') ? 'email' :
                    (q.key || '').includes('जुड़ना') || (q.key || '').includes('business') || (q.key || '').includes('role') ? 'business_type' :
                    (q.key || '').includes('inbox') ? 'notes' : 'product_interest'
                }))
              : []
          }));
        }
      } catch (err) {
        console.warn('Graph API leadgen_forms warning:', err.message);
      }
    }

    const storedMap = new Map(
      (settings.metaForms || []).map(f => [String(f.formId), f])
    );

    const storedForms = (settings.metaForms || []).map(f => ({
      id: String(f.formId),
      name: f.formName,
      pageName: f.pageName || pageName,
      status: f.active !== false ? 'ACTIVE' : 'PAUSED',
      leadsCount: Number(f.leadsCaptured) || 0,
      assignedTeam: f.assignedTeam || 'North Region Sales',
      distributionRule: f.distributionRule || 'ROUND_ROBIN',
      questions: []
    }));

    const baseForms = graphForms.length > 0 ? graphForms : storedForms;

    // Fetch Meta leads from MongoDB to compute accurate real captured counts per form
    const dbMetaLeads = await Lead.find({
      $or: [
        { lead_source: { $regex: 'meta|facebook|instagram', $options: 'i' } },
        { notes: { $regex: 'Meta', $options: 'i' } }
      ]
    })
      .select('campaign_name notes')
      .lean();

    const totalDbMetaLeads = dbMetaLeads.length;

    const enrichedForms = baseForms.map(form => {
      const stored = storedMap.get(String(form.id));
      const idStr = String(form.id);
      const nameEsc = form.name ? escapeRegex(form.name.trim()) : '';
      const nameRegex = nameEsc ? new RegExp(`"${nameEsc}"|^${nameEsc}$`, 'i') : null;

      let dbCount = 0;
      for (const l of dbMetaLeads) {
        const notes = l.notes || '';
        const camp = l.campaign_name || '';
        if (
          (idStr && notes.includes(idStr)) ||
          (nameRegex && (nameRegex.test(notes) || camp.trim().toLowerCase() === form.name.trim().toLowerCase()))
        ) {
          dbCount++;
        }
      }

      const bestCount = Math.max(
        Number(form.leadsCount) || 0,
        Number(stored?.leadsCaptured) || 0,
        dbCount
      );

      return {
        ...form,
        leadsCount: bestCount,
        dbSyncedCount: dbCount,
        assignedTeam: stored?.assignedTeam || form.assignedTeam || 'North Region Sales',
        distributionRule: stored?.distributionRule || form.distributionRule || 'ROUND_ROBIN'
      };
    });

    // Sort forms: forms with leads first (descending), then ACTIVE forms first
    enrichedForms.sort((a, b) => {
      if ((b.leadsCount || 0) !== (a.leadsCount || 0)) {
        return (b.leadsCount || 0) - (a.leadsCount || 0);
      }
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    return NextResponse.json({
      success: true,
      pageId,
      pageName,
      totalDbMetaLeads,
      forms: enrichedForms,
      linkedForms: settings.metaForms || []
    });
  } catch (error) {
    console.error('Meta forms fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
