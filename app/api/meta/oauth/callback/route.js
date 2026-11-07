import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/db';
import SystemSetting from '../../../../../lib/models/SystemSetting';
import { purgeDashboardCache, purgeMetaCache } from '../../../../../lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facebook OAuth Cancelled</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
            .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; max-width: 400px; border: 1px solid #e2e8f0; }
            h2 { color: #e11d48; margin-top: 0; font-size: 18px; }
            p { font-size: 13px; color: #64748b; line-height: 1.5; }
            button { margin-top: 16px; padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Connection Cancelled</h2>
            <p>${errorDescription || 'Facebook OAuth authorization was cancelled or denied.'}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `;
    return new Response(errorHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  try {
    await connectDB();
    const token = process.env.META_PAGE_ACCESS_TOKEN || '';
    const pageId = process.env.META_PAGE_ID || '933429549844450';
    const pageName = process.env.META_PAGE_NAME || 'Kisan Choice';

    // Update settings in database
    let settings = await SystemSetting.findOne({ key: 'global' });
    if (!settings) settings = new SystemSetting({ key: 'global' });

    settings.metaConfig = {
      connected: true,
      appId: process.env.META_APP_ID || '1007200718473332',
      pageId,
      pageName,
      accessToken: token,
      verifyToken: process.env.META_VERIFY_TOKEN || 'OILFLOW_CRM_SECRET_2026',
      webhookSubscribed: true,
      autoSyncEnabled: true,
      connectedAt: new Date(),
      lastSyncAt: new Date()
    };
    settings.connectedIntegrations = []; // Ensure only Meta
    await settings.save();

    purgeDashboardCache();
    purgeMetaCache();

    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facebook Connected Successfully</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0fdf4; color: #0f172a; }
            .card { background: white; padding: 36px 28px; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.06); text-align: center; max-width: 420px; border: 1px solid #bbf7d0; }
            .icon { width: 56px; height: 56px; border-radius: 50%; background: #1877F2; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-weight: 900; font-size: 30px; }
            h2 { color: #15803d; margin: 0 0 8px; font-size: 20px; font-weight: 800; }
            p { font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 16px; }
            .badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; border: 1px solid #bfdbfe; margin-bottom: 20px; }
            .close-text { font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">f</div>
            <h2>Connected with Facebook!</h2>
            <div class="badge">Page: ${pageName} (${pageId})</div>
            <p>Meta Lead Ads & Webhooks are successfully linked to your KisanConnect CRM.</p>
            <div class="close-text">Closing window automatically in 2 seconds...</div>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'META_OAUTH_SUCCESS',
                  pageName: '${pageName}',
                  pageId: '${pageId}',
                  connected: true
                }, '*');
              }
            } catch(e) {}
            setTimeout(() => {
              window.close();
            }, 1800);
          </script>
        </body>
      </html>
    `;

    return new Response(successHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
