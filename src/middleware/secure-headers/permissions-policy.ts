// Main registry: https://github.com/w3c/webappsec-permissions-policy/blob/main/features.md
// Additional feature specs for directives not yet indexed in features.md:
// - chUaFormFactors: https://wicg.github.io/ua-client-hints/#sec-ch-ua-form-factors
// - subapps: https://wicg.github.io/sub-apps/
// - webAppInstallation: https://github.com/WICG/web-app-installation

export type PermissionsPolicyDirective =
  | StandardizedFeatures
  | ProposedFeatures
  | ExperimentalFeatures

/**
 * These features have been declared in a published version of the respective specification.
 */
type StandardizedFeatures =
  | 'accelerometer'
  | 'ambientLightSensor'
  | 'attributionReporting'
  | 'autoplay'
  | 'battery'
  | 'bluetooth'
  | 'camera'
  | 'chUa'
  | 'chUaArch'
  | 'chUaBitness'
  | 'chUaFormFactors' // https://wicg.github.io/ua-client-hints/#sec-ch-ua-form-factors
  | 'chUaFullVersion'
  | 'chUaFullVersionList'
  | 'chUaHighEntropyValues'
  | 'chUaMobile'
  | 'chUaModel'
  | 'chUaPlatform'
  | 'chUaPlatformVersion'
  | 'chUaWow64'
  | 'computePressure'
  | 'crossOriginIsolated'
  | 'directSockets'
  | 'displayCapture'
  | 'encryptedMedia'
  | 'executionWhileNotRendered'
  | 'executionWhileOutOfViewport'
  | 'fullscreen'
  | 'geolocation'
  | 'gyroscope'
  | 'hid'
  | 'identityCredentialsGet'
  | 'idleDetection'
  | 'keyboardMap'
  | 'magnetometer'
  | 'mediaSession'
  | 'mediasession' // W3C spec name: https://w3c.github.io/mediasession/#permissions-policy
  | 'microphone'
  | 'midi'
  | 'navigationOverride'
  | 'payment'
  | 'pictureInPicture'
  | 'publickeyCredentialsGet'
  | 'screenWakeLock'
  | 'serial'
  | 'storageAccess'
  | 'syncXhr'
  | 'usb'
  | 'webShare'
  | 'windowManagement'
  | 'xrSpatialTracking'

/**
 * These features have been proposed, but the definitions have not yet been integrated into their respective specs.
 */
type ProposedFeatures =
  | 'autofill' // https://github.com/explainers-by-googlers/safe-text-input/blob/main/autofill.md
  | 'clipboardRead'
  | 'clipboardWrite'
  | 'deferredFetch'
  | 'gamepad'
  | 'languageDetector' // https://github.com/webmachinelearning/translation-api
  | 'languageModel' // https://github.com/webmachinelearning/prompt-api
  | 'manualText' // https://github.com/explainers-by-googlers/safe-text-input/blob/main/manual-text.md
  | 'rewriter' // https://github.com/webmachinelearning/writing-assistance-apis
  | 'sharedAutofill'
  | 'speakerSelection'
  | 'summarizer' // https://github.com/webmachinelearning/writing-assistance-apis
  | 'translator' // https://github.com/webmachinelearning/translation-api
  | 'writer' // https://github.com/webmachinelearning/writing-assistance-apis

/**
 * These features generally have an explainer only, but may be available for experimentation by web developers.
 */
type ExperimentalFeatures =
  | 'allScreensCapture'
  | 'browsingTopics'
  | 'capturedSurfaceControl'
  | 'conversionMeasurement'
  | 'digitalCredentialsCreate' // https://w3c-fedid.github.io/digital-credentials/
  | 'digitalCredentialsGet'
  | 'focusWithoutUserActivation'
  | 'joinAdInterestGroup'
  | 'localFonts'
  | 'monetization' // https://webmonetization.org/specification/#permissions-policy
  | 'otpCredentials'
  | 'runAdAuction'
  | 'smartCard'
  | 'subapps' // https://wicg.github.io/sub-apps/
  | 'syncScript'
  | 'tools' // https://webmachinelearning.github.io/webmcp/#permissions-policy
  | 'trustTokenRedemption'
  | 'unload'
  | 'verticalScroll'
  | 'webAppInstallation' // https://github.com/WICG/web-app-installation
