// Product analytics (PostHog, EU cloud). Loaded from index.html before the app.
//
// - The project token below is a public, write-only key: safe to ship.
// - All products in the "armo products" PostHog project share one project, so
//   every event carries product = "suncast" (a super property) and dashboards
//   filter on it.
// - Nothing is sent from localhost / LAN dev servers, so local testing never
//   pollutes the numbers. Add ?analytics=1 to the URL to override when testing
//   the pipeline; those events carry is_test = true so dashboards can drop them.
// - window.track(event, props) is the only thing the app calls. It is a no-op
//   when analytics is off, so the app never has to check.
(function () {
  var TOKEN = 'phc_rDzjyF8BzQGsGhZ7zWqaZUgGfyXWRDMLWx9PPsCMSYhL';
  var HOST = 'https://eu.i.posthog.com';

  var isLocal = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/.test(location.hostname) || location.protocol === 'file:';
  var params = new URLSearchParams(location.search);
  var forced = params.get('analytics') === '1';
  var enabled = forced || !isLocal;
  var isEmbed = /^\/embed(\/|$)/.test(location.pathname) || params.get('embed') === '1';

  window.track = function () {};
  if (!enabled) { window.track.disabled = true; return; }

  // Official PostHog snippet (array.js loader).
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="vu fu pu gu bu init Hu zu qu ju Gu Xa Bu Qu Du eh ih nh sh rh oh capture getExtension Uu cu hh calculateEventProperties uh register register_once register_for_session unregister unregister_for_session gh Nu dh getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync mh identify setPersonProperties unsetPersonProperties group setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset yh shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty fh Xu createPersonProfile setInternalOrTestUser ph wu opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Ju debug Ya Os getPageViewId captureTraceFeedback captureTraceMetric Ru".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init(TOKEN, {
    api_host: HOST,
    defaults: '2026-05-30',
    person_profiles: 'identified_only',    // anonymous visitors: events only, no person rows (cheaper, less PII)
    capture_pageview: true,
    capture_pageleave: true,               // needed for bounce rate / time on page
    autocapture: true,
    capture_heatmaps: true,
    persistence: 'localStorage+cookie',
  });

  // Attached to every event from this page, including autocaptured ones.
  posthog.register({
    product: 'suncast',
    app_mode: isEmbed ? 'embed' : 'full',
    embed_host: isEmbed ? (document.referrer ? new URL(document.referrer).hostname : 'unknown') : undefined,
    is_test: forced || undefined,
  });

  window.track = function (event, props) {
    try { posthog.capture(event, props || {}); } catch (_) {}
  };
})();
