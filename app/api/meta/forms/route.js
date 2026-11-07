import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { getOrInitSettings, DEFAULT_META_FORMS } from '../../../../lib/settings';

export const dynamic = 'force-dynamic';

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
          `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count,questions&limit=50&access_token=${token.trim()}`
        );
        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
          graphForms = data.data.map(form => ({
            id: form.id,
            name: form.name,
            pageName,
            status: form.status || 'ACTIVE',
            leadsCount: form.leads_count || 0,
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
                    (q.key || '').includes('जुड़ना') || (q.key || '').includes('business') ? 'business_type' :
                    (q.key || '').includes('inbox') ? 'notes' : 'product_interest'
                }))
              : [
                  { key: 'full_name', label: 'Full Name', mappedTo: 'name' },
                  { key: 'phone_number', label: 'Phone Number', mappedTo: 'mobile' },
                  { key: 'email', label: 'Email', mappedTo: 'email' },
                  { key: 'city', label: 'City', mappedTo: 'city' }
                ]
          }));
        }
      } catch (err) {
        console.warn('Graph API leadgen_forms warning:', err.message);
      }
    }

    const fallbackForms = (settings.metaForms && settings.metaForms.length > 0)
      ? settings.metaForms
      : DEFAULT_META_FORMS;

    const formattedFallback = fallbackForms.map(f => ({
      id: f.formId,
      name: f.formName,
      pageName: f.pageName || pageName,
      status: f.active ? 'ACTIVE' : 'PAUSED',
      leadsCount: f.leadsCaptured || 0,
      questions: [
        { key: 'full_name', label: 'Full Name', mappedTo: 'name' },
        { key: 'phone_number', label: 'Phone Number', mappedTo: 'mobile' },
        { key: 'email', label: 'Email', mappedTo: 'email' },
        { key: 'city', label: 'City / District', mappedTo: 'city' },
        { key: 'inbox_url', label: 'Meta Inbox Thread', mappedTo: 'notes' }
      ]
    }));

    const finalForms = graphForms.length > 0 ? graphForms : formattedFallback;

    return NextResponse.json({
      success: true,
      pageId,
      pageName,
      forms: finalForms,
      linkedForms: settings.metaForms || []
    });
  } catch (error) {
    console.error('Meta forms fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
