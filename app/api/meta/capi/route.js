import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import Lead from '../../../../lib/models/Lead';
import SystemSetting from '../../../../lib/models/SystemSetting';
import { getOrInitSettings } from '../../../../lib/settings';
import { hashMetaUserData } from '../../../../lib/metaLeadQuality';
import { requireAdminApi } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!(await requireAdminApi(request))) {
      return NextResponse.json({ error: 'Administrator authentication required' }, { status: 401 });
    }
    await connectDB();
    const settings = await getOrInitSettings();

    const config = settings.metaCapiConfig || {
      pixelId: process.env.META_PIXEL_ID || '',
      enabled: Boolean(process.env.META_PIXEL_ID),
      testEventCode: process.env.META_TEST_EVENT_CODE || '',
      autoSendOnInterested: true,
      autoSendOnClosed: true,
      eventsSentCount: 0,
      lastEventAt: null
    };

    const logs = settings.metaCapiLogs || [];

    return NextResponse.json({
      success: true,
      config,
      recentEvents: logs.slice(-15).reverse()
    });
  } catch (err) {
    console.error('CAPI GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!(await requireAdminApi(request))) {
      return NextResponse.json({ error: 'Administrator authentication required' }, { status: 401 });
    }
    await connectDB();
    const body = await request.json();
    const { action } = body;

    const settingsDoc = await SystemSetting.findOne({ key: 'global' });
    if (!settingsDoc) {
      return NextResponse.json({ error: 'System settings not found' }, { status: 404 });
    }

    if (action === 'UPDATE_CONFIG') {
      const { pixelId, enabled, testEventCode, autoSendOnInterested, autoSendOnClosed } = body;

      settingsDoc.metaCapiConfig = {
        pixelId: String(pixelId || '').trim(),
        enabled: Boolean(enabled),
        testEventCode: String(testEventCode || '').trim(),
        autoSendOnInterested: autoSendOnInterested !== undefined ? Boolean(autoSendOnInterested) : true,
        autoSendOnClosed: autoSendOnClosed !== undefined ? Boolean(autoSendOnClosed) : true,
        eventsSentCount: settingsDoc.metaCapiConfig?.eventsSentCount || 0,
        lastEventAt: settingsDoc.metaCapiConfig?.lastEventAt || null
      };

      await settingsDoc.save();
      return NextResponse.json({ success: true, config: settingsDoc.metaCapiConfig });
    }

    if (action === 'DISPATCH_EVENT' || action === 'TEST_EVENT') {
      const { leadId, eventName = 'QualifiedLead', value = 2500 } = body;

      let lead = null;
      if (leadId) {
        lead = await Lead.findOne({ $or: [{ _id: leadId }, { lead_id: leadId }] }).lean();
      }

      if (!lead && action !== 'TEST_EVENT') {
        return NextResponse.json({ error: 'Target Lead not found' }, { status: 404 });
      }

      const prospect = lead || {
        lead_id: `L-TEST-${Date.now().toString().slice(-4)}`,
        name: body.testName || 'Kisan Agro Distributor',
        mobile: body.testMobile || '9876543210',
        email: body.testEmail || 'dealer@kisanindia.com',
        city: 'Indore',
        state: 'Madhya Pradesh',
        campaign_name: 'Sales - Mirzapur 1 -9/2026, 16:00'
      };

      const pixelId = settingsDoc.metaCapiConfig?.pixelId || process.env.META_PIXEL_ID || '';
      const testCode = settingsDoc.metaCapiConfig?.testEventCode || process.env.META_TEST_EVENT_CODE || '';
      const token = process.env.META_PAGE_ACCESS_TOKEN || settingsDoc.metaConfig?.accessToken || '';

      const normalizedMobile = `91${String(prospect.mobile || '').replace(/\D/g, '').slice(-10)}`;
      const hashedPhone = hashMetaUserData(normalizedMobile);
      const hashedEmail = hashMetaUserData(prospect.email);
      const hashedName = hashMetaUserData(prospect.name?.split(' ')[0] || '');
      const hashedCity = hashMetaUserData(prospect.city);
      const hashedState = hashMetaUserData(prospect.state);

      const eventPayload = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'system_generated',
            event_source_url: 'https://caller-website-monitoring.vercel.app',
            user_data: {
              ph: hashedPhone ? [hashedPhone] : undefined,
              em: hashedEmail ? [hashedEmail] : undefined,
              fn: hashedName ? [hashedName] : undefined,
              ct: hashedCity ? [hashedCity] : undefined,
              st: hashedState ? [hashedState] : undefined,
              country: [hashMetaUserData('in')]
            },
            custom_data: {
              currency: 'INR',
              value: Number(value) || 2500,
              lead_id: prospect.lead_id,
              campaign_name: prospect.campaign_name || 'Facebook Meta Lead Ads'
            }
          }
        ]
      };

      if (testCode) {
        eventPayload.test_event_code = testCode;
      }

      let metaResponse = null;
      let statusResult = 'SIMULATED_SUCCESS';
      let latencyMs = 120;

      if (pixelId && token) {
        const start = Date.now();
        try {
          const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventPayload)
          });
          latencyMs = Date.now() - start;
          metaResponse = await res.json();
          if (res.ok) {
            statusResult = 'SENT_TO_META_GRAPH';
          } else {
            statusResult = `META_ERROR: ${metaResponse?.error?.message || 'Graph API rejected'}`;
          }
        } catch (postErr) {
          latencyMs = Date.now() - start;
          statusResult = `NETWORK_ERROR: ${postErr.message}`;
        }
      } else {
        statusResult = 'VALIDATED_READY (Add Pixel ID in CAPI settings for live Graph API POST)';
      }

      const logItem = {
        id: `capi-${Date.now()}`,
        eventName,
        leadId: prospect.lead_id,
        leadName: prospect.name,
        value: Number(value) || 2500,
        status: statusResult,
        latencyMs,
        testCode: testCode || 'None',
        timestamp: new Date()
      };

      const existingLogs = settingsDoc.metaCapiLogs || [];
      existingLogs.push(logItem);
      if (existingLogs.length > 50) existingLogs.shift();
      settingsDoc.metaCapiLogs = existingLogs;

      if (!settingsDoc.metaCapiConfig) settingsDoc.metaCapiConfig = {};
      settingsDoc.metaCapiConfig.eventsSentCount = (settingsDoc.metaCapiConfig.eventsSentCount || 0) + 1;
      settingsDoc.metaCapiConfig.lastEventAt = new Date();

      await settingsDoc.save();

      return NextResponse.json({
        success: true,
        status: statusResult,
        latencyMs,
        logItem,
        payloadSent: eventPayload,
        metaResponse
      });
    }

    return NextResponse.json({ error: 'Invalid CAPI action' }, { status: 400 });
  } catch (err) {
    console.error('CAPI POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
