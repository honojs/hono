// https://github.com/w3c/webappsec-permissions-policy/blob/main/features.md

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
  | 'mediasession'
  | 'microphone'
  | 'midi'
  | 'navigationOverride'
  | 'otpCredentials'
  | 'payment'
  | 'pictureInPicture'
  | 'publickeyCredentialsGet'
  | 'screenWakeLock'
  | 'serial'
  | 'storageAccess'
  | 'syncXhr'
  | 'tools'
  | 'usb'
  | 'webShare'
  | 'windowManagement'
  | 'xrSpatialTracking'

/**
 * These features have been proposed, but the definitions have not yet been integrated into their respective specs.
 */
type ProposedFeatures =
  | 'autofill'
  | 'clipboardRead'
  | 'clipboardWrite'
  | 'deferredFetch'
  | 'gamepad'
  | 'languageDetector'
  | 'languageModel'
  | 'manualText'
  | 'rewriter'
  | 'sharedAutofill'
  | 'speakerSelection'
  | 'summarizer'
  | 'translator'
  | 'writer'

/**
 * These features generally have an explainer only, but may be available for experimentation by web developers.
 */
type ExperimentalFeatures =
  | 'allScreensCapture'
  | 'browsingTopics'
  | 'capturedSurfaceControl'
  | 'conversionMeasurement'
  | 'digitalCredentialsCreate'
  | 'digitalCredentialsGet'
  | 'focusWithoutUserActivation'
  | 'joinAdInterestGroup'
  | 'localFonts'
  | 'monetization'
  | 'runAdAuction'
  | 'smartCard'
  | 'syncScript'
  | 'trustTokenRedemption'
  | 'unload'
  | 'verticalScroll'
