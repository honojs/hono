/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * This code is based on React.
 * https://github.com/facebook/react
 * MIT License
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Hono {
    type CrossOrigin = 'anonymous' | 'use-credentials' | '' | undefined
    type CSSProperties = {}
    type AnyAttributes = { [attributeName: string]: any }

    interface JSXAttributes {
      dangerouslySetInnerHTML?: {
        __html: string
      }
    }

    interface HTMLAttributes extends JSXAttributes, AnyAttributes {
      accesskey?: string | undefined
      autofocus?: boolean | undefined
      class?: string | undefined
      contenteditable?: boolean | 'inherit' | undefined
      contextmenu?: string | undefined
      dir?: string | undefined
      draggable?: boolean | undefined
      hidden?: boolean | undefined
      id?: string | undefined
      lang?: string | undefined
      nonce?: string | undefined
      placeholder?: string | undefined
      slot?: string | undefined
      spellcheck?: boolean | undefined
      style?: CSSProperties | undefined
      tabindex?: number | undefined
      title?: string | undefined
      translate?: 'yes' | 'no' | undefined
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

    type HTMLAttributeAnchorTarget = '_self' | '_blank' | '_parent' | '_top' | string

    interface AnchorHTMLAttributes extends HTMLAttributes {
      download?: any
      href?: string | undefined
      hreflang?: string | undefined
      media?: string | undefined
      ping?: string | undefined
      target?: HTMLAttributeAnchorTarget | undefined
      type?: string | undefined
      referrerpolicy?: HTMLAttributeReferrerPolicy | undefined
    }

    interface AudioHTMLAttributes extends MediaHTMLAttributes {}

    interface AreaHTMLAttributes extends HTMLAttributes {
      alt?: string | undefined
      coords?: string | undefined
      download?: any
      href?: string | undefined
      hreflang?: string | undefined
      media?: string | undefined
      referrerpolicy?: HTMLAttributeReferrerPolicy | undefined
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
      formenctype?: string | undefined
      formmethod?: string | undefined
      formnovalidate?: boolean | undefined
      formtarget?: string | undefined
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
    }

    interface DelHTMLAttributes extends HTMLAttributes {
      cite?: string | undefined
      dateTime?: string | undefined
    }

    interface DialogHTMLAttributes extends HTMLAttributes {
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
      'accept-charset'?: string | undefined
      autocomplete?: string | undefined
      enctype?: string | undefined
      method?: string | undefined
      name?: string | undefined
      novalidate?: boolean | undefined
      target?: string | undefined
    }

    interface HtmlHTMLAttributes extends HTMLAttributes {
      manifest?: string | undefined
    }

    interface IframeHTMLAttributes extends HTMLAttributes {
      allow?: string | undefined
      allowfullscreen?: boolean | undefined
      height?: number | string | undefined
      loading?: 'eager' | 'lazy' | undefined
      name?: string | undefined
      referrerpolicy?: HTMLAttributeReferrerPolicy | undefined
      sandbox?: string | undefined
      seamless?: boolean | undefined
      src?: string | undefined
      srcdoc?: string | undefined
      width?: number | string | undefined
    }

    interface ImgHTMLAttributes extends HTMLAttributes {
      alt?: string | undefined
      crossorigin?: CrossOrigin
      decoding?: 'async' | 'auto' | 'sync' | undefined
      height?: number | string | undefined
      loading?: 'eager' | 'lazy' | undefined
      referrerpolicy?: HTMLAttributeReferrerPolicy | undefined
      sizes?: string | undefined
      src?: string | undefined
      srcset?: string | undefined
      usemap?: string | undefined
      width?: number | string | undefined
    }

    interface InsHTMLAttributes extends HTMLAttributes {
      cite?: string | undefined
      datetime?: string | undefined
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
      | string

    interface InputHTMLAttributes extends HTMLAttributes {
      accept?: string | undefined
      alt?: string | undefined
      autocomplete?: string | undefined
      capture?: boolean | 'user' | 'environment' | undefined // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
      checked?: boolean | undefined
      disabled?: boolean | undefined
      enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' | undefined
      form?: string | undefined
      formenctype?: string | undefined
      formmethod?: string | undefined
      formnovalidate?: boolean | undefined
      formtarget?: string | undefined
      height?: number | string | undefined
      list?: string | undefined
      max?: number | string | undefined
      maxlength?: number | undefined
      min?: number | string | undefined
      minlength?: number | undefined
      multiple?: boolean | undefined
      name?: string | undefined
      pattern?: string | undefined
      placeholder?: string | undefined
      readonly?: boolean | undefined
      required?: boolean | undefined
      size?: number | undefined
      src?: string | undefined
      step?: number | string | undefined
      type?: HTMLInputTypeAttribute | undefined
      value?: string | ReadonlyArray<string> | number | undefined
      width?: number | string | undefined
    }

    interface KeygenHTMLAttributes extends HTMLAttributes {
      challenge?: string | undefined
      disabled?: boolean | undefined
      form?: string | undefined
      keytype?: string | undefined
      name?: string | undefined
    }

    interface LabelHTMLAttributes extends HTMLAttributes {
      form?: string | undefined
      for?: string | undefined
    }

    interface LiHTMLAttributes extends HTMLAttributes {
      value?: string | ReadonlyArray<string> | number | undefined
    }

    interface LinkHTMLAttributes extends HTMLAttributes {
      as?: string | undefined
      crossorigin?: CrossOrigin
      href?: string | undefined
      hreflang?: string | undefined
      integrity?: string | undefined
      media?: string | undefined
      imagesrcset?: string | undefined
      imagesizes?: string | undefined
      referrerpolicy?: HTMLAttributeReferrerPolicy | undefined
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
      autoplay?: boolean | undefined
      controls?: boolean | undefined
      controlslist?: string | undefined
      crossorigin?: CrossOrigin
      loop?: boolean | undefined
      mediagroup?: string | undefined
      muted?: boolean | undefined
      playsinline?: boolean | undefined
      preload?: string | undefined
      src?: string | undefined
    }

    interface MetaHTMLAttributes extends HTMLAttributes {
      charset?: string | undefined
      'http-equiv'?: string | undefined
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
      data?: string | undefined
      form?: string | undefined
      height?: number | string | undefined
      name?: string | undefined
      type?: string | undefined
      usemap?: string | undefined
      width?: number | string | undefined
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
      for?: string | undefined
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
      crossorigin?: CrossOrigin
      defer?: boolean | undefined
      integrity?: string | undefined
      nomodule?: boolean | undefined
      referrerpolicy?: HTMLAttributeReferrerPolicy | undefined
      src?: string | undefined
      type?: string | undefined
    }

    interface SelectHTMLAttributes extends HTMLAttributes {
      autocomplete?: string | undefined
      disabled?: boolean | undefined
      form?: string | undefined
      multiple?: boolean | undefined
      name?: string | undefined
      required?: boolean | undefined
      size?: number | undefined
      value?: string | ReadonlyArray<string> | number | undefined
    }

    interface SourceHTMLAttributes extends HTMLAttributes {
      height?: number | string | undefined
      media?: string | undefined
      sizes?: string | undefined
      src?: string | undefined
      srcset?: string | undefined
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
      cellpadding?: number | string | undefined
      cellspacing?: number | string | undefined
      frame?: boolean | undefined
      rules?: 'none' | 'groups' | 'rows' | 'columns' | 'all' | undefined
      summary?: string | undefined
      width?: number | string | undefined
    }

    interface TextareaHTMLAttributes extends HTMLAttributes {
      autocomplete?: string | undefined
      cols?: number | undefined
      dirname?: string | undefined
      disabled?: boolean | undefined
      form?: string | undefined
      maxlength?: number | undefined
      minlength?: number | undefined
      name?: string | undefined
      placeholder?: string | undefined
      readonly?: boolean | undefined
      required?: boolean | undefined
      rows?: number | undefined
      value?: string | ReadonlyArray<string> | number | undefined
      wrap?: string | undefined
    }

    interface TdHTMLAttributes extends HTMLAttributes {
      align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined
      colspan?: number | undefined
      headers?: string | undefined
      rowspan?: number | undefined
      scope?: string | undefined
      abbr?: string | undefined
      height?: number | string | undefined
      width?: number | string | undefined
      valign?: 'top' | 'middle' | 'bottom' | 'baseline' | undefined
    }

    interface ThHTMLAttributes extends HTMLAttributes {
      align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined
      colspan?: number | undefined
      headers?: string | undefined
      rowspan?: number | undefined
      scope?: string | undefined
      abbr?: string | undefined
    }

    interface TimeHTMLAttributes extends HTMLAttributes {
      datetime?: string | undefined
    }

    interface TrackHTMLAttributes extends HTMLAttributes {
      default?: boolean | undefined
      kind?: string | undefined
      label?: string | undefined
      src?: string | undefined
      srclang?: string | undefined
    }

    interface VideoHTMLAttributes extends MediaHTMLAttributes {
      height?: number | string | undefined
      playsinline?: boolean | undefined
      poster?: string | undefined
      width?: number | string | undefined
      disablePictureInPicture?: boolean | undefined
      disableRemotePlayback?: boolean | undefined
    }

    interface IntrinsicElements {
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
  }
}

export interface IntrinsicElements extends Hono.IntrinsicElements {}
