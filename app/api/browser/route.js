import { NextResponse } from 'next/server';
import connectDB from '../../../lib/db';
import Lead from '../../../lib/models/Lead';
import { getOrInitSettings } from '../../../lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await connectDB();
    const settings = await getOrInitSettings();
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId') || '1768141694308234';
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const token = settings.metaConfig?.accessToken || process.env.META_PAGE_ACCESS_TOKEN || '';
    const pageId = settings.metaConfig?.pageId || process.env.META_PAGE_ID || '933429549844450';

    let leads = [];
    let formDetails = null;

    if (token && token.length > 20) {
      // 1. Fetch form details
      try {
        const fRes = await fetch(
          `https://graph.facebook.com/v21.0/${formId}?fields=id,name,status,leads_count,questions,created_time&access_token=${token}`
        );
        formDetails = await fRes.json();
      } catch (err) {
        console.warn('Form details fetch error:', err.message);
      }

      // 2. Fetch leads for this form
      try {
        const lRes = await fetch(
          `https://graph.facebook.com/v21.0/${formId}/leads?fields=id,created_time,field_data&limit=${limit}&access_token=${token}`
        );
        const lData = await lRes.json();
        if (Array.isArray(lData?.data)) {
          leads = lData.data.map(item => {
            const fieldMap = {};
            for (const fd of (item.field_data || [])) {
              fieldMap[fd.name] = (Array.isArray(fd.values) && fd.values.length > 0) ? fd.values[0] : '';
            }
            return {
              id: item.id,
              created_time: item.created_time,
              fields: fieldMap,
              full_name: fieldMap.full_name || fieldMap.name || 'Prospect',
              phone: fieldMap.phone_number || fieldMap.phone || '',
              email: fieldMap.email || '',
              city: fieldMap.city || '',
              inbox_url: fieldMap.inbox_url || '',
              custom_question_1: fieldMap['आप_किस_रूप_में_जुड़ना_चाहते_हैं?'] || fieldMap.business_type || '',
              custom_question_2: fieldMap['आप_कब_शुरू_करना_चाहेंगे?'] || fieldMap.product_preference || ''
            };
          });
        }
      } catch (err) {
        console.warn('Leads fetch error:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      formId,
      formDetails,
      totalFetched: leads.length,
      leads
    });
  } catch (error) {
    console.error('Browser API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
