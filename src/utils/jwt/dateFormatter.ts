const parseDuration = (input: string) => {
  const multipliers: {[key: string]: number} = {
    s: 1000,        // seconds
    m: 60 * 1000,   // minutes
    h: 60 * 60 * 1000,   // hours
    d: 24 * 60 * 60 * 1000,   // days
    M: 30 * 24 * 60 * 60 * 1000,   // months (approximate)
    y: 365 * 24 * 60 * 60 * 1000,   // years (approximate)
  }

  const match = input.match(/^(\d+)([smhdMy])$/)

  if (!match) {
    throw new Error('Invalid shorthand duration format')
  }


  const value = parseInt(match[1])
  const unit = match[2]

  const totalMilliseconds = value * multipliers[unit]

  const futureDate = Date.now() + totalMilliseconds

  return Math.floor(futureDate / 1000)
}

const parseDate = (date: number) => {
  date = Math.floor(date)
  const timeStampString = date.toString()

  if (timeStampString.length === 13) {
    return Math.floor(date / 1000)
  } else if (timeStampString.length !== 10){
    throw new Error('Invalid time')
  }

  return date
}

const convertToValidDate = (date: unknown) => {

  if (typeof date === 'number' || (typeof date === 'string' && /^\d+$/.test(date))) {
    date = parseDate(parseInt(date as string, 10))
  } else if (typeof date === 'string') {
    date = parseDuration(date)
  }

  return date
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const handlePayloadConversion = (payload: any) => {
  if (typeof payload === 'object') {
    if (payload?.nbf) {
      payload.nbf = convertToValidDate(payload.nbf)
    }
    if (payload?.exp) {
      payload.exp = convertToValidDate(payload.exp)
    }
    if (payload?.iat) {
      payload.iat = convertToValidDate(payload.iat)
    }
  }

  return payload
}

export default handlePayloadConversion
