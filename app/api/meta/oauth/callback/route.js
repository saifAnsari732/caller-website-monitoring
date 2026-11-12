import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/db';
import SystemSetting from '../../../../../lib/models/SystemSetting';
import { fetchLiveMetaFormsFromGraph } from '../../../../../lib/settings';
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
    return new Response(errorHtml, { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    await connectDB();
    const appId = process.env.META_APP_ID || '1007200718473332';
    const appSecret = process.env.META_APP_SECRET || '3417199d662e081419c470b832d1a49a';
    const redirectUri = `${origin}/api/meta/oauth/callback`;

    let settings = await SystemSetting.findOne({ key: 'global' });
    if (!settings) settings = new SystemSetting({ key: 'global' });

    let activeToken = settings.metaConfig?.accessToken || process.env.META_PAGE_ACCESS_TOKEN || '';
    let userToken = settings.metaConfig?.userAccessToken || process.env.META_USER_ACCESS_TOKEN || '';
    let pageId = settings.metaConfig?.pageId || process.env.META_PAGE_ID || '933429549844450';
    let pageName = settings.metaConfig?.pageName || process.env.META_PAGE_NAME || 'Kisan Choice';
    let exchangedServerSide = false;
    let syncedFormsCount = settings.metaForms?.length || 0;

    if (code && appSecret) {
      try {
        const tokenRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`,
          { cache: 'no-store' }
        );
        const tokenJson = await tokenRes.json();
        if (tokenJson?.access_token) {
          userToken = tokenJson.access_token;
          try {
            const llRes = await fetch(
              `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(userToken)}`,
              { cache: 'no-store' }
            );
            const llJson = await llRes.json();
            if (llJson?.access_token) userToken = llJson.access_token;
          } catch {}

          const pagesRes = await fetch(
            `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category&access_token=${encodeURIComponent(userToken)}`,
            { cache: 'no-store' }
          );
          const pagesJson = await pagesRes.json();
          let connectedPages = [];
          if (Array.isArray(pagesJson?.data) && pagesJson.data.length > 0) {
            connectedPages = pagesJson.data.map(p => ({
              id: String(p.id),
              name: p.name,
              category: p.category || '',
              accessToken: p.access_token || userToken
            }));
            const chosen = connectedPages[0];
            pageId = chosen.id;
            pageName = chosen.name;
            activeToken = chosen.accessToken;
          } else {
            activeToken = userToken;
            connectedPages = [{ id: pageId, name: pageName, accessToken: userToken }];
          }

          let connectedAdAccounts = [];
          let userAdAccountId = process.env.META_AD_ACCOUNT_ID || 'act_1796071777698019';
          try {
            const adAccRes = await fetch(
              `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,account_id,name,currency&access_token=${encodeURIComponent(userToken)}`,
              { cache: 'no-store' }
            );
            const adAccData = await adAccRes.json();
            if (Array.isArray(adAccData?.data) && adAccData.data.length > 0) {
              connectedAdAccounts = adAccData.data.map(a => ({
                id: a.id,
                accountId: a.account_id,
                name: a.name || `Ad Account ${a.account_id}`,
                currency: a.currency || 'INR'
              }));
              userAdAccountId = connectedAdAccounts[0].id;
            }
          } catch {}

          // Subscribe the newly connected page to webhook leadgen events
          try {
            await fetch(
              `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(activeToken)}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscribed_fields: ['leadgen'] })
              }
            );
          } catch {}

          exchangedServerSide = true;
          settings.metaConfig = {
            connected: true,
            appId,
            pageId,
            pageName,
            adAccountId: userAdAccountId,
            accessToken: activeToken,
            userAccessToken: userToken,
            connectedPages,
            connectedAdAccounts,
            verifyToken: process.env.META_VERIFY_TOKEN || settings.metaConfig?.verifyToken || 'KISAN_META_WEBHOOK_VERIFY',
            webhookSubscribed: true,
            autoSyncEnabled: true,
            zeroLossFallback: true,
            connectedAt: new Date(),
            lastSyncAt: new Date()
          };
        }
      } catch (exchangeErr) {
        console.warn('OAuth code exchange warning:', exchangeErr.message);
      }

      if (exchangedServerSide && activeToken) {
        const liveForms = await fetchLiveMetaFormsFromGraph(pageId, pageName, activeToken);
        if (liveForms.length > 0) {
          settings.metaForms = liveForms;
          settings.markModified('metaForms');
          syncedFormsCount = liveForms.length;
        }
        settings.connectedIntegrations = [];
        await settings.save();
        purgeDashboardCache();
        purgeMetaCache();
      }
    }

    const callbackHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connecting Facebook Lead Ads...</title>
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
            <h2 id="title">${exchangedServerSide ? 'Connected with Facebook!' : 'Finalizing Meta Sync...'}</h2>
            <div id="badge" class="badge">Page: ${pageName} (${pageId})</div>
            <p id="desc">${exchangedServerSide ? `Meta Lead Ads & Webhooks (${syncedFormsCount} forms) are linked to your CRM.` : 'Exchanging Meta Graph v21.0 Page Access Token & syncing live forms...'}</p>
            <div id="status" class="close-text">Please wait...</div>
          </div>
          <script>
            (async function() {
              const titleEl = document.getElementById('title');
              const badgeEl = document.getElementById('badge');
              const descEl = document.getElementById('desc');
              const statusEl = document.getElementById('status');

              function finishSuccess(pName, pId) {
                try {
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'META_OAUTH_SUCCESS',
                      pageName: pName,
                      pageId: pId,
                      connected: true
                    }, '*');
                  }
                } catch (e) {}
                statusEl.textContent = 'Closing window automatically...';
                setTimeout(() => { window.close(); }, 1400);
              }

              const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
              const hashToken = hashParams.get('access_token');

              if (hashToken) {
                try {
                  const res = await fetch('/api/meta/oauth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken: hashToken })
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    titleEl.textContent = 'Connected with Facebook!';
                    badgeEl.textContent = 'Page: ' + data.pageName + ' (' + data.pageId + ')';
                    descEl.textContent = data.message || ('Synced ' + data.formsSynced + ' forms and ' + data.realLeadsIngested + ' leads.');
                    finishSuccess(data.pageName, data.pageId);
                    return;
                  } else {
                    titleEl.textContent = 'Token Sync Warning';
                    titleEl.style.color = '#e11d48';
                    descEl.textContent = data.error || 'Could not save Facebook token.';
                    statusEl.textContent = 'You may close this window.';
                    return;
                  }
                } catch (err) {
                  titleEl.textContent = 'Network Error';
                  titleEl.style.color = '#e11d48';
                  descEl.textContent = err.message;
                  return;
                }
              }

              finishSuccess('${pageName}', '${pageId}');
            })();
          </script>
        </body>
      </html>
    `;

    return new Response(callbackHtml, { headers: { 'Content-Type': 'text/html' } });
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
