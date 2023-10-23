/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * This code is based on React.
 * https://github.com/facebook/react
 * MIT License
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 */

type CrossOrigin = 'anonymous' | 'use-credentials' | '' | undefined
type CSSProperties = {}

interface DOMAttributes {
  dangerouslySetInnerHTML?: {
    __html: string
  }
  key?: string // For compatibility
}

interface AriaAttributes {
  'aria-activedescendant'?: string | undefined
  'aria-atomic'?: boolean | undefined
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both' | undefined
  'aria-braillelabel'?: string | undefined
  'aria-brailleroledescription'?: string | undefined
  'aria-busy'?: boolean | undefined
  'aria-checked'?: boolean | 'false' | 'mixed' | 'true' | undefined
  'aria-colcount'?: number | undefined
  'aria-colindex'?: number | undefined
  'aria-colindextext'?: string | undefined
  'aria-colspan'?: number | undefined
  'aria-controls'?: string | undefined
  'aria-current'?:
    | boolean
    | 'false'
    | 'true'
    | 'page'
    | 'step'
    | 'location'
    | 'date'
    | 'time'
    | undefined
  'aria-describedby'?: string | undefined
  'aria-description'?: string | undefined
  'aria-details'?: string | undefined
  'aria-disabled'?: boolean | undefined
  'aria-dropeffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup' | undefined
  'aria-errormessage'?: string | undefined
  'aria-expanded'?: boolean | undefined
  'aria-flowto'?: string | undefined
  'aria-grabbed'?: boolean | undefined
  'aria-haspopup'?:
    | boolean
    | 'false'
    | 'true'
    | 'menu'
    | 'listbox'
    | 'tree'
    | 'grid'
    | 'dialog'
    | undefined
  'aria-hidden'?: boolean | undefined
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling' | undefined
  'aria-keyshortcuts'?: string | undefined
  'aria-label'?: string | undefined
  'aria-labelledby'?: string | undefined
  'aria-level'?: number | undefined
  'aria-live'?: 'off' | 'assertive' | 'polite' | undefined
  'aria-modal'?: boolean | undefined
  'aria-multiline'?: boolean | undefined
  'aria-multiselectable'?: boolean | undefined
  'aria-orientation'?: 'horizontal' | 'vertical' | undefined
  'aria-owns'?: string | undefined
  'aria-placeholder'?: string | undefined
  'aria-posinset'?: number | undefined
  'aria-pressed'?: boolean | 'false' | 'mixed' | 'true' | undefined
  'aria-readonly'?: boolean | undefined
  'aria-relevant'?:
    | 'additions'
    | 'additions removals'
    | 'additions text'
    | 'all'
    | 'removals'
    | 'removals additions'
    | 'removals text'
    | 'text'
    | 'text additions'
    | 'text removals'
    | undefined
  'aria-required'?: boolean | undefined
  'aria-roledescription'?: string | undefined
  'aria-rowcount'?: number | undefined
  'aria-rowindex'?: number | undefined
  'aria-rowindextext'?: string | undefined
  'aria-rowspan'?: number | undefined
  'aria-selected'?: boolean | undefined
  'aria-setsize'?: number | undefined
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other' | undefined
  'aria-valuemax'?: number | undefined
  'aria-valuemin'?: number | undefined
  'aria-valuenow'?: number | undefined
  'aria-valuetext'?: string | undefined
}

type AriaRole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'cell'
  | 'checkbox'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'form'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem'
  | (string & {})

interface HTMLAttributes extends AriaAttributes, DOMAttributes {
  // Standard HTML Attributes
  accessKey?: string | undefined
  autoFocus?: boolean | undefined
  className?: string | undefined
  contentEditable?: boolean | 'inherit' | undefined
  contextMenu?: string | undefined
  dir?: string | undefined
  draggable?: boolean | undefined
  hidden?: boolean | undefined
  id?: string | undefined
  lang?: string | undefined
  nonce?: string | undefined
  placeholder?: string | undefined
  slot?: string | undefined
  spellCheck?: boolean | undefined
  style?: CSSProperties | undefined
  tabIndex?: number | undefined
  title?: string | undefined
  translate?: 'yes' | 'no' | undefined

  // Unknown
  radioGroup?: string | undefined // <command>, <menuitem
  // WAI-ARIA
  role?: AriaRole | undefined

  // RDFa Attributes
  about?: string | undefined
  content?: string | undefined
  datatype?: string | undefined
  inlist?: any
  prefix?: string | undefined
  property?: string | undefined
  rel?: string | undefined
  resource?: string | undefined
  rev?: string | undefined
  typeof?: string | undefined
  vocab?: string | undefined

  // Non-standard Attributes
  autoCapitalize?: string | undefined
  autoCorrect?: string | undefined
  autoSave?: string | undefined
  color?: string | undefined
  itemProp?: string | undefined
  itemScope?: boolean | undefined
  itemType?: string | undefined
  itemID?: string | undefined
  itemRef?: string | undefined
  results?: number | undefined
  security?: string | undefined
  unselectable?: 'on' | 'off' | undefined

  // Living Standard
  /**
   * Hints at the type of data that might be entered by the user while editing the element or its contents
   * @see https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute
   */
  inputMode?:
    | 'none'
    | 'text'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search'
    | undefined
  /**
   * Specify that a standard HTML element should behave like a defined custom built-in element
   * @see https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
   */
  is?: string | undefined
}

type HTMLAttributeReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'

type HTMLAttributeAnchorTarget = '_self' | '_blank' | '_parent' | '_top' | (string & {})

interface AnchorHTMLAttributes extends HTMLAttributes {
  download?: any
  href?: string | undefined
  hrefLang?: string | undefined
  media?: string | undefined
  ping?: string | undefined
  target?: HTMLAttributeAnchorTarget | undefined
  type?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
}

interface AudioHTMLAttributes extends MediaHTMLAttributes {}

interface AreaHTMLAttributes extends HTMLAttributes {
  alt?: string | undefined
  coords?: string | undefined
  download?: any
  href?: string | undefined
  hrefLang?: string | undefined
  media?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  shape?: string | undefined
  target?: string | undefined
}

interface BaseHTMLAttributes extends HTMLAttributes {
  href?: string | undefined
  target?: string | undefined
}

interface BlockquoteHTMLAttributes extends HTMLAttributes {
  cite?: string | undefined
}

interface ButtonHTMLAttributes extends HTMLAttributes {
  disabled?: boolean | undefined
  form?: string | undefined
  formEncType?: string | undefined
  formMethod?: string | undefined
  formNoValidate?: boolean | undefined
  formTarget?: string | undefined
  name?: string | undefined
  type?: 'submit' | 'reset' | 'button' | undefined
  value?: string | ReadonlyArray<string> | number | undefined
}

interface CanvasHTMLAttributes extends HTMLAttributes {
  height?: number | string | undefined
  width?: number | string | undefined
}

interface ColHTMLAttributes extends HTMLAttributes {
  span?: number | undefined
  width?: number | string | undefined
}

interface ColgroupHTMLAttributes extends HTMLAttributes {
  span?: number | undefined
}

interface DataHTMLAttributes extends HTMLAttributes {
  value?: string | ReadonlyArray<string> | number | undefined
}

interface DetailsHTMLAttributes extends HTMLAttributes {
  open?: boolean | undefined
  onToggle?: string | undefined
}

interface DelHTMLAttributes extends HTMLAttributes {
  cite?: string | undefined
  dateTime?: string | undefined
}

interface DialogHTMLAttributes extends HTMLAttributes {
  onCancel?: string | undefined
  onClose?: string | undefined
  open?: boolean | undefined
}

interface EmbedHTMLAttributes extends HTMLAttributes {
  height?: number | string | undefined
  src?: string | undefined
  type?: string | undefined
  width?: number | string | undefined
}

interface FieldsetHTMLAttributes extends HTMLAttributes {
  disabled?: boolean | undefined
  form?: string | undefined
  name?: string | undefined
}

interface FormHTMLAttributes extends HTMLAttributes {
  acceptCharset?: string | undefined
  autoComplete?: string | undefined
  encType?: string | undefined
  method?: string | undefined
  name?: string | undefined
  noValidate?: boolean | undefined
  target?: string | undefined
}

interface HtmlHTMLAttributes extends HTMLAttributes {
  manifest?: string | undefined
}

interface IframeHTMLAttributes extends HTMLAttributes {
  allow?: string | undefined
  allowFullScreen?: boolean | undefined
  allowTransparency?: boolean | undefined
  /** @deprecated */
  frameBorder?: number | string | undefined
  height?: number | string | undefined
  loading?: 'eager' | 'lazy' | undefined
  /** @deprecated */
  marginHeight?: number | undefined
  /** @deprecated */
  marginWidth?: number | undefined
  name?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  sandbox?: string | undefined
  /** @deprecated */
  scrolling?: string | undefined
  seamless?: boolean | undefined
  src?: string | undefined
  srcDoc?: string | undefined
  width?: number | string | undefined
}

interface ImgHTMLAttributes extends HTMLAttributes {
  alt?: string | undefined
  crossOrigin?: CrossOrigin
  decoding?: 'async' | 'auto' | 'sync' | undefined
  height?: number | string | undefined
  loading?: 'eager' | 'lazy' | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  sizes?: string | undefined
  src?: string | undefined
  srcSet?: string | undefined
  useMap?: string | undefined
  width?: number | string | undefined
}

interface InsHTMLAttributes extends HTMLAttributes {
  cite?: string | undefined
  dateTime?: string | undefined
}

type HTMLInputTypeAttribute =
  | 'button'
  | 'checkbox'
  | 'color'
  | 'date'
  | 'datetime-local'
  | 'email'
  | 'file'
  | 'hidden'
  | 'image'
  | 'month'
  | 'number'
  | 'password'
  | 'radio'
  | 'range'
  | 'reset'
  | 'search'
  | 'submit'
  | 'tel'
  | 'text'
  | 'time'
  | 'url'
  | 'week'
  | (string & {})

interface InputHTMLAttributes extends HTMLAttributes {
  accept?: string | undefined
  alt?: string | undefined
  autoComplete?: string | undefined
  capture?: boolean | 'user' | 'environment' | undefined // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
  checked?: boolean | undefined
  disabled?: boolean | undefined
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' | undefined
  form?: string | undefined
  formEncType?: string | undefined
  formMethod?: string | undefined
  formNoValidate?: boolean | undefined
  formTarget?: string | undefined
  height?: number | string | undefined
  list?: string | undefined
  max?: number | string | undefined
  maxLength?: number | undefined
  min?: number | string | undefined
  minLength?: number | undefined
  multiple?: boolean | undefined
  name?: string | undefined
  pattern?: string | undefined
  placeholder?: string | undefined
  readOnly?: boolean | undefined
  required?: boolean | undefined
  size?: number | undefined
  src?: string | undefined
  step?: number | string | undefined
  type?: HTMLInputTypeAttribute | undefined
  value?: string | ReadonlyArray<string> | number | undefined
  width?: number | string | undefined

  onChange?: string | undefined
}

interface KeygenHTMLAttributes extends HTMLAttributes {
  challenge?: string | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  keyType?: string | undefined
  keyParams?: string | undefined
  name?: string | undefined
}

interface LabelHTMLAttributes extends HTMLAttributes {
  form?: string | undefined
  htmlFor?: string | undefined
}

interface LiHTMLAttributes extends HTMLAttributes {
  value?: string | ReadonlyArray<string> | number | undefined
}

interface LinkHTMLAttributes extends HTMLAttributes {
  as?: string | undefined
  crossOrigin?: CrossOrigin
  fetchPriority?: 'high' | 'low' | 'auto'
  href?: string | undefined
  hrefLang?: string | undefined
  integrity?: string | undefined
  media?: string | undefined
  imageSrcSet?: string | undefined
  imageSizes?: string | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  sizes?: string | undefined
  type?: string | undefined
  charSet?: string | undefined
}

interface MapHTMLAttributes extends HTMLAttributes {
  name?: string | undefined
}

interface MenuHTMLAttributes extends HTMLAttributes {
  type?: string | undefined
}

interface MediaHTMLAttributes extends HTMLAttributes {
  autoPlay?: boolean | undefined
  controls?: boolean | undefined
  controlsList?: string | undefined
  crossOrigin?: CrossOrigin
  loop?: boolean | undefined
  mediaGroup?: string | undefined
  muted?: boolean | undefined
  playsInline?: boolean | undefined
  preload?: string | undefined
  src?: string | undefined
}

interface MetaHTMLAttributes extends HTMLAttributes {
  charSet?: string | undefined
  httpEquiv?: string | undefined
  name?: string | undefined
  media?: string | undefined
  content?: string | undefined
}

interface MeterHTMLAttributes extends HTMLAttributes {
  form?: string | undefined
  high?: number | undefined
  low?: number | undefined
  max?: number | string | undefined
  min?: number | string | undefined
  optimum?: number | undefined
  value?: string | ReadonlyArray<string> | number | undefined
}

interface QuoteHTMLAttributes extends HTMLAttributes {
  cite?: string | undefined
}

interface ObjectHTMLAttributes extends HTMLAttributes {
  classID?: string | undefined
  data?: string | undefined
  form?: string | undefined
  height?: number | string | undefined
  name?: string | undefined
  type?: string | undefined
  useMap?: string | undefined
  width?: number | string | undefined
  wmode?: string | undefined
}

interface OlHTMLAttributes extends HTMLAttributes {
  reversed?: boolean | undefined
  start?: number | undefined
  type?: '1' | 'a' | 'A' | 'i' | 'I' | undefined
}

interface OptgroupHTMLAttributes extends HTMLAttributes {
  disabled?: boolean | undefined
  label?: string | undefined
}

interface OptionHTMLAttributes extends HTMLAttributes {
  disabled?: boolean | undefined
  label?: string | undefined
  selected?: boolean | undefined
  value?: string | ReadonlyArray<string> | number | undefined
}

interface OutputHTMLAttributes extends HTMLAttributes {
  form?: string | undefined
  htmlFor?: string | undefined
  name?: string | undefined
}

interface ParamHTMLAttributes extends HTMLAttributes {
  name?: string | undefined
  value?: string | ReadonlyArray<string> | number | undefined
}

interface ProgressHTMLAttributes extends HTMLAttributes {
  max?: number | string | undefined
  value?: string | ReadonlyArray<string> | number | undefined
}

interface SlotHTMLAttributes extends HTMLAttributes {
  name?: string | undefined
}

interface ScriptHTMLAttributes extends HTMLAttributes {
  async?: boolean | undefined
  /** @deprecated */
  charSet?: string | undefined
  crossOrigin?: CrossOrigin
  defer?: boolean | undefined
  integrity?: string | undefined
  noModule?: boolean | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  src?: string | undefined
  type?: string | undefined
}

interface SelectHTMLAttributes extends HTMLAttributes {
  autoComplete?: string | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  multiple?: boolean | undefined
  name?: string | undefined
  required?: boolean | undefined
  size?: number | undefined
  value?: string | ReadonlyArray<string> | number | undefined
  onChange?: string | undefined
}

interface SourceHTMLAttributes extends HTMLAttributes {
  height?: number | string | undefined
  media?: string | undefined
  sizes?: string | undefined
  src?: string | undefined
  srcSet?: string | undefined
  type?: string | undefined
  width?: number | string | undefined
}

interface StyleHTMLAttributes extends HTMLAttributes {
  media?: string | undefined
  scoped?: boolean | undefined
  type?: string | undefined
}

interface TableHTMLAttributes extends HTMLAttributes {
  align?: 'left' | 'center' | 'right' | undefined
  bgcolor?: string | undefined
  border?: number | undefined
  cellPadding?: number | string | undefined
  cellSpacing?: number | string | undefined
  frame?: boolean | undefined
  rules?: 'none' | 'groups' | 'rows' | 'columns' | 'all' | undefined
  summary?: string | undefined
  width?: number | string | undefined
}

interface TextareaHTMLAttributes extends HTMLAttributes {
  autoComplete?: string | undefined
  cols?: number | undefined
  dirName?: string | undefined
  disabled?: boolean | undefined
  form?: string | undefined
  maxLength?: number | undefined
  minLength?: number | undefined
  name?: string | undefined
  placeholder?: string | undefined
  readOnly?: boolean | undefined
  required?: boolean | undefined
  rows?: number | undefined
  value?: string | ReadonlyArray<string> | number | undefined
  wrap?: string | undefined
  onChange?: string | undefined
}

interface TdHTMLAttributes extends HTMLAttributes {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined
  colSpan?: number | undefined
  headers?: string | undefined
  rowSpan?: number | undefined
  scope?: string | undefined
  abbr?: string | undefined
  height?: number | string | undefined
  width?: number | string | undefined
  valign?: 'top' | 'middle' | 'bottom' | 'baseline' | undefined
}

interface ThHTMLAttributes extends HTMLAttributes {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined
  colSpan?: number | undefined
  headers?: string | undefined
  rowSpan?: number | undefined
  scope?: string | undefined
  abbr?: string | undefined
}

interface TimeHTMLAttributes extends HTMLAttributes {
  dateTime?: string | undefined
}

interface TrackHTMLAttributes extends HTMLAttributes {
  default?: boolean | undefined
  kind?: string | undefined
  label?: string | undefined
  src?: string | undefined
  srcLang?: string | undefined
}

interface VideoHTMLAttributes extends MediaHTMLAttributes {
  height?: number | string | undefined
  playsInline?: boolean | undefined
  poster?: string | undefined
  width?: number | string | undefined
  disablePictureInPicture?: boolean | undefined
  disableRemotePlayback?: boolean | undefined
}

export interface IntrinsicElements {
  a: AnchorHTMLAttributes
  abbr: HTMLAttributes
  address: HTMLAttributes
  area: AreaHTMLAttributes
  article: HTMLAttributes
  aside: HTMLAttributes
  audio: AudioHTMLAttributes
  b: HTMLAttributes
  base: BaseHTMLAttributes
  bdi: HTMLAttributes
  bdo: HTMLAttributes
  big: HTMLAttributes
  blockquote: BlockquoteHTMLAttributes
  body: HTMLAttributes
  br: HTMLAttributes
  button: ButtonHTMLAttributes
  canvas: CanvasHTMLAttributes
  caption: HTMLAttributes
  center: HTMLAttributes
  cite: HTMLAttributes
  code: HTMLAttributes
  col: ColHTMLAttributes
  colgroup: ColgroupHTMLAttributes
  data: DataHTMLAttributes
  datalist: HTMLAttributes
  dd: HTMLAttributes
  del: DelHTMLAttributes
  details: DetailsHTMLAttributes
  dfn: HTMLAttributes
  dialog: DialogHTMLAttributes
  div: HTMLAttributes
  dl: HTMLAttributes
  dt: HTMLAttributes
  em: HTMLAttributes
  embed: EmbedHTMLAttributes
  fieldset: FieldsetHTMLAttributes
  figcaption: HTMLAttributes
  figure: HTMLAttributes
  footer: HTMLAttributes
  form: FormHTMLAttributes
  h1: HTMLAttributes
  h2: HTMLAttributes
  h3: HTMLAttributes
  h4: HTMLAttributes
  h5: HTMLAttributes
  h6: HTMLAttributes
  head: HTMLAttributes
  header: HTMLAttributes
  hgroup: HTMLAttributes
  hr: HTMLAttributes
  html: HtmlHTMLAttributes
  i: HTMLAttributes
  iframe: IframeHTMLAttributes
  img: ImgHTMLAttributes
  input: InputHTMLAttributes
  ins: InsHTMLAttributes
  kbd: HTMLAttributes
  keygen: KeygenHTMLAttributes
  label: LabelHTMLAttributes
  legend: HTMLAttributes
  li: LiHTMLAttributes
  link: LinkHTMLAttributes
  main: HTMLAttributes
  map: MapHTMLAttributes
  mark: HTMLAttributes
  menu: MenuHTMLAttributes
  menuitem: HTMLAttributes
  meta: MetaHTMLAttributes
  meter: MeterHTMLAttributes
  nav: HTMLAttributes
  noscript: HTMLAttributes
  object: ObjectHTMLAttributes
  ol: OlHTMLAttributes
  optgroup: OptgroupHTMLAttributes
  option: OptionHTMLAttributes
  output: OutputHTMLAttributes
  p: HTMLAttributes
  param: ParamHTMLAttributes
  picture: HTMLAttributes
  pre: HTMLAttributes
  progress: ProgressHTMLAttributes
  q: QuoteHTMLAttributes
  rp: HTMLAttributes
  rt: HTMLAttributes
  ruby: HTMLAttributes
  s: HTMLAttributes
  samp: HTMLAttributes
  search: HTMLAttributes
  slot: SlotHTMLAttributes
  script: ScriptHTMLAttributes
  section: HTMLAttributes
  select: SelectHTMLAttributes
  small: HTMLAttributes
  source: SourceHTMLAttributes
  span: HTMLAttributes
  strong: HTMLAttributes
  style: StyleHTMLAttributes
  sub: HTMLAttributes
  summary: HTMLAttributes
  sup: HTMLAttributes
  table: TableHTMLAttributes
  template: HTMLAttributes
  tbody: HTMLAttributes
  td: TdHTMLAttributes
  textarea: TextareaHTMLAttributes
  tfoot: HTMLAttributes
  th: ThHTMLAttributes
  thead: HTMLAttributes
  time: TimeHTMLAttributes
  title: HTMLAttributes
  tr: HTMLAttributes
  track: TrackHTMLAttributes
  u: HTMLAttributes
  ul: HTMLAttributes
  var: HTMLAttributes
  video: VideoHTMLAttributes
  wbr: HTMLAttributes
}
